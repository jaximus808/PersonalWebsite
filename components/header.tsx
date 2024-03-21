import type { NextPage } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useRef, useState,useEffect } from 'react'

const Header: NextPage = () => {

  const handleScroll =()=>
  {
      const y = window.pageYOffset;
      yRef.current = y;
      if(!scrolled.current && yRef.current > window.innerHeight*0.1 )
      {
        scrolled.current = true
        window.requestAnimationFrame(()=>
        {
          headerRef.current.className = styles.navBarMini;
        });
      }
      if(scrolled.current && yRef.current <=window.innerHeight*0.1  )
      {

        scrolled.current = false

          window.requestAnimationFrame(()=>
          {

            headerRef.current.className = styles.navBar;
          });
      }
  }

  useEffect(() => 
  {
      window.addEventListener("scroll", handleScroll)
      
      const y = window.pageYOffset;
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
          
          <div className={`${styles.links} font-caviar relative top-1/2 translate-y-[-50%]`}>
            <span className={styles.homeLink} style={{fontStyle:"italic", marginLeft:"2vw"}}>
              <Link href='/'>Jaxon Poentis</Link>
              
              </span>
            <Link   href='/projects'>Project Catalog</Link>
            <Link href='/blog'>Blog</Link>
            <Link href='/socials'>My Socials</Link>
    
    
            <Link href='/'>Home</Link>
          </div>
        </div>
        <div  className={`${styles.navBarHolder}`}>
          
         
        </div>
    </>
    
    
  )
}

export default Header
