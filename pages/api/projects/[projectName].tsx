
import Head from 'next/head'
import styles from '../../../styles/Home.module.css'
import Header from '../../../components/header'

import Footer from '../../../components/footer'

import cookies from "cookie"
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import { getCookies, getCookie, setCookies, removeCookies } from 'cookies-next';

import * as jsonwebtoken from "jsonwebtoken";
import { useState } from 'react'

import {PrismaClient, Prisma, Projects} from "@prisma/client"

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



    const projects  = context.query.projects
    console.log(projects)
    if(!projects)
    {
        console.log("MEOW")
        return{
            props:
            {

                projectData:"",
                exist: false
            }
          }
    }
    const project = await prisma.projects.findMany(
        {
            where:
            {
                name: projects.toString(),
            }
        }
    )

  return{
    props:
    {
        projectData:project,
        exist: true
    }
  }
}

const Index: React.FC<props> = props => {

  

  return (
    <div>
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
        <Header/>
       
        <div className={styles.maincotainer}>
            <p></p>
                {(props.exist) ?
                <div>
                <h2>
                    {props.projectData.name}
                </h2>
                <div style={{paddingLeft:"20px"}}>
                    { (props.projectData.youtube) ?
                    <iframe width="560" height="315" src={props.projectData.mediaLink} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>  
                    :
                    <img src={props.projectData.mediaLink} width="370" height="315" /> }
                    <h3>
                    {props.projectData.description}
                    <p></p>
                    <a style={{textDecoration: "underline"}} target={"_blank"} href={`https://github.com/jaximus808/${props.projectData.githubLink}`}>{"--> Check out the Repo"}</a>
                    </h3>
                </div>
            </div>
            :
              
            <></>}
            

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