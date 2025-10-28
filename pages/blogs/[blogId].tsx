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
  <div className="min-h-screen bg-[#0a0a0a]">
      <Head>
        <title>{props.exist ? props.blog.title + ' | Jaxon Poentis' : 'Blog | Jaxon Poentis'}</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <meta property="og:image" content="/metadata.jpg" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header/>
      
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {props.exist ? (
          <article className="bg-[#121212] rounded-2xl shadow-2xl overflow-hidden">
            {/* Blog Header */}
            <header className="px-8 md:px-12 pt-12 pb-8 border-b border-gray-800">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                {props.blog.title}
              </h1>
              {props.blog.mediaPic && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      <img
                        src={props.blog.mediaPic}
                        alt={props.blog.title}
                        className="w-full max-h-96 object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
              <time className="text-gray-400 text-lg" dateTime={props.blog.datePosted}>
                {new Date(props.blog.datePosted).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            </header>

            {/* Blog Content */}
            <div className="px-8 md:px-12 py-10">
              <div className="prose prose-invert prose-lg max-w-none">
                {props.blog.content.split("*").map((data:any, key:any) => {
                  if(data.length == 0) return <div key={key} className="h-6"></div>
                  
                  if(data.length >= 3 && data.substring(0, 3) == "<i>")
                  {
                    return (
                      <figure key={key} className="my-8">
                        <img 
                          src={data.substring(3)} 
                          alt="Blog image"
                          className="w-full rounded-lg shadow-lg"
                        />
                      </figure>
                    )
                  }
                  else if (data.length >= 3 && data.substring(0, 3) == "<b>")
                  {
                    return (
                      <h2 key={key} className="text-2xl md:text-3xl font-bold text-white mt-10 mb-4 leading-snug">
                        {data.substring(3)}
                      </h2>
                    )
                  }
                  else
                  {
                    return (
                      <p key={key} className="text-gray-300 text-lg leading-relaxed mb-6 whitespace-pre-wrap">
                        {data}
                      </p>
                    )
                  }
                })}
              </div>
            </div>

            {/* Admin Controls */}
            {props.authenticated && (
              <div className="px-8 md:px-12 pb-8 border-t border-gray-800 pt-6">
                <button 
                  onClick={deleteBlog}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Delete Blog Post
                </button>
              </div>
            )}
          </article>
        ) : (
          <div className="bg-[#121212] rounded-2xl shadow-2xl p-12 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Blog Post Not Found</h1>
            <p className="text-gray-400 text-lg mb-8">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            
          </div>
        )}
        <Link href="/blog">
              <div className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                Back to Blog
          </div>
        </Link>
      </main>
    </div>
  )
}

export default Index;