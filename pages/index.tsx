import type { NextPage } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Header from '../components/header'
import Footer from '../components/footer'
import Background from '../components/backgroundThree'
import { PrismaClient , Prisma} from '@prisma/client'
import { useState,useEffect, useRef  } from 'react'
import prisma from '../lib/prisma'
import cookies from "cookie"

import Youtube from "react-youtube"
function YoutubeVideo(props:any)
{
  function _onReady(event:any) {
    event.target.pauseVideo();
  }
  const opts = {
    height: "500vw",
    width: "100%",
    playerVars: {
      autoplay: 1,
    },
  };

  return (
    <div style={{height:"150%"}}>
      <Youtube videoId={props.vId} 
          opts={opts} onReady={_onReady} />
    </div>
  );
  
}


import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'

type props = 
{
  pastProjFav:any
}


export const getServerSideProps: GetServerSideProps = async (context) =>
{

  const prisma = new PrismaClient();

  const pastFavoriteProjects = await prisma.projects.findMany({
    where:
    {
      favorite:true
    }
  })


  return {
    props:{
      pastProjFav: JSON.parse(JSON.stringify(pastFavoriteProjects))
    }
  }
}


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
        if(!moved.current && yRef.current > window.innerHeight*0.1 )
        {
            moved.current = true
            window.requestAnimationFrame(hideFixed);
        }
        if(moved.current && yRef.current <=window.innerHeight*0.1 )
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


const Index:React.FC<props> = props => {

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
          <div style={{"fontSize":"10vw","textAlign":"center"}}>Jaxon Poentis</div> 
          <ScrollDown/>
        </div>
        <div className={styles.homeMaincotainer}>
          <div className={styles.textContainer}>
            <h1 style={{"fontSize":"300%","textAlign":"center"}}>~Aloha~</h1>
            <img src="/Frontimage2.jpg" style={{"borderRadius":"0.5rem"}} className={styles.frontImage}/>
            <h2 style={{"textAlign":"center"}}>My name is Jaxon Poentis and I am born and raised from Hawaii! I am self-taught programmer and I create many different projects from Website-Devolpment, Machine Learning, Networking, Game Devolpment, and many other interest sections of programming! I am currently attending Washington University in St. Lious of class 2027 studying Computer Science and Business! </h2>
            <h3 style={{"textAlign":"center"}}> </h3>
          </div>
          
          <div className={styles.textContainer} style={{"textAlign":"center"}}>
            
            <h1 style={{"fontSize":"250%","textAlign":"center"}}>～Currently～</h1>
            
            <div>
              <h2 style={{"fontSize":'2rem', "textDecoration":'underline'}}>College Preperation</h2>
              <img  src="/washuimg.jpg" style={{"width":"70%","borderRadius":"0.5rem"}}/>
              <h2 >At the moment I'm getting ready for college and I'm quite excited to start the next part of my journey at Washu! I'm still a little nervous if I'll be fully ready when I get there but that goes for everything right?</h2> 
            </div>

            <div>

              <h2 style={{"fontSize":'2rem', "textDecoration":'underline'}}>Fiverr Gig</h2>
              <img  src="/Fiver.png" style={{"width":"70%","borderRadius":"0.5rem"}}/>
              <h2 >I've started to do a small freelancing business in which I create broswer games for clients. It's been challenging but I've learned a lot! So far I've my gig has gotten 2,000 impressions and I've worked on around 6 projects from a real estate guesser to a real-time fort battle game. I'm not sure how active I'll be once college starts, but I hope I can continue to work on this small business!</h2> 
            </div>
            <div>
              <h2 style={{"fontSize":'2rem', "textDecoration":'underline'}}>FormFit AI</h2>
              <img  src="/FormFit.png" style={{"width":"70%","borderRadius":"0.5rem"}}/>
              <h2 >Another side project I'm currently working on is a formtracking AI app that will give instant feedback based on camera input about one's form when exercising. It's still in the works but I'm hoping I can launch a small service for those who want to improve their gym session as that's something I find really important for today's time.</h2> 
            </div>
          </div>
             


          <div className={styles.textContainer}>
          <h1 style={{"fontSize":"250%","textAlign":"center"}}>～My Favorite Projects～</h1>
          {props.pastProjFav.map((data:any) =>
              {
                return (<div key={data.id} style={{"textAlign":"center"}}>
                    <h2>
                      <Link style={{ fontStyle:"italic"}}  href={`/projects/${data.name}`}>
                        <div style={{overflowWrap: "break-word","cursor":"pointer",textDecoration: "underline",}}>{data.name}</div>
                      </Link>
                    </h2>
                    <div >
                        { (data.youtube) ?
                        <YoutubeVideo vId={data.mediaLink}/>
                        :
                         <img src={data.mediaLink} width="100%" height="100%" /> }
                        <h3>
                        {data.shortDescription}
                        <p></p>
                        <a rel="noreferrer" style={{textDecoration: "underline"}} target={"_blank"} href={`${data.linkName}`}>{"--> Check out the Repo"}</a>
                        <p></p>
                        <Link  href={`/projects/${data.name}`}><div style={{textDecoration: "underline","cursor":"pointer"}}>{"--> Learn More Here"}</div></Link>
                  
                        </h3>
                    </div>
                  </div>
                )})} 

              </div>
              
            <Footer authSense={false} authenticated={false}/>

        </div>
    </div>
  )
}

export default Index