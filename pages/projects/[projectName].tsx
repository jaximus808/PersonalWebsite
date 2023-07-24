
import Head from 'next/head'
import styles from '../../styles/Home.module.css'
import Header from '../../components/header'

import Footer from '../../components/footer'
import Background from '../../components/backgroundThree'
import cookies from "cookie"
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import { getCookies, getCookie, setCookies, removeCookies } from 'cookies-next';

import Link from 'next/link'
import * as jsonwebtoken from "jsonwebtoken";
import { useState } from 'react'
 
import Image from 'next/image'

import {PrismaClient, Prisma, Projects} from "@prisma/client"

import Youtube from "react-youtube"
function YoutubeVideo(props:any)
{
  function _onReady(event:any) {
    event.target.pauseVideo();
  }
  const opts = {
    height: "390",
    width: "640",
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
const prisma = new PrismaClient();
// type ProjectProp =
// {
//   name: String, 
//   mediaLink: String,
//   youtube: Boolean, 
//   description: String,
//   shortDescription: String,
//   linkName: String,
//   projectDate: String, 
//   favorite:Boolean,
//   projectLinks: String,
//   createdDate: String, 
// }

type props = 
{
    exist:boolean
    projectData:any
}

// export async function getStaticProps({ params }:any)
// {

//     console.log(params.projectName)
//     const project = await prisma.projects.findMany(
//                 {
//                     where:
//                     {
//                         name: params.projectName,
//                     }
//                 }
//             )
//     return {
//         props:
//         {
//             exists: true,
//             projectData: project
//         }
//     }
    
// }

// export async function getStaticPaths()
// {
//     const projects = await prisma.projects.findMany();
//     return {
//         paths: projects.map(project =>
//             {
//                 return{
//                     params: {
//                         projectName: project.name
//                     }
//                 }
//             }),
//         fallback: false

//     }
// }

export const getServerSideProps: GetServerSideProps = async (context) => {
  // ...
    const { projectName }  = context.query
    if(!projectName)
    {
        return{
            props:
            {

                projectData:"",
                exist: false
            }
          }
    }
    
    try
    {
        const project = await prisma.projects.findMany(
            {
                where:
                {
                    name: projectName.toString()
                }
            }
        )
        return{
            props:
            {
                projectData:JSON.parse(JSON.stringify(project))[0],
                exist: true
            }
          }
    }
    catch
    {
        return{
            props:
            {
                project:[],
                exist: false
            }
          }
    }
  
}

const Index: React.FC<props> = props => {

  
  return ( 
  <div>

<Background/> 
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />

        <meta property="og:image" content="/metadata.jpg" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
        <Header/>
        <div className={styles.maincotainer}>
                <div className={styles.textContainer}>
                    
                <div>
                    <Link href='/projects'>
                        <div style={{textDecoration: "underline", "cursor":"pointer"}} >{"<-"} Look At More Projects</div>
                    </Link>
                    
                    <h1 className='text-3xl text-center'>
                        Project: {props.projectData.name}
                    </h1>
                </div>
                </div>

                <div className={styles.textContainer}>
                {(props.exist) ?
                <div>
                    
                    <h2>
                        Created on: {props.projectData.projectDate}
                    </h2>
                    <div >
                        { (props.projectData.youtube) ?
                        

                            <YoutubeVideo  vId={props.projectData.mediaLink}/>
                            
                        :
                        <Image src={props.projectData.mediaLink} className='relative left-1/2 translate-x-[-50%]' width={700} height={500} alt='media'/> 
                        
                        }
                        <h3 className='text-xl text-center'>
                            {props.projectData.description}
                            <p></p>
                            <a rel="noreferrer" style={{textDecoration: "underline"}} target={"_blank"} href={`${props.projectData.linkName}`}>{"--> Check out the Repo"}</a>
                            <p></p>
                            {(props.projectData.projectLinks != "") ? <a rel="noreferrer" style={{textDecoration: "underline"}} target={"_blank"} href={`${props.projectData.projectLinks}`}>{"--> Check out more of the project"}</a>:<></>}
                        </h3>
                    </div>
                </div>
            :
              
            <>
                <div>Project does not exist</div>
            </>}
            </div>
            

                {/* <li>
                    <div>
                        <h2><a style={{textDecoration: "underline"}} href={"/projects/emailbriefer"}>
                            Email Morning Briefer</a>
                        </h2>
                        <div style={{paddingLeft:"20px"}}>
                            <img src='tsant.png' width="370" height="315" />
                            <h3>
                            This service allows a user to plan out one's day.
                            <p></p>
                            </h3>
                        </div>
                    </div>
                </li> */}
            <Footer authSense={false} authenticated={false}/>
        </div>
    </div>
  )
}

export default Index;