import { Canvas,useFrame } from "@react-three/fiber";
import css from "../styles/Home.module.css"

import * as THREE from "three"
import React, {useState, useEffect, useRef, useMemo,Suspense } from 'react'

function Radians(degrees:number) {
    return degrees * Math.PI / 180
  }

const sphere = new THREE.SphereGeometry(0.1, 25, 28)
const planet = new THREE.SphereGeometry(0.2, 25, 28)

const white = new THREE.MeshLambertMaterial({ color: "white" })

const height = 10;

function Stars(props:any)
{
    const ref:any = useRef(); 

    let angle = Radians(props.angle)
    let radius = props.radius
    //props.radius
    
    let prev = 0; 
    let scrolPrev = 0;
    let yValue = 0;
    let x = radius * Math.cos(angle)
    let y = props.y
    let z = radius * Math.sin(angle); 
    console.log(Radians(65))
    let zOffSet = props.z; 

    const handleScroll =()=>
    {
        const y = window.pageYOffset;
        angle = angle + 0.003*(y-scrolPrev);
        scrolPrev = y;
        if(angle > 2*Math.PI) angle = angle - 2*Math.PI;
        if(angle < 0) angle = angle + 2*Math.PI;
        x = radius * Math.cos(angle)
        z = radius * Math.sin(angle)
        ref.current.position.x = x; 
        ref.current.position.z = z+zOffSet; 

    }
    useFrame((state, delta) =>
    { 
        yValue = 1
        angle = angle + 0.002*(yValue);
        if(angle > 2*Math.PI) angle = angle - 2*Math.PI;
        if(angle < 0) angle = angle + 2*Math.PI;
        x = radius * Math.cos(angle)
        z = radius * Math.sin(angle)
        ref.current.position.x = x; 
        ref.current.position.z = z+zOffSet; 

    })
    useEffect(() =>
    {
        ref.current.position.x = x; 
        ref.current.position.y = y; 
        ref.current.position.z = z+zOffSet; 
    
        window.addEventListener("scroll", handleScroll)
        return () =>
        {
            window.removeEventListener("scroll", handleScroll)
        }
    }, [])

    return (
        <mesh ref={ref}>
        <mesh  geometry={sphere} material={white}/>
        </mesh>
    )

}

function Planet(props:any)
{
    const ref:any = useRef(); 

    let angle = Radians(props.angle)
    let radius = props.radius
    //props.radius
    
    let prev = 0; 
    let scrolPrev = 0;
    let yValue = 0;
    let x = radius * Math.cos(angle)
    let y = props.y
    let z = radius * Math.sin(angle); 
    console.log(Radians(65))
    let zOffSet = props.z; 

    const handleScroll =()=>
    {
        const y = window.pageYOffset;
        angle = angle + 0.003*(y-scrolPrev);
        scrolPrev = y;
        if(angle > 2*Math.PI) angle = angle - 2*Math.PI;
        if(angle < 0) angle = angle + 2*Math.PI;
        x = radius * Math.cos(angle)
        z = radius * Math.sin(angle)
        ref.current.position.x = x; 
        ref.current.position.z = z+zOffSet; 

    }
    useFrame((state, delta) =>
    { 
        yValue = 1
        angle = angle + 0.002*(yValue);
        if(angle > 2*Math.PI) angle = angle - 2*Math.PI;
        if(angle < 0) angle = angle + 2*Math.PI;
        x = radius * Math.cos(angle)
        z = radius * Math.sin(angle)
        ref.current.position.x = x; 
        ref.current.position.z = z+zOffSet; 

    })
    useEffect(() =>
    {
        ref.current.position.x = x; 
        ref.current.position.y = y; 
        ref.current.position.z = z+zOffSet; 
    
        window.addEventListener("scroll", handleScroll)
        return () =>
        {
            window.removeEventListener("scroll", handleScroll)
        }
    }, [])

    return (
        <mesh ref={ref}>
        <mesh  geometry={planet} material={white}/>
        </mesh>
    )

}



function System(props:any):JSX.Element
{
    const rows:JSX.Element[] = [];

    for(let y = 0; y < 4; y++)
    {
        for(let i = 0; i < 45; i++)
        {
            // rows.push(
            // <Stars angle={i*8} scale={0.01} radius={-45} y={10} z={-35}/>
            // )
            rows.push(
                <Stars angle={i*8} scale={0.01} radius={-4+y*0.8} y={10.2-y} z={35}/>
            )
        }   
    }
    for(let y = 0; y < 4; y++)
    {
        for(let i = 0; i < 45; i++)
        {
            // rows.push(
            // <Stars angle={i*8} scale={0.01} radius={-45} y={10} z={-35}/>
            // )
            rows.push(
                <Stars angle={i*8} scale={0.01} radius={4-y*0.8} y={3.2+y} z={35}/>
            )
        }   
    }
    for(let i = 0; i < 4; i++)
    {
        // rows.push(
        // <Stars angle={i*8} scale={0.01} radius={-45} y={10} z={-35}/>
        // )
        rows.push(
            <Planet angle={i*90} scale={1} radius={-5} y={6.5} z={35}/>
        )
    }  
    
    
    return (<>{
        rows.map(star =><>{star}</> )
    }
    </>)
}


function Box(props:any)
{
  const [xPos, setXPos] = useState(props.pos[0]);
  const [Yrotation, setYRotation] = useState(0); 

  const [Xrotation, setXRotation] = useState(0); 

  const [Zrotation, setZRotation] = useState(0); 


  const ref = useRef(); 
  

  return (
      <mesh scale={2} position={[0, -25, -80]} rotation={[Xrotation,Yrotation+Math.PI/4,Zrotation]} ref={ref} >
        <boxBufferGeometry args={[1,1,1]} attach="geometry"/>
        <meshPhongMaterial color={"lightblue"} attach="material"></meshPhongMaterial>
      </mesh>
  )
}


export default function Background()
{
    return(
        <div className={css.scene}>
            <Canvas
                shadows={true}
                className={css.canvas}
                style={{position:"fixed"}}  camera={{ zoom: 10, position: [0, 20, 100] }}
            >
            
            <ambientLight intensity={0.1}></ambientLight>
            
            <pointLight intensity={0.4} color="#cc00cc"position={[10, 10, -10]} />

            <pointLight intensity={1} color="#cc00cc"position={[0, 9, 35]} />
            <pointLight intensity={0.4} color="#2aa1c9"position={[20, 9, 35]} />
            <pointLight intensity={0.4} color="#cc00cc"position={[-20, 9, 35]} />

            <pointLight intensity={0.4} color="lightblue" position={[-10, 10, 10]} />

                <Suspense fallback={null} >

                </Suspense>

                <System></System>
                {/* <Box pos={[0,0,-10]}/> */}
            </Canvas>
        </div>
    )
}