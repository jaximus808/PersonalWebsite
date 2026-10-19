// "use client"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import css from "../styles/Home.module.css"
import * as THREE from "three"
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import shapePositions from './shapePositions.json'
import { useHeroFade } from '../lib/useHeroFade'
import { buildArmCloud, makeLinkMatrices, poseArms, BENCH, CUBE_PART } from './yamArms'
import { buildInfraCloud, placePackets, healthOf, PACKET_COUNT, REGION_COUNT, PACKET, HIDDEN } from './infraScene'
import { getAboutScene } from '../lib/aboutScene'

// Low-poly on purpose: these render as tiny dots, so high tessellation was
// pure waste. 8x6 keeps them round while cutting ~1,400 tris/sphere down to
// ~96 — across 10,800 instances that's ~15M tris -> ~1M tris per frame.
const sphere = new THREE.SphereGeometry(0.1, 8, 6)

const white = new THREE.MeshLambertMaterial({ color: "white" })

type ShapeMap = { [key: string]: number[][] }

// Where the YAM arms sit in the scene: meters → scene units, the point that
// lands at the origin, and the camera angle they're framed from.
const ARM_SCALE = 8
const ARM_CENTER = [0, -0.08, 0]
const ARM_VIEW = 0.3
const ARM_SHIFT = 1.4 // toward screen right, clear of the About text

/** The scene beside About: how present it is, and how far (px) its section
    sits from where the scene is framed, so the scene can travel with it. */
type Beside = { amount: number; anchor: number }

const smooth = (x: number) => x * x * (3 - 2 * x)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

function System({
  isMobile,
  reducedMotion,
  fade,
  arms,
}: {
  isMobile: boolean
  reducedMotion: boolean
  fade: React.MutableRefObject<number>
  arms: React.MutableRefObject<Beside> | null
}): JSX.Element {
  const camera = useThree((state) => state.camera)

  const Zdist = 100
  const xDist = 100
  const rafRef = useRef<number>()
  const angle = useRef(0)
  const scrollPrev = useRef(0)

  const rotateCamera = (theta: number = angle.current, height = 20) => {
    const xPos = xDist * Math.sin(theta)
    const zPos = Zdist * Math.cos(theta)
    camera.position.setZ(zPos)
    camera.position.setX(xPos)
    camera.position.setY(height)
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
      fade={fade}
      arms={arms}
    />
  )
}

