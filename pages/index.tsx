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
            <h1 style={{"fontSize":"300%","textAlign":"center"}}>～Hello!～</h1>
            <img src="/frontimage.jpg" className={styles.frontImage}/>
            <h3>My name is Jaxon Poentis and I am currently a senior at Roosevelt High School in Hawaii. I am self-taught programmer and I create projects in Website-Devolpment, Machine Learning, Networking, Game Devolpment, and whatever interests me at the time. I am very interested in learning more about Computer Science and Quantum Computing in the future.</h3>
          </div>
          
          <div className={styles.textContainer}>
          <h1 style={{"fontSize":"250%","textAlign":"center"}}>～My Favorite Projects～</h1>
          {props.pastProjFav.map((data:any) =>
              {
                return (<div key={data.id} style={{"textAlign":"center"}}>
                    <h2>
                      <Link style={{ fontStyle:"italic"}}  href={`/projects/${data.name}`}>
                        <div style={{"cursor":"pointer",textDecoration: "underline",}}>{data.name}</div>
                      </Link>
                    </h2>
                    <div style={{paddingLeft:"20px"}}>
                        { (data.youtube) ?
                        <iframe width="100%" height="100%" src={data.mediaLink} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>  
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