
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
import { Suspense } from 'react'
import Image from 'next/image'

import {PrismaClient, Prisma, Projects} from "@prisma/client"

import Youtube from "react-youtube"

function YoutubeVideo(props:any)
{
  function _onReady(event:any) {
    event.target.pauseVideo();
  }
  const opts = {

    height: "380",
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
    id:string,
    exist:boolean
    projectData:any,
    authenticated:boolean
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

    const parsedCookies = cookies.parse(context.req.headers.cookie?context.req.headers.cookie:"");
    
    const token = parsedCookies.token;

    let authenticated = false; 
    if(!token) 
    {
      authenticated = false;
      console.log("EMWO?")
    }
    else 
    {
      try
      {
        jsonwebtoken.verify(token, process.env.ADMIN_PASS!);
        authenticated = true;
      }
      catch
      {
        authenticated = false;
      }
      
    }
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
        console.log(projectName.toString())
        const proj_data = JSON.parse(JSON.stringify(project))[0]
        if(!proj_data)
        {
          throw "error"
        }
        return{
            props:
            {
                projectData:proj_data,
                exist: true,
                authenticated:authenticated,
                id:projectName,
            }
          }
    }
    catch
    {
        return{
          redirect: {
            permanent: false,
            destination: "/projects",
          },
          props:{},
          }
    }
  
}

const Index: React.FC<props> = props => {
    const deleteProject = async () =>
    {
        console.log({
            post_name:props.id
          })
      
        const response = await fetch("/api/admin/deleteProjects", {
          method:"POST",
          headers:
          {
              'Content-Type': 'application/json',
          },
          body:JSON.stringify({
            post_name:props.id
          }) 
        }).then(()=>
        {
          location.replace("/projects");
        })
      
    }
  
  return ( 
  <div>

      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />

        <meta property="og:image" content="/metadata.jpg" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
        <Header/>
        <div className={`${styles.maincotainer_project} `}>
            <div className={styles.textContainer}>

                    
                <div>
                    {/* <Link href='/projects'>
                        <div style={{textDecoration: "underline", "cursor":"pointer"}} >{"<-"} Look At More Projects</div>
                    </Link> */}
                    
                    <h1 className='text-3xl text-center px-4'>
                        <strong>{props.projectData.name.replace(/_/g," ")}</strong>
                    </h1><br></br>
                </div>
                </div>

                <div className={styles.textContainer}>
                  {(props.exist) ?
                <div className='px-4'> 
                    
                    <h2>
                        Created on: {new Date(props.projectData.projectDate).toLocaleDateString()}
                    </h2>
                    <br></br>
                    <div >
                        { (props.projectData.youtube) ?
                        
                        <div className={` ${styles.journeyImage} sm:w-[40rem] h-96`}>
                              
                              <Suspense fallback={<h3>loading</h3>}>

                                <YoutubeVideo   vId={props.projectData.mediaLink}/>
                              </Suspense>
                            </div>
                            
                            
                        :
                        <Image src={props.projectData.mediaLink} className='relative left-1/2 translate-x-[-50%]' width={700} height={500} alt='media'/> 
                        
                        }
                        <h3 className='text-xl text-center' style={{whiteSpace:'pre-wrap'}}>
                          <br></br>
                              <div style={{whiteSpace:'pre-wrap'}}>
                                {props.projectData.description}
                              </div>
                            <p></p>

                            <br></br>
                            <a rel="noreferrer" style={{textDecoration: "underline"}} target={"_blank"} href={`${props.projectData.linkName}`}>{"➡️ Check out the Repo"}</a>
                            <br></br>
                            {(props.projectData.projectLinks != "") ? <a rel="noreferrer" style={{textDecoration: "underline"}} target={"_blank"} href={`${props.projectData.projectLinks}`}>{"➡️ Check out more of the project"}</a>:<></>}
                        </h3>
                    </div>
                    {(props.authenticated) ?
                  
                    <div>
                        <button onClick={deleteProject}>delete</button>
                    </div>
                    
                    :

                    <div></div>}
                  <br></br>
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
        </div>
    </div>
  )
}

export default Index;