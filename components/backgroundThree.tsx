
import dynamic from 'next/dynamic';
import { Canvas, useFrame,useThree } from "@react-three/fiber"
import css from "../styles/Home.module.css"
import Router from 'next/router'
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

    Router.events.on('routeChangeStart', (url, options) => {linkedClicked.current=true})
    Router.events.on('routeChangeComplete', (url, options) => {linkedClicked.current=false})

    const ref:any = useRef(); 

    let angle = useRef(Radians(props.angle))
    let radius = props.radius
    //props.radius
    
    let prev = 0; 
    let scrolPrev = 0;
    let yValue = 0;
    let x = radius * Math.cos(angle.current)
    let y = props.y
    let z = radius * Math.sin(angle.current); 
    const linkedClicked = useRef(false)
    const idleTurningRate = useRef(0.002)
    let zOffSet = props.z; 

    const handleScroll =()=>
    {
        const y = window.pageYOffset;
        angle.current = angle.current + 0.003*(y-scrolPrev);
        scrolPrev = y;
        if(angle.current > 2*Math.PI) angle.current = angle.current - 2*Math.PI;
        if(angle.current < 0) angle.current = angle.current + 2*Math.PI;
        x = radius * Math.cos(angle.current)
        z = radius * Math.sin(angle.current)
        
        ref.current.position.x = x; 
        ref.current.position.z = z+zOffSet; 

    }
    useFrame((state, delta) =>
    { 
        yValue = 1
        if(linkedClicked.current)
        {
            idleTurningRate.current+= 0.001
        }
        else
        {
            idleTurningRate.current = 0.002
        }
        angle.current = angle.current + (idleTurningRate.current)*(yValue);
        if(angle.current > 2*Math.PI) angle.current = angle.current - 2*Math.PI;
        if(angle.current < 0) angle.current = angle.current+ 2*Math.PI;
        if(Math.abs(angle.current) >300) angle.current = 0 //just incase it increments too much somehow

        x = radius * Math.cos(angle.current)
        z = radius * Math.sin(angle.current)
            
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

    let angle = useRef(Radians(props.angle))
    let radius = props.radius
    //props.radius
    
    let prev = 0; 
    let scrolPrev = 0;
    let yValue = 0;
    let x = radius * Math.cos(angle.current )
    let y = props.y
    let z = radius * Math.sin(angle.current ); 
    let zOffSet = props.z; 

    const handleScroll =()=>
    {
        const y = window.scrollY;
        //console.log(y)
        // console.log(0.03*(y-scrolPrev))
        // console.log(angle)
        angle.current = angle.current+ 0.03*(y-scrolPrev);
        scrolPrev = y;
        if(angle.current  > 2*Math.PI) angle.current  = angle.current  - 2*Math.PI;
        if(angle.current  < 0) angle.current  = angle.current  + 2*Math.PI;
        // x = radius * Math.cos(angle)
        // z = radius * Math.sin(angle)
        // ref.current.position.x = x; 
        // ref.current.position.z = z+zOffSet; 

        // console.log(`scroll angle ${angle}`)

    }
    useFrame((state, delta) =>
    { 
        // console.log(`actual angle ${angle}`)
        yValue = 1
        angle.current  += 0.002*(yValue);
        if(angle.current  > 2*Math.PI) angle.current  = angle.current  - 2*Math.PI;
        if(angle.current  < 0) angle.current  = angle.current  + 2*Math.PI;
        x = radius * Math.cos(angle.current )
        z = radius * Math.sin(angle.current )
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

    //MAKE THIS FADE IN ON LOAD

    let scrolPrev = 0;
    const camera = useThree(state => state.camera)

    let yDist = 20
    let Zdist = 100
    const pos:any = useRef([0, 25, 100]); 

    let angle = useRef(0)
    const handleScroll =()=>
    {
        const y = window.scrollY;
        //console.log(y)
        // console.log(0.03*(y-scrolPrev))
        // console.log(angle)
        angle.current = angle.current+ 0.001*(y-scrolPrev);
        
        if(angle.current  > 2*Math.PI) angle.current  = angle.current  - 2*Math.PI;
        if(angle.current  < 0) angle.current  = angle.current  + 2*Math.PI;
        let yPos = 8*yDist- 7*(yDist * Math.cos(2*angle.current))
        let zPos = Zdist * Math.cos(2*angle.current)
        // ref.current.position.x = x; 
        //new THREE.Vector3(1,0,0), 
        // camera.rotateOnWorldAxis(new THREE.Vector3(1,0,0),-(y-scrolPrev)*0.001);
        // camera.lookAt(0,10,30)
        // camera.translateX((y-scrolPrev)*0.3)
        camera.position.setY(yPos)
        camera.position.setZ(zPos)
        
        // camera.translateZ((y-scrolPrev)*0.3)
        //(camera.position)
        scrolPrev = y;
        // console.log(`scroll angle ${angle}`)

        camera.lookAt(0,7.5,35)
    }
    
    useEffect(() =>
    {
        
        camera.lookAt(0,7.5,35)
        window.addEventListener("scroll", handleScroll)
        return () =>
        {
            window.removeEventListener("scroll", handleScroll)
        }
    }, [])
    const rows:JSX.Element[] = [];
    let id = 0;
    for(let y = 0; y < 4; y++)
    {
        for(let i = 0; i < 20; i++)
        {
            // rows.push(
            // <Stars angle={i*8} scale={0.01} radius={-45} y={10} z={-35}/>
            // )
            id++
            rows.push(
                <Stars key={id} angle={i*18} scale={0.01} radius={-3+y*0.6} y={10.2-y} z={35}/>
            )
        }   
    }
    for(let y = 0; y < 4; y++)
    {
        for(let i = 0; i < 20; i++)
        {
            // rows.push(
            // <Stars angle={i*8} scale={0.01} radius={-45} y={10} z={-35}/>
            // )
            id++
            rows.push(
                <Stars key={id}  angle={i*18} scale={0.01} radius={3-y*0.6} y={3.2+y} z={35}/>
            )
        }   
    }
    for(let i = 0; i < 4; i++)
    {
        // rows.push(
        // <Stars angle={i*8} scale={0.01} radius={-45} y={10} z={-35}/>
        // )
        id++
        rows.push(
            <Planet key={id}  angle={i*90} scale={1} radius={-5} y={6.5} z={35}/>
        )
    }  
    
    
    return (<>{
        rows.map(star =><>{
            
            star}</> )
    }
    </>)
}


export default function Background()
{
    
    return(
        <div className={css.scene}>
            <Canvas
                shadows={true}
                className={css.canvas}
                style={{position:"fixed"}}  camera={{ zoom: 10, position:[0,21,100] }}
            >
            <ambientLight intensity={0.1}></ambientLight>
            
            <pointLight intensity={0.4} color="#cc00cc"position={[10, 10, -10]} />

            <pointLight intensity={1} color="#cc00cc"position={[0, 9, 35]} />
            <pointLight intensity={0.4} color="#2aa1c9"position={[20, 9, 35]} />
            <pointLight intensity={0.4} color="#cc00cc"position={[-20, 9, 35]} />

            <pointLight intensity={0.4} color="lightblue" position={[-10, 10, 10]} />

                <Suspense fallback={null} >

                    <System></System>
                </Suspense>

                {/* <Box pos={[0,0,-10]}/> */}
            </Canvas>
        </div>
    )
}