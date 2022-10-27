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

  console.log(pastFavoriteProjects)

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


const Index:React.FC<props> = props => {

  console.log(props)
    
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
            <h3>My name is Jaxon Poentis and I am currently a senior at Roosevelt High School in Hawaii. I am self-taught programmer and I create projects in Website-Devolpment, Machine Learning, Networking, Game Devolpment, and whatever interests me at the time. I am very interested in learning more about Computer Science and Quantum Computing in the future.</h3>
          </div>
          
        {/* <h1>～My Socials～</h1>
          <h3>

            <ul style={{fontSize:"130%",textDecoration: "underline"}}>
              <li style={{marginBottom: "20px"}}>
                <a target={"_blank"} href='https://github.com/jaximus808'>Github</a>
              </li>
              <li style={{marginBottom: "20px"}} >
                <a target={"_blank"}href='https://instagram.com/jaxonsoldev?igshid=YmMyMTA2M2Y='>Developer Log Instagram</a>
               
              </li>
              <li style={{marginBottom: "20px"}} >
                <a target={"_blank"}href='jaximus808@gmail.com'>Email: jaximus808@gmail.com</a>
               
              </li>
              <li style={{marginBottom: "20px"}} >
                <a target={"_blank"}href='https://www.linkedin.com/in/jaxon-poentis-967357243/'>Linkedin</a>
               
              </li>
              <li style={{marginBottom: "20px"}}>
                <a target={"_blank"}href='https://www.youtube.com/channel/UCqakvmaEw3OYRjkpY1gXKag'>Developer Log Youtube</a>
              </li>
            </ul>
          </h3>
        
        <h1>～Get To Know Me～</h1>
        <h3>
          I was born on March 23rd 2005 and I grew up on the island of Oahu. My ethnicities are (in order from highest percentage): Japanese, Hawaiian, Filipino, Spanish, and Korean. I began block-based coding with scratch in elementary school and serious text-based coding at the end of freshman year of High School.
          <p></p>
          Some other activities I participate in are Boy Scouts (currently a Life Scout), Tennis, Math Team, and the founder of the Roosevelt Coding Club. 
          <p></p>
          Some things I like to eat are Ramen, Steak, and Mango dessert. I enjoy hanging out with friends whenever I have the time and I love nerding out with other students interested in STEM, however biology usually goes over my head haha. 
        </h3>
           */}

          <div className={styles.textContainer}>
          <h1 style={{"fontSize":"250%","textAlign":"center"}}>～My Favorite Projects～</h1>
          {props.pastProjFav.map((data:any) =>
              {
                return (<div style={{"textAlign":"center"}}>
                    <h2>
                      <a style={{textDecoration: "underline", fontStyle:"italic"}}  href={`/projects/${data.name}`}>
                        {data.name}
                      </a>
                    </h2>
                    <div style={{paddingLeft:"20px"}}>
                        { (data.youtube) ?
                        <iframe width="560" height="315" src={data.mediaLink} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>  
                        :
                         <img src={data.mediaLink} width="370" height="315" /> }
                        <h3>
                        {data.shortDescription}
                        <p></p>
                        <a style={{textDecoration: "underline"}} target={"_blank"} href={`${data.linkName}`}>{"--> Check out the Repo"}</a>
                        <p></p>
                        <a style={{textDecoration: "underline"}} href={`/projects/${data.name}`}>{"--> Learn More Here"}</a>
                  
                        </h3>
                    </div>
                  </div>
                )})} 

              </div>
              <> 
                {/* {projects.map((projectElem, i:number) =>
                (
                  <div>
                  
                  <h2 style={{ fontStyle: "italic","fontSize":"180%"}}>{projectElem.name}</h2>
                  <div style={{paddingLeft:"20px"}}>
                    {(projectElem.youtube) ?<iframe width="560" height="315" src={projectElem.mediaLink} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>:<img src={projectElem.mediaLink}/> }
                    <h3>
                      {projectElem.description}
                      <p></p>
                      <a style={{textDecoration: "underline"}} href={projectElem.description}>Learn More...</a>
                    </h3>
                  </div>
                  </div>
                  
                ))} */}
              </>
              {/* 
              
            <div><h2 style={{ fontStyle: "italic","fontSize":"180%"}}>Server Hand-Tracking Robotic Hand</h2>
              <div style={{paddingLeft:"20px"}}>
                <iframe width="560" height="315" src="https://www.youtube.com/embed/ixc6L8SsFSI" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>  
                <h3>
                  This project was for the Regeneron International Science and Engineering Fair and was a solution to physically connecting people together with a more functional appraoch. It uses hand tracking to allow uses to control the robotic prototype through using UDP. 
                  <p></p>
                  <a style={{textDecoration: "underline"}} target={"_blank"}  href='https://github.com/jaximus808/Server-Hand-Tracking-Robotic-HandServerHandTracking'>Learn More...</a>
                </h3>
              </div>
            </div>
            <div>
              <h2 style={{fontStyle: "italic","fontSize":"180%"}}>Coding Club Website</h2>
              <div style={{paddingLeft:"20px"}}>
                <img src='codingClubLogo.png'width="315" height="315"></img>
                <h3>
                  This website is for the Coding Club at Roosevelt High School. The website can be found at <a style={{textDecoration: "underline"}} target='_blank' href='https://www.rooseveltstem.com'>rooseveltstem.com.</a> It allows annoucements to be posted through a discord bot that adds events to a mongodb database.
                  <p></p>
                  <a style={{textDecoration: "underline"}} target={"_blank"} href='https://github.com/jaximus808/CodingClubWebsite'>Learn More...</a>
                </h3>
              </div>
            </div>
            <div>
              <h2 style={{fontStyle: "italic","fontSize":"180%"}}>Multiplayer AP Pyschology Game 1.0</h2>
              <div style={{paddingLeft:"20px"}}>
                <img src='socketgame.gif'width="560" height="315"></img>
                <h3>
                  This multiplayer game was created for an Ap Pysychology class for students to play as a game to help memorize important terms on the module. There were some issues but this helped me to understand and actually work with socket streaming and multiplayer games. In the future I plan to improve this to allow users to customize the game with their own terms along with better multiplayer architecture. 
                  <p></p>
                  <a style={{textDecoration: "underline"}} href='https://github.com/jaximus808/PsychSocketGame'>Learn More...</a>
                </h3>
              </div>
            </div> */}
            <Footer authSense={false} authenticated={false}/>

        </div>
    </div>
  )
}

export default Index