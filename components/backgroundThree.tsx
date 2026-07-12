// "use client"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import css from "../styles/Home.module.css"
import * as THREE from "three"
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import shapePositions from './shapePositions.json'

// Low-poly on purpose: these render as tiny dots, so high tessellation was
// pure waste. 8x6 keeps them round while cutting ~1,400 tris/sphere down to
// ~96 — across 10,800 instances that's ~15M tris -> ~1M tris per frame.
const sphere = new THREE.SphereGeometry(0.1, 8, 6)

const white = new THREE.MeshLambertMaterial({ color: "white" })

type ShapeMap = { [key: string]: number[][] }

function System({ isMobile, reducedMotion }: { isMobile: boolean; reducedMotion: boolean }): JSX.Element {
  const camera = useThree((state) => state.camera)

  const Zdist = 100
  const xDist = 100
  const rafRef = useRef<number>()
  const angle = useRef(0)
  const scrollPrev = useRef(0)

  const rotateCamera = () => {
    const xPos = xDist * Math.sin(angle.current)
    const zPos = Zdist * Math.cos(angle.current)
    camera.position.setZ(zPos)
    camera.position.setX(xPos)
    camera.lookAt(0, 0, 0)
  }

  // Scroll nudges the spin on desktop. We only mutate the shared angle here and
  // let useFrame apply it, so this never fights the render loop.
  const handleScroll = () => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      const y = window.scrollY
      angle.current = (angle.current + 0.01 * (y - scrollPrev.current)) % (2 * Math.PI)
      if (angle.current < 0) angle.current += 2 * Math.PI
      scrollPrev.current = y
      rafRef.current = undefined
    })
  }

  useEffect(() => {
    camera.lookAt(0, 0, 0)
    // Scroll-driven spin is a desktop-only flourish; on touch it fought with
    // native scrolling and just added jank, so mobile keeps the gentle auto-spin.
    if (!isMobile && !reducedMotion) {
      scrollPrev.current = window.scrollY
      window.addEventListener("scroll", handleScroll, { passive: true })
    }
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, reducedMotion])

  const allShapesPositions = useMemo(() => shapePositions as ShapeMap, [])

  return (
    <OptimizedStars
      allShapesPositions={allShapesPositions}
      angle={angle}
      rotateCamera={rotateCamera}
      isMobile={isMobile}
      reducedMotion={reducedMotion}
    />
  )
}