function OptimizedStars({
  allShapesPositions,
  angle,
  rotateCamera,
  isMobile,
  reducedMotion,
  fade,
  arms,
}: {
  allShapesPositions: ShapeMap
  angle: React.MutableRefObject<number>
  rotateCamera: (theta?: number, height?: number) => void
  isMobile: boolean
  reducedMotion: boolean
  fade: React.MutableRefObject<number>
  /** How far the dots have regrouped beside About (arms or backend), and where. */
  arms: React.MutableRefObject<Beside> | null
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
  const drawnFadeRef = useRef(0) // the scroll fade the matrices were last built at

  // How far each particle drifts as the cloud dissolves on scroll. Uneven on
  // purpose, so it fizzles apart instead of just growing.
  const scatter = useMemo(() => {
    const out = new Float32Array(totalPositions)
    for (let i = 0; i < totalPositions; i++) out[i] = 0.4 + Math.random() * 1.6
    return out
  }, [totalPositions])

  // The same dots, later: their places on two YAM arms (see yamArms.ts).
  // Built only where the arms can show.
  const armCloud = useMemo(() => (arms ? buildArmCloud(totalPositions) : null), [arms, totalPositions])
  const linkMatrices = useMemo(() => makeLinkMatrices(), [])
  const armClockRef = useRef(0) // seconds since the arms finished assembling

  // ...and their places in the distributed system it alternates with
  // (infraScene.ts).
  const infraCloud = useMemo(() => (armCloud ? buildInfraCloud(armCloud) : null), [armCloud])
  const packetCenters = useMemo(() => new Float32Array(PACKET_COUNT * 4), [])
  const health = useMemo(() => new Float32Array(REGION_COUNT), [])
  const infraClockRef = useRef(0)
  // 0 = arms, 1 = distributed system. Each dot travels straight from its
  // place in one to its place in the other.
  const mixRef = useRef(0)
  // A small outward swing each dot takes mid-morph, in scene units, so the
  // shapes flow through each other instead of sliding.
  const puff = useMemo(() => {
    const out = new Float32Array(totalPositions * 3)
    for (let i = 0; i < totalPositions; i++) {
      const u = Math.random() * 2 - 1
      const t = Math.random() * 2 * Math.PI
      const r = (0.5 + Math.random()) * 0.18
      const h = Math.sqrt(1 - u * u)
      out[i * 3] = r * h * Math.cos(t)
      out[i * 3 + 1] = r * u
      out[i * 3 + 2] = r * h * Math.sin(t)
    }
    return out
  }, [totalPositions])

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
    // While the arms are up, the camera eases off its spin to a fixed,
    // slightly raised three-quarter view with a slow sway, so the motion
    // stays readable.
    const armsAmt = armCloud && arms ? arms.current.amount : 0
    const armsEased = smooth(armsAmt)
    if (!reducedMotion) {
      angle.current += dt * 0.6
      if (armsEased > 0) {
        const target = ARM_VIEW + 0.12 * Math.sin(elapsed * 0.3)
        const off = Math.atan2(Math.sin(target - angle.current), Math.cos(target - angle.current))
        rotateCamera(angle.current + off * armsEased, 20 + 22 * armsEased)
      } else {
        rotateCamera()
      }
    }

    // Morph between the arms and the distributed system as the About lead
    // line changes. Offscreen, just snap to whichever is current.
    const want = getAboutScene() === "infra" ? 1 : 0
    if (armsAmt <= 0) mixRef.current = want
    else if (mixRef.current < want) mixRef.current = Math.min(want, mixRef.current + dt / 1.8)
    else if (mixRef.current > want) mixRef.current = Math.max(want, mixRef.current - dt / 1.8)
    const mix = mixRef.current

    // The arms run while they're fully formed and pause, mid hand-off, while
    // the system is up, so they resume where they left off. Scrolling away
    // starts them over. The system runs from the top each time it forms.
    if (armsAmt >= 0.95 && mix <= 0) armClockRef.current += dt
    else if (armsAmt <= 0) armClockRef.current = -0.6
    if (mix > 0) infraClockRef.current += dt
    else infraClockRef.current = 0

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
    // Scrolling past the hero changes the dissolve, which also needs a rebuild.
    // Reduced motion skips the scatter; the stage only fades.
    const dissolve = reducedMotion ? 0 : fade.current
    const fadeMoved = dissolve !== drawnFadeRef.current
    drawnFadeRef.current = dissolve

    if (lerpProgressRef.current < 1 || fadeMoved || armsAmt > 0) {
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

    // Dissolve: ease-out spread, dots shrink as they leave.
    const d = 1 - Math.pow(1 - dissolve, 2)
    const dotScale = 0.15 * (1 - 0.75 * d)

    // The scene sits right of the text and moves with its section: shift it
    // along the camera's screen-up by the section's offset, in scene units.
    let shiftX = 0
    let shiftY = 0
    let shiftZ = 0
    if (armCloud && arms && armsAmt > 0) {
      if (mix < 1) poseArms(linkMatrices, armClockRef.current)
      if (mix > 0) {
        placePackets(packetCenters, infraClockRef.current)
        for (let r = 0; r < REGION_COUNT; r++) health[r] = healthOf(r, infraClockRef.current)
      }
      const cam = state.camera as THREE.PerspectiveCamera
      const dist = cam.position.length()
      const unitsTall = (2 * dist * Math.tan((cam.fov * Math.PI) / 360)) / cam.zoom
      const lift = -arms.current.anchor * (unitsTall / state.size.height)
      // Screen-up in the world: world up, minus its part along the view.
      const fx = -cam.position.x / dist
      const fy = -cam.position.y / dist
      const fz = -cam.position.z / dist
      const ux = -fy * fx
      const uy = 1 - fy * fy
      const uz = -fy * fz
      const ul = Math.hypot(ux, uy, uz)
      shiftX = Math.cos(ARM_VIEW) * ARM_SHIFT + (ux / ul) * lift
      shiftY = (uy / ul) * lift
      shiftZ = -Math.sin(ARM_VIEW) * ARM_SHIFT + (uz / ul) * lift
    }

    // Lerp all positions
    for (let i = 0; i < totalPositions; i++) {
      const start = startPositionsRef.current[i]
      const target = targetPositionsRef.current[i]

      if (!start || !target) continue

      const spread = 1 + d * scatter[i]
      let x = (start[0] + (target[0] - start[0]) * eased) * spread
      let y = (start[1] + (target[1] - start[1]) * eased) * spread
      let z = (start[2] + (target[2] - start[2]) * eased) * spread
      let scale = dotScale

      if (armCloud && infraCloud && armsAmt > 0) {
        // Each dot leaves the scattered cloud on its own beat, so the scene
        // gathers in rather than snapping together. The same beat staggers
        // the morph between the arms and the system.
        const beat = ((scatter[i] - 0.4) / 1.6) * 0.6
        const k = smooth(clamp01(armsAmt * 1.6 - beat))
        if (k > 0) {
          const part = armCloud.part[i]
          let wx = armCloud.local[i * 3]
          let wy = armCloud.local[i * 3 + 1]
          let wz = armCloud.local[i * 3 + 2]
          let size = 0.1
          let swing = 0
          // The bench is shared, so it stays put through a morph.
          if (part !== BENCH) {
            const m = smooth(clamp01(mix * 1.6 - beat))
            // Its place on the arms...
            let ax = 0
            let ay = 0
            let az = 0
            if (m < 1) {
              const e = linkMatrices[part === CUBE_PART ? 16 : part].elements
              ax = e[0] * wx + e[4] * wy + e[8] * wz + e[12]
              ay = e[1] * wx + e[5] * wy + e[9] * wz + e[13]
              az = e[2] * wx + e[6] * wy + e[10] * wz + e[14]
            }
            // ...and in the system. Dots the system doesn't need shrink away
            // where they are.
            let sx = ax
            let sy = ay
            let sz = az
            let sSize = 0
            if (m > 0 && infraCloud.kind[i] !== HIDDEN) {
              sx = infraCloud.pos[i * 3]
              sy = infraCloud.pos[i * 3 + 1]
              sz = infraCloud.pos[i * 3 + 2]
              if (infraCloud.kind[i] === PACKET) {
                const pk = infraCloud.packet[i] * 4
                sx += packetCenters[pk]
                sy += packetCenters[pk + 1]
                sz += packetCenters[pk + 2]
                sSize = 0.21 * packetCenters[pk + 3]
              } else {
                const r = infraCloud.region[i]
                sSize = 0.14 * infraCloud.weight[i] * (r < 0 ? 1 : 0.25 + 0.75 * health[r])
              }
            }
            wx = ax + (sx - ax) * m
            wy = ay + (sy - ay) * m
            wz = az + (sz - az) * m
            size = 0.17 + (sSize - 0.17) * m
            swing = Math.sin(Math.PI * m)
          }

          const tx = (wx - ARM_CENTER[0]) * ARM_SCALE + shiftX + puff[i * 3] * swing
          const ty = (wy - ARM_CENTER[1]) * ARM_SCALE + shiftY + puff[i * 3 + 1] * swing
          const tz = (wz - ARM_CENTER[2]) * ARM_SCALE + shiftZ + puff[i * 3 + 2] * swing
          x += (tx - x) * k
          y += (ty - y) * k
          z += (tz - z) * k
          scale += (size - scale) * k
        }
      }

      tempObject.position.set(x, y, z)
      tempObject.scale.setScalar(scale)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh key={totalPositions} ref={meshRef} args={[sphere, white, totalPositions]} />
}

type BackgroundProps = {
  /** Landing page: dissolve and fade the stage as the hero scrolls away. */
  fadeOnScroll?: boolean
  /** Sit the cloud right of center on wide screens, beside left-aligned text. */
  offsetRight?: boolean
  /** With fadeOnScroll: the id of a section the dots regroup beside, as two
      YAM arms, once the hero has gone. Wide screens with motion only. */
  armsBeside?: string
}

/**
 * Where the `armsBeside` section sits. `amount` (0 → 1): the scene gathers as
 * the section scrolls up into view and scatters again as it leaves. `anchor`:
 * how far (px) the section's middle is below the middle of the screen, so the
 * scene can sit beside it and scroll with it.
 */
function besideOf(id: string, out: Beside) {
  const el = document.getElementById(id)
  if (!el) {
    out.amount = 0
    return
  }
  const r = el.getBoundingClientRect()
  const h = window.innerHeight || 1
  // Formed by the time the section's heading is near the top of the screen.
  const into = clamp01((0.6 * h - r.top) / (0.45 * h))
  const out_ = clamp01((0.45 * h - r.bottom) / (0.4 * h))
  out.amount = into * (1 - out_)
  out.anchor = r.top + r.height * 0.6 - h * 0.5
}

export default function Background({ fadeOnScroll = false, offsetRight = false, armsBeside }: BackgroundProps) {
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

  // Scroll fade: the cloud scatters and the whole stage fades out as the hero
  // leaves. Opacity is written straight to the DOM; once fully gone the render
  // loop stops until the visitor scrolls back up.
  const sceneRef = useRef<HTMLDivElement>(null)
  const fade = useRef(0)
  const arms = useRef<Beside>({ amount: 0, anchor: 0 })
  const [gone, setGone] = useState(false)
  const armsOn = !!armsBeside && !env.isMobile && !env.reducedMotion
  useHeroFade((p) => {
    fade.current = p
    // Too narrow and the arms would sit under the text, so they sit out.
    if (armsOn && window.innerWidth >= 1180) besideOf(armsBeside!, arms.current)
    else arms.current.amount = 0
    const a = arms.current.amount
    if (sceneRef.current) sceneRef.current.style.opacity = String(Math.max(1 - p, a))
    setGone(p >= 1 && a <= 0)
  }, fadeOnScroll && env.mounted)

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

  const sceneClass = `${css.scene} ${offsetRight ? "md:translate-x-[18vw]" : ""}`

  if (!env.mounted) {
    return <div className={sceneClass} />
  }

  return (
    <div ref={sceneRef} className={sceneClass}>
      <Canvas
        shadows={false}
        className={css.canvas}
        frameloop={gone ? "never" : frameloop}
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
          <System
            isMobile={env.isMobile}
            reducedMotion={env.reducedMotion}
            fade={fade}
            arms={armsOn ? arms : null}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
