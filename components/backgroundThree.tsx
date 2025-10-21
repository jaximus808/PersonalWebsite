
import dynamic from 'next/dynamic';
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import css from "../styles/Home.module.css"
import Router from 'next/router'
import * as THREE from "three"
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'

function Radians(degrees: number) {
  return degrees * Math.PI / 180
}

const sphere = new THREE.SphereGeometry(0.1, 25, 28)

const white = new THREE.MeshLambertMaterial({ color: "white" })



const FUNCTIONS_3D = {
  // Returns 2 values: top and bottom of sphere
  sphere: (x: number, y: number, time = 0) => {
    const r = 5; // radius
    const inside = r * r - x * x - y * y;
    if (inside < 0) return []; // outside sphere
    const z = Math.sqrt(inside);
    return [z, -z]; // top and bottom
  },

  // Returns 2 values: top and bottom of torus
  torus: (x: number, y: number, time = 0) => {
    const R = 4; // major radius
    const r = 2; // minor radius (tube thickness)
    const distFromCenter = Math.sqrt(x * x + y * y);
    const distFromTube = distFromCenter - R;
    const inside = r * r - distFromTube * distFromTube;
    if (inside < 0) return [];
    const z = Math.sqrt(inside);
    return [z, -z];
  },

  // Returns 2 values: saddle hyperbola
  hyperbolicParaboloid: (x: number, y: number, time = 0) => {
    const z = x * x - y * y;
    // Could return both + and - for symmetry
    return [z * 0.3];
  },

  // Returns 1 value: simple ripple
  ripple: (x: number, y: number, time = 0) => {
    const dist = Math.sqrt(x * x + y * y);
    return [Math.sin(dist - time) * 2];
  },

  // Returns 2 values: wave with reflection
  waveReflection: (x: number, y: number, time = 0) => {
    const z = Math.sin(x + time) * Math.cos(y + time) * 2;
    return [z, -z]; // mirror above and below
  },


  // Returns 2 values: double cone
  doubleCone: (x: number, y: number, time = 0) => {
    const dist = Math.sqrt(x * x + y * y);
    return [dist, -dist]; // top and bottom cone
  },

  // Returns 2 values: hyperboloid of one sheet
  hyperboloidOneSheet: (x: number, y: number, time = 0) => {
    const a = 1, b = 1, c = 1;
    const inside = (x * x) / (a * a) + (y * y) / (b * b) - 1;
    if (inside < 0) return []; // inside the neck
    const z = c * Math.sqrt(inside);
    return [z, -z];
  },

  // Returns 2 values: hyperboloid of two sheets
  hyperboloidTwoSheets: (x: number, y: number, time = 0) => {
    const a = 1, b = 1, c = 2;
    const value = (x * x) / (a * a) + (y * y) / (b * b);
    const z = c * Math.sqrt(1 + value);
    return [z, -z]; // two separate sheets
  },

  // Returns 1 value: paraboloid
  paraboloid: (x: number, y: number, time = 0) => {
    return [(x * x + y * y) * 0.2];
  },

  // Returns 2 values: ellipsoid
  ellipsoid: (x: number, y: number, time = 0) => {
    const a = 3, b = 3, c = 2; // semi-axes
    const inside = 1 - (x * x) / (a * a) - (y * y) / (b * b);
    if (inside < 0) return [];
    const z = c * Math.sqrt(inside);
    return [z, -z];
  },

  // Returns 2 values: Mexican hat with reflection
  mexicanHat: (x: number, y: number, time = 0) => {
    const r2 = x * x + y * y;
    const z = (1 - r2) * Math.exp(-r2 / 2) * 3;
    return [z];
  },

  // Returns multiple values: interference creating standing wave layers
  standingWaves: (x: number, y: number, time = 0) => {
    const base = Math.sin(x * 2 + time) + Math.cos(y * 2 - time);
    // Return multiple layers
    return [base * 2, base * 1, base * 0.5];
  },

  // Returns 2 values: helicoid (twisted surface)
  helicoid: (x: number, y: number, time = 0) => {
    const angle = Math.atan2(y, x);
    const dist = Math.sqrt(x * x + y * y);
    const z = angle * dist * 0.5;
    return [z]; // single-valued but twisted
  },

  // Returns 2 values: twisted torus
  twistedTorus: (x: number, y: number, time = 0) => {
    const angle = Math.atan2(y, x);
    const R = 4 + 0.5 * Math.sin(angle * 3 + time);
    const r = 2;
    const distFromCenter = Math.sqrt(x * x + y * y);
    const distFromTube = distFromCenter - R;
    const inside = r * r - distFromTube * distFromTube;
    if (inside < 0) return [];
    const z = Math.sqrt(inside);
    return [z, -z];
  },

  // Returns 2 values: egg carton with top and bottom
  eggCarton: (x: number, y: number, time = 0) => {
    const z = Math.sin(x + time) + Math.cos(y + time);
    return [z, -z - 4]; // separated layers
  },

  // Returns 2 values: Klein bottle section (simplified)
  kleinBottle: (x: number, y: number, time = 0) => {
    const r = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    const z1 = Math.sin(r + time) * Math.cos(angle * 2);
    const z2 = Math.cos(r + time) * Math.sin(angle * 2);
    return [z1 * 2, z2 * 2];
  },

  // Returns 3 values: triple helix
  tripleHelix: (x: number, y: number, time = 0) => {
    const angle = Math.atan2(y, x);
    const dist = Math.sqrt(x * x + y * y);
    const z1 = Math.sin(angle * 3 + dist - time) * 2;
    const z2 = Math.sin(angle * 3 + dist - time + Math.PI * 2 / 3) * 2;
    const z3 = Math.sin(angle * 3 + dist - time + Math.PI * 4 / 3) * 2;
    return [z1, z2, z3];
  },

  // Returns 4 values: flower with multiple petals at different heights
  flower: (x: number, y: number, time = 0) => {
    const angle = Math.atan2(y, x);
    const dist = Math.sqrt(x * x + y * y);
    const petals = 6;
    const z1 = Math.sin(angle * petals + time) * Math.exp(-dist * 0.3) * 2;
    const z2 = Math.sin(angle * petals + time + Math.PI) * Math.exp(-dist * 0.3) * 2;
    return [z1 + 2, z2 - 2];
  }
};


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
  const allShapesPositions = useMemo(() => {
    const step = 0.2
    const shapesData: { [key: string]: number[][] } = {}
    
    // Generate positions for each shape
    const shapeNames =[
      "sphere",
      "torus",
      "hyperbolicParaboloid",
      "ripple",
      "waveReflection",
      "doubleCone",
      "hyperboloidOneSheet",
      "hyperboloidTwoSheets",
      "paraboloid",
      "ellipsoid",
      "mexicanHat",
      "standingWaves",
      "helicoid",
      "twistedTorus",
      "eggCarton",
      "kleinBottle",
      "tripleHelix",
      "flower"
    ]
    
    shapeNames.forEach(shapeName => {
      const positions: number[][] = []
      
      for (let x = -6; x <= 6; x += step) {
        for (let y = -6; y <= 6; y += step) {
          const method = FUNCTIONS_3D[shapeName as keyof typeof FUNCTIONS_3D];
          if (method === undefined) continue;
          const zPos = method(x, y, 0)
          for (const z_p of zPos) {
            positions.push([x, z_p, y])
          }
        }
      }
      
      shapesData[shapeName] = positions
    })
    
    // Ensure all shapes have the same number of points by padding with duplicates
    const maxPoints = Math.max(...Object.values(shapesData).map(p => p.length))
    Object.keys(shapesData).forEach(key => {
      const positions = shapesData[key]
      while (positions.length < maxPoints) {
        positions.push([...positions[positions.length - 1]])
      }
    })
    
    return shapesData
  }, [])


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