function OptimizedStars({
  allShapesPositions,
  angle,
  rotateCamera,
  isMobile,
  reducedMotion,
}: {
  allShapesPositions: ShapeMap
  angle: React.MutableRefObject<number>
  rotateCamera: () => void
  isMobile: boolean
  reducedMotion: boolean
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = useMemo(() => new THREE.Object3D(), [])

  // On phones the full 10,800-instance cloud is what causes the periodic
  // hitching: every 4s a shape change rebuilds and re-uploads that many
  // matrices on the main thread. Halving the cloud keeps the silhouette
  // readable while roughly halving the per-morph CPU + GPU-upload cost.
  const shapes = useMemo(() => {
    if (!isMobile) return allShapesPositions
    const out: ShapeMap = {}
    for (const name of Object.keys(allShapesPositions)) {
      const arr = allShapesPositions[name]
      const sampled: number[][] = []
      for (let i = 0; i < arr.length; i += 2) sampled.push(arr[i])
      out[name] = sampled
    }
    return out
  }, [allShapesPositions, isMobile])

  const shapeNames = useMemo(() => Object.keys(shapes), [shapes])
  const totalPositions = shapes[shapeNames[0]].length

  const currentShapeRef = useRef(-1) // Start at -1 to indicate initial empty state
  const startPositionsRef = useRef<number[][]>([])
  const targetPositionsRef = useRef<number[][]>([])
  const lerpProgressRef = useRef(0)
  const lastTransitionRef = useRef(0)
  const settledRef = useRef(false) // true once a shape has finished morphing
  const timeRef = useRef(0) // our own monotonic clock (see useFrame)

  useEffect(() => {
    // Start with every particle at the origin, morphing out to the first shape.
    startPositionsRef.current = Array(totalPositions).fill([0, 0, 0])
    targetPositionsRef.current = shapes[shapeNames[0]]
    currentShapeRef.current = -1
    lerpProgressRef.current = 0
    lastTransitionRef.current = 0
    settledRef.current = false
    timeRef.current = 0
  }, [shapes, shapeNames, totalPositions])

  useFrame((state, delta) => {
    if (!meshRef.current || targetPositionsRef.current.length === 0) return

    // Local, monotonic time. We accumulate a *clamped* per-frame delta instead of
    // reading state.clock.elapsedTime directly: when the tab is hidden R3F pauses
    // the loop and, on return, restarts the THREE.Clock — which resets
    // elapsedTime toward 0. That used to make (elapsed - lastTransition) go
    // sharply negative, the easing term squared it into the hundreds, and every
    // particle got extrapolated far past its target — the "everything's gone /
    // particles freak out after tabbing back" bug. Accumulating a clamped delta
    // is immune to the reset and to any single huge catch-up frame.
    const dt = Math.min(delta, 0.05)
    timeRef.current += dt
    const elapsed = timeRef.current

    // The signature slow camera drift. Reduced-motion visitors get a still frame.
    // dt-scaled so the speed is the same regardless of frame rate (0.01/frame at
    // 60fps == 0.6/s).
    if (!reducedMotion) {
      angle.current += dt * 0.6
      rotateCamera()
    }

    // Cycle shapes every 4s — but never for reduced motion (stays on shape 0).
    if (!reducedMotion && currentShapeRef.current >= 0 && elapsed - lastTransitionRef.current >= 4) {
      lastTransitionRef.current = elapsed
      lerpProgressRef.current = 0

      currentShapeRef.current = (currentShapeRef.current + 1) % shapeNames.length
      const nextShapeIndex = (currentShapeRef.current + 1) % shapeNames.length

      startPositionsRef.current = targetPositionsRef.current
      targetPositionsRef.current = shapes[shapeNames[nextShapeIndex]]
    } else if (currentShapeRef.current === -1 && elapsed >= 0.5) {
      // After the initial empty -> first-shape morph completes, begin the cycle.
      if (lerpProgressRef.current >= 1) {
        currentShapeRef.current = 0
        lastTransitionRef.current = elapsed
        lerpProgressRef.current = 0

        startPositionsRef.current = targetPositionsRef.current
        targetPositionsRef.current = shapes[shapeNames[reducedMotion ? 0 : 1]]
      }
    }

    // Update lerp progress (complete transition in 2 seconds). Guarded to [0, 1]
    // so no timing edge case can ever drive the easing outside its intended range.
    lerpProgressRef.current = Math.max(0, Math.min(1, (elapsed - lastTransitionRef.current) / 2))

    // Only the morph between shapes needs the full matrix rebuild. Once a shape
    // has settled (progress === 1) the positions are static, so we apply one
    // final frame and then skip the loop until the next transition — the camera
    // still rotates, but we stop recomposing every matrix on idle frames.
    if (lerpProgressRef.current < 1) {
      settledRef.current = false
    } else if (settledRef.current) {
      return
    } else {
      settledRef.current = true
    }

    // Smooth easing function
    const eased =
      lerpProgressRef.current < 0.5
        ? 2 * lerpProgressRef.current * lerpProgressRef.current
        : 1 - Math.pow(-2 * lerpProgressRef.current + 2, 2) / 2

    // Lerp all positions
    for (let i = 0; i < totalPositions; i++) {
      const start = startPositionsRef.current[i]
      const target = targetPositionsRef.current[i]

      if (!start || !target) continue

      const x = start[0] + (target[0] - start[0]) * eased
      const y = start[1] + (target[1] - start[1]) * eased
      const z = start[2] + (target[2] - start[2]) * eased

      tempObject.position.set(x, y, z)
      tempObject.scale.setScalar(0.15)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh key={totalPositions} ref={meshRef} args={[sphere, white, totalPositions]} />
}

export default function Background() {
  // Device profile drives both the WebGL context options (which are fixed at
  // Canvas creation) and the per-frame workload, so resolve it before we mount
  // the Canvas. Defaults are SSR-safe (desktop, motion on) and get corrected on
  // mount, which is also why the Canvas is gated behind `mounted`.
  const [env, setEnv] = useState({ mounted: false, isMobile: false, reducedMotion: false })

  useEffect(() => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 768
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    setEnv({ mounted: true, isMobile, reducedMotion })
  }, [])

  // The canvas is position:fixed and always sits behind the (translucent)
  // content — it never actually scrolls off-screen. The old "freeze once you
  // scroll past 2 viewports" logic therefore just froze a background you could
  // still see, which read as the animation breaking on scroll. Instead we only
  // pause the loop when the tab is genuinely hidden (a real battery win with no
  // visible freeze); reduced-motion renders a couple of settle frames then stops.
  const [frameloop, setFrameloop] = useState<"always" | "never">("always")

  useEffect(() => {
    if (!env.mounted) return
    if (env.reducedMotion) {
      setFrameloop("always")
      const t = setTimeout(() => setFrameloop("never"), 2500)
      return () => clearTimeout(t)
    }
    const onVisibility = () => setFrameloop(document.hidden ? "never" : "always")
    document.addEventListener("visibilitychange", onVisibility)
    onVisibility()
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [env.mounted, env.reducedMotion])

  if (!env.mounted) {
    return <div className={css.scene} />
  }

  return (
    <div className={css.scene}>
      <Canvas
        shadows={false}
        className={css.canvas}
        frameloop={frameloop}
        style={{ position: "fixed", background: "transparent" }}
        camera={{ zoom: 10, position: [0, 20, 100] }}
        dpr={1}
        gl={{
          antialias: !env.isMobile,
          alpha: true,
          powerPreference: env.isMobile ? "default" : "high-performance",
        }}
      >
        <ambientLight intensity={0.12}></ambientLight>

        {/* Palette: soft blue key with a whisper of violet on the far side, so
            the cloud keeps depth without the old loud magenta. Blue is the
            design north-star accent (#a3cbff); violet is only a faint rim. */}
        <pointLight intensity={0.35} color="#8f7fd6" position={[10, 10, -10]} />

        <pointLight intensity={0.95} color="#cfe0ff" position={[0, 9, 35]} />
        <pointLight intensity={0.4} color="#7fb0ff" position={[20, 9, 35]} />
        <pointLight intensity={0.35} color="#9a8fe0" position={[-20, 9, 35]} />

        <pointLight intensity={0.4} color="#a3cbff" position={[-10, 10, 10]} />

        <Suspense fallback={null}>
          <System isMobile={env.isMobile} reducedMotion={env.reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  )
}
