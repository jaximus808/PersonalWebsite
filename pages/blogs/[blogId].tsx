
import Head from 'next/head'
import styles from '../../styles/Home.module.css'
import Header from '../../components/header'

import Footer from '../../components/footer'
import Background from '../../components/backgroundThree'
import * as cookies from "cookie"
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import { getCookies, getCookie, setCookie, deleteCookie } from 'cookies-next';

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
    blogid:number,
    exist:boolean
    blog:any,
    authenticated:boolean
}

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
    console.log(authenticated)
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
                blogid: blogId,
                blog:JSON.parse(JSON.stringify(blog)),
                exist: true,
                authenticated:authenticated
            }
          }
    }
    catch
    {
        return{
            props:
            {
                blogid: blogId,
                blog:{},
                exist: false,
                authenticated:authenticated
            }
          }
    }
  
}

const Index: React.FC<props> = props => {


  const deleteBlog = async () =>
  {
    
      const response = await fetch("/api/admin/deleteblog", {
        method:"POST",
        headers:
        {
            'Content-Type': 'application/json',
        },
        body:JSON.stringify({
          blogid:props.blogid
        }) 
      }).then(()=>
      {
        location.replace("/blog");
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
        <div className={styles.MainContainerBlog}>
            <div className={`bg-[#121212] ${styles.fontNormal} p-4 mt-8`}>
                {(props.exist) ?
                <div>
                  <h1 className='text-center text-5xl border-b-2 pb-4 '>
                     <strong>{props.blog.title}</strong>
                  </h1>

                  <h2 className='mt-4 text-center'>
                      Posted on: {new Date(props.blog.datePosted).toLocaleDateString()}
                  </h2>
                  <div className='mt-4 text-[1.25rem] w-4/5 min-w-[20rem] sm:w-3/5 sm:min-w-[30rem] relative left-1/2 translate-x-[-50%] font-[350] bg-[#222222] p-4 rounded-lg' >
                      
                      {props.blog.content.split("*").map((data:any, key:any) =>{
                        
                        if(data.length == 0) return <div key={key}></div>
                        if(data.length >= 3 && data.substring(0, 3) == "<i>")
                        {
                          return <img key={key} src={data.substring(3)}/>
                        }
                        else if (data.length >= 3 && data.substring(0, 3) == "<b>")
                        {
                          return <h3 key={key} className='font-bold' style={{whiteSpace:'pre-wrap'}}>
                          {data.substring(3)}
                        </h3>
                        }
                        else
                        {
                          return <h3 key={key} style={{whiteSpace:'pre-wrap'}}>
                            {data}
                          </h3>
                        }
                        


                      })}
                      
                     
                  </div>
                  {(props.authenticated)?
                  
                  <div>
                    <button onClick={deleteBlog}>delete</button>
                  </div>
                  
                  :
                  <div></div>}
              </div>
              :
                
              <>
                  <div>Blog does not exist</div>
              </>}
            </div>
            

              
        </div>
    </div>
  )
}

export default Index;