
import dynamic from 'next/dynamic';
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import css from "../styles/Home.module.css"
import Router from 'next/router'
import * as THREE from "three"
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import shapePositions from './shapePositions.json'
function Radians(degrees: number) {
  return degrees * Math.PI / 180
}

const sphere = new THREE.SphereGeometry(0.1, 25, 28)

const white = new THREE.MeshLambertMaterial({ color: "white" })


function System(props: any): JSX.Element {

  //MAKE THIS FADE IN ON LOAD

  let scrolPrev = 0;
  const camera = useThree(state => state.camera)


  let yDist = 20
  let Zdist = 100
  let xDist = 100
  const pos: any = useRef([0, 25, 100]);
  const rafRef = useRef<number>()
  const angle = useRef(0)
  const isMobile = useRef(false)
  const rotateCamera = () => {
    let xPos = xDist * Math.sin(angle.current)
    let zPos = Zdist * Math.cos(angle.current)

    camera.position.setZ(zPos);
    camera.position.setX(xPos);
    camera.lookAt(0, 0, 0);
  }

  const handleScroll = () => {
    if (isMobile.current || rafRef.current) return
   
    rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        angle.current = angle.current + 0.01 * (y - scrolPrev);
        
        angle.current = angle.current % (2 * Math.PI);
        if (angle.current < 0) angle.current += 2 * Math.PI;

        let xPos = xDist * Math.sin(angle.current)
        let zPos = Zdist * Math.cos(angle.current)

        camera.position.setZ(zPos);
        camera.position.setX(xPos);
        camera.lookAt(0, 0, 0);
        
        scrolPrev = y;
        rafRef.current = undefined
      })
  }

  useEffect(() => {
    isMobile.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || window.innerWidth <= 768;
    camera.lookAt(0, 0, 0);
    if (!isMobile.current) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }  
    return () => {
      if (!isMobile.current) {
        window.removeEventListener("scroll", handleScroll);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, []);
  const allShapesPositions = useMemo(() => shapePositions as { [key: string]: number[][] }, [])


  return (OptimizedStars({ allShapesPositions, angle, rotateCamera }))
}

function OptimizedStars({ allShapesPositions, angle, rotateCamera }: {  allShapesPositions: { [key: string]: number[][] }, angle: React.MutableRefObject<number>, rotateCamera: () => void }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const tempObject = useMemo(() => new THREE.Object3D(), [])
  
  const currentShapeRef = useRef(0)
  const startPositionsRef = useRef<number[][]>([])
  const targetPositionsRef = useRef<number[][]>([])
  const lerpProgressRef = useRef(0)
  const lastTransitionRef = useRef(0)
  
  const shapeNames = Object.keys(allShapesPositions)
  const totalPositions = allShapesPositions[shapeNames[0]].length
  useEffect(() => {
    // Initialize with first shape
    startPositionsRef.current = allShapesPositions[shapeNames[0]]
    targetPositionsRef.current = allShapesPositions[shapeNames[1]]
  }, [])
  useFrame((state) => {
    if (!meshRef.current && targetPositionsRef.current.length === 0) return
    
    const elapsed = state.clock.elapsedTime
    angle.current += 0.01
    rotateCamera()
    // Check if 4 seconds have passed
    if (elapsed - lastTransitionRef.current >= 4) {
      // Start new transition
      lastTransitionRef.current = elapsed
      lerpProgressRef.current = 0
      
      // Move to next shape
      currentShapeRef.current = (currentShapeRef.current + 1) % shapeNames.length
      const nextShapeIndex = (currentShapeRef.current + 1) % shapeNames.length
      
      startPositionsRef.current = targetPositionsRef.current
      targetPositionsRef.current = allShapesPositions[shapeNames[nextShapeIndex]]
    }
    
    // Update lerp progress (complete transition in 2 seconds)
    lerpProgressRef.current = Math.min(1, (elapsed - lastTransitionRef.current) / 2)
    
    // Smooth easing function
    const eased = lerpProgressRef.current < 0.5
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

  return (
    <instancedMesh ref={meshRef} args={[sphere, white, totalPositions]}>
      <primitive object={sphere} />
      <primitive object={white} attach="material" />
    </instancedMesh>
  )
}
export default function Background() {

  return (
    <div className={css.scene}>
      <Canvas
        shadows={false}
        className={css.canvas}
        style={{ position: "fixed",background: "transparent"  }} camera={{ zoom: 10, position: [0, 20, 100] }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          alpha: true, 
          powerPreference: "high-performance"
        }}
      >
        <ambientLight intensity={0.1}></ambientLight>

        <pointLight intensity={0.4} color="#cc00cc" position={[10, 10, -10]} />

        <pointLight intensity={1} color="#cc00cc" position={[0, 9, 35]} />
        <pointLight intensity={0.4} color="#2aa1c9" position={[20, 9, 35]} />
        <pointLight intensity={0.4} color="#cc00cc" position={[-20, 9, 35]} />

        <pointLight intensity={0.4} color="lightblue" position={[-10, 10, 10]} />

        <Suspense fallback={null} >

          <System></System>
        </Suspense>

        {/* <Box pos={[0,0,-10]}/> */}
      </Canvas>
    </div>
  )
}
