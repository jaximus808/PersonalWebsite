import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Header from '../components/header'
import Footer from '../components/footer'
import Background from '../components/backgroundThree'
import { PrismaClient , Prisma} from '@prisma/client'
import { useState,useEffect, useRef  } from 'react'
import prisma from '../lib/prisma'

import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'



function ScrollDown(props:any)
{

    
    const yRef = useRef(0);
    const moved = useRef(false)
    const scrollTitle:any = useRef(null);


    const showFixed =() =>
    {
      scrollTitle.current.style.top = "0";

      scrollTitle.current.style.color ="rgba(255,255,255,1)"
    }

    const hideFixed =() =>
    {

      scrollTitle.current.style.color ="rgba(255,255,255,0)"
        scrollTitle.current.style.top = "50%";
    }
    const handleScroll =()=>
    {
        const y = window.pageYOffset;
        yRef.current = y;
        console.log(yRef.current)
        if(!moved.current && yRef.current > 0 )
        {
            moved.current = true
            window.requestAnimationFrame(hideFixed);
        }
        if(moved.current && yRef.current ==0 )
        {

            moved.current = false
            window.requestAnimationFrame(showFixed);
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
    return (
      <>

        <h2 className={styles.scrollDownTitle} ref={scrollTitle} style={{"fontSize":"2vw","textAlign":"center"}}>v Scroll Down v</h2> 
      </>
    )
}


const Index = () => {

    
  return (
    <div>

    <Background/> 
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {}
        <Header/>
        <div className={styles.mainTitleName}>
          <div className={styles.centerRel}>
            <div className='font-tourner' style={{"fontSize":"10vw","textAlign":"center"}}>My Socials</div> 
            <ScrollDown/>
          </div>
        </div>
        <div className={styles.homeMaincotainer}>
          <div className={styles.textContainer}>

          <h1 style={{"fontSize":"300%","textAlign":"center"}}>Find Me Here 📬</h1>
          <h3>

            <div style={{textAlign:"center",fontSize:"130%",textDecoration: "underline"}}>
                <div style={{marginBottom: "20px"}}>
                    <img className={styles.Logo} src='/github2.png'/>
                    <a rel="noreferrer" target={"_blank"} href='https://github.com/jaximus808'><div style={{display:"block",marginBottom:"3vw"}}>My Github</div></a>
                </div>
                <div style={{marginBottom: "20px"}} >
                    <img className={styles.instaLogo} src='/instalogo.png'/>
                    <a rel="noreferrer" target={"_blank"}href='https://instagram.com/jaxonsoldev?igshid=YmMyMTA2M2Y='><div style={{display:"block",marginBottom:"3vw"}}>Developer Log Instagram</div></a>
                
                </div>
                <div style={{marginBottom: "20px"}} >

                    <img className={styles.gmailLogo} src='/gmailLogo.png'/>
                    <div style={{display:"block",marginBottom:"3vw"}}>Email: jaxonp808@gmail.com</div>
                
                </div>
                <div style={{marginBottom: "20px"}} >

                    <img className={styles.gmailLogo} src='/linkdinLogo.png'/>
                    <a rel="noreferrer" target={"_blank"}href='https://www.linkedin.com/in/jaxon-poentis-967357243/'><div style={{display:"block",marginBottom:"3vw"}}>Linkedin</div></a>
                
                </div>
                <div style={{marginBottom: "20px"}}>
                    <img className={styles.gmailLogo} src='/youtubeLogo.png'/>
                    <a rel="noreferrer"target={"_blank"}href='https://www.youtube.com/channel/UCqakvmaEw3OYRjkpY1gXKag'><div style={{display:"block",marginBottom:"3vw"}}>Developer Log Youtube</div></a>
                </div>
            </div>
            </h3>
        </div>
          
          
        
        <Footer authSense={false} authenticated={false}/>

        </div>
    </div>
  )
}

export default Index