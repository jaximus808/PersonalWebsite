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
import cookies from "cookie"

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
    <div className=' bg-[#faf7f5]'>

      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
        <Header/>
         <div className={`${styles.ContactMaincotainer} text-black `}>
            
          <div className={styles.textContainerContact}>

            <h1 className='text-5xl'>
                <strong>Find Me Here 📬</strong>
            </h1>

          <h3>

            <div className='mt-8 grid lg:grid-cols-2 mb-8' style={{fontSize:"130%"}}>
                <div className='lg:border-r-2 lg:pr-4 py-4'>
                    <a rel="noreferrer" target={"_blank"} href='https://github.com/jaximus808'>
                        <div className={'bg-[#f5e8df] p-4 rounded-r-2xl flex gap-4 hover:border-l-8 border-l-4  border-[#333] duration-300 '} style={{marginBottom: "20px"}}>
                            <img className={`h-20 w-20 bg-white rounded-full` } src='/github2.png'/>
                            <div>
                                <h1 className='text-2xl'>
                                    <strong>Github: jaximus808</strong>
                                </h1>
                                <p>{"Come and see my github profile! Feel free to send a follow :)"}</p>
                            </div>
                            
                        </div>
                    </a >
                    {/* #6491d9 */}
                    
                   
                    <a rel="noreferrer" target={"_blank"} href='https://www.linkedin.com/in/jaxon-poentis'>
                        <div className={'bg-[#f5e8df] p-4 rounded-r-2xl flex gap-4 hover:border-l-8 border-l-4  border-[#6491d9] duration-300 '} style={{marginBottom: "20px"}}>
                        <img className={`h-20 w-20 ` }src='/linkdinLogo.png'/>
                            <div>
                                <h1 className='text-2xl'>
                                    <strong>Linkdin: jaxonpoentis</strong>
                                </h1>
                                <p>{"Lets connect! Find my LinkedIn profile here and send a message!"}</p>
                            </div>
                            
                        </div>
                    </a >
                    <a rel="noreferrer" target={"_blank"} href='https://twitter.com/Jaxonpoentis'>
                        <div className={'bg-[#f5e8df] p-4 rounded-r-2xl flex gap-4 hover:border-l-8 border-l-4  border-black duration-300 '} style={{marginBottom: "20px"}}>
                        <img className={`h-16 w-18 bg-black p-2`} src='/twitterlogo.png'/>
                            <div>
                                <h1 className='text-2xl'>
                                    <strong>X: Jaxon Poentis</strong>
                                </h1>
                                    <p>
                                        {"Follow my X and stay updated with what I'm up to! Lets get talking!"}
                                    </p>
                            </div>
                            
                        </div>
                    </a >
                    <a  rel="noreferrer" target={"_blank"} href='mailto:jaxonp808@gmail.com'>
                          <div className={'bg-[#f5e8df] p-4 rounded-r-2xl flex gap-4 hover:border-l-8 border-l-4  border-[#00ab1c] duration-300 '} style={{marginBottom: "20px"}}>
                          <img className={`h-20 w-20`} src='/gmailLogo.png'/>
                            <div>
                                <h1 className='text-2xl'>
                                    <strong style={{overflowWrap: "break-word"}}>Email: jaxonp808 @ gmail.com</strong>
                                </h1>
                                <p>{"Need to contact me? Send me an email!"}</p>
                            </div>
                            
                        </div>
                    </a>
                    <a rel="noreferrer" target={"_blank"} href='https://www.youtube.com/channel/UCqakvmaEw3OYRjkpY1gXKag'>
                        <div className={'bg-[#f5e8df] p-4 rounded-r-2xl flex gap-4 hover:border-l-8 border-l-4  border-[#fc4949] duration-300 '} style={{marginBottom: "20px"}}>
                        <img className={`h-16 w-18`} src='/youlogo.png'/>
                            <div>
                                <h1 className='text-2xl'>
                                    <strong>Youtube: Jaxon Poentis</strong>
                                </h1>
                                <p>{"Check out my youtube page where I post occasional updates about projects or about life :)"}</p>
                            </div>
                            
                        </div>
                    </a >
                    
                </div>
                <div className='lg:pr-4 px-4 py-4'>
                    <h1 className='text-2xl'><strong>About Me</strong></h1>
                    <div className='text-xl pl-4 py-4'>
                        <h1 >
                            I'm born and raised from Hawaii on the island of Hawaii, Honolulu. I am mixed with hawaiian, japanese, filippino, korean, and spanish. Currently I'm learning to speak Japanese and I'm planning to keep learning new languages!
                        </h1> 
                        <br></br>
                        <h1 >
                            Outside of my passion for programming and building, some of my interests include: 
                        </h1> 
                        <ul className='text-xl pl-8 pt-2 '>
                            <li>
                                <div className='pt-2'>
                                    <strong>
                                    🦍 Powerlifting
                                    </strong>
                                    <div className='pl-8'>
                                        I try and stay consistent to hit the gym 5 days a week for around a year. With school this is getting a little harder haha. My current squat, bench, and deadlift are 315, 195, and 405 respectively. Also I'm a conventionally deadlifter.
                                    </div>
                                </div>
                                <div className='pt-2'>
                                    <strong>
                                    🔨 Anime
                                    </strong>
                                    <div className='pl-8'>
                                        Some of my favorite animes currently are jujutsu kaisen and chainsaw man. I'm a big fan of action and a mix of deep themes.
                                    </div>
                                </div>
                                <div className='pt-2'>
                                    <strong>
                                    ✏️ Animation
                                    </strong>
                                    <div className='pl-8'>
                                        Animation is a side hobby that I enjoy creating as it's so satisfying to see things move together to create motion. I'm not particularly good at drawing but I still enjoy animating fights scenes. I post some animations on youtube so check it out :)
                                    </div>
                                </div>
                            </li>
                        </ul>
                        <br></br>
                        <h1 >
                            I would love to get to know you too! Reach out about anything and lets connect!
                        </h1> 
                    </div>
                    
                    
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