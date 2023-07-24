
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

type props = 
{
    exist:boolean
    blog:any
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // ...
    const { blogId }  = context.query
    if(!blogId)
    {
        return{
            props:
            {

                blog:"",
                exist: false
            }
          }
    }
    
    try
    {
        const blog = await prisma.blog.findUnique(
            {
                where:
                {
                    id: blogId.toString()
                }
            }
        )
        return{
            props:
            {
                blog:JSON.parse(JSON.stringify(blog)),
                exist: true
            }
          }
    }
    catch
    {
        return{
            props:
            {
                blog:{},
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
                    <Link href='/blog'>
                        <div style={{textDecoration: "underline", "cursor":"pointer"}} >{"<-"} Look at more blogs</div>
                    </Link>
                    <h1 className='text-center text-4xl '>
                     Blog: {props.blog.title}
                </h1>
                </div>
                </div>

                <div className={styles.textContainer}>
                {(props.exist) ?
                <div>
                

                <h2>
                    Posted on: {props.blog.datePosted}
                </h2>
                <div className='text-2xl' style={{paddingLeft:"20px"}}>
                    
                    <h3>
                        {props.blog.content}
                    </h3>
                </div>
            </div>
            :
              
            <>
                <div>Blog does not exist</div>
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