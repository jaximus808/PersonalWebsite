import type { NextPage } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useRef, useState,useEffect } from 'react'

const Header: NextPage = () => {

  const handleScroll =()=>
  {
      const y = window.scrollY;
      yRef.current = y;
      if(!scrolled.current && yRef.current > window.innerHeight*0.10 )
      {
        scrolled.current = true
        window.requestAnimationFrame(()=>
        {
          headerRef.current.className = styles.navBarMini;
        });
      }
      if(scrolled.current && yRef.current <=window.innerHeight*0.10  )
      {

        scrolled.current = false

          window.requestAnimationFrame(()=>
          {
            if(headerRef.current == null) return
            headerRef.current.className = styles.navBar;
          });
      }
  }

  useEffect(() => 
  {
      window.addEventListener("scroll", handleScroll)
      
      const y = window.scrollY;
      yRef.current = y;
      return () =>
      {
          window.removeEventListener("scroll", handleScroll)
      }
      
  },[])

  const yRef = useRef(0);

  const scrolled = useRef(false);

  let headerRef:any = useRef(null);

  return (
    <>
      <div ref={headerRef}  className={`${styles.navBar}`}>
          
          <div className={`${styles.links} font-thin relative top-1/2 translate-y-[-50%]`}>
            <span className={styles.homeLink} style={{ marginLeft:"2vw"}}>
              <Link href='/' className='text-3xl'>Jaxon Poentis</Link>
              
              </span>
            <Link  replace href='/projects'>Projects</Link>
            <Link replace  href='/blog'>Blog</Link> 
            <Link replace href='/'>Home</Link>
    
    
          </div>
        </div>
        <div  className={`${styles.navBarHolder}`}>
          
         
        </div>
    </>
    
    
  )
}

export default Header
