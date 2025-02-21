import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Header from '../components/header'
import Footer from '../components/footer'
import Background from '../components/backgroundThree'
import { PrismaClient , Prisma} from '@prisma/client'
import { useState,useEffect, useRef  } from 'react'
import cookies from "cookie"
import Link from 'next/link'

import jsonwebtoken from 'jsonwebtoken'

import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
type props = 
{
  blogs:any,
  auth:boolean
}


export const getServerSideProps: GetServerSideProps = async (context) =>
{
const parsedCookies = cookies.parse(context.req.headers.cookie?context.req.headers.cookie:"");
  
  const token = parsedCookies.token;

  let authenticated = false; 
  if(!token) 
  {
    authenticated = false;
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
  return {
    props:{
      auth:authenticated
    }
  }
}

const Index:React.FC<props> = props => {

  const [loading, isLoading] = useState(true)
  const [blogs, setBlogs] = useState([])

  async function getInitialData()
    {
      try 
      {
        const res = await fetch('/api/getBlogs/', {
          method:"GET",
          headers:
              {
                  'Content-Type': 'application/json',
              },
        })
        const data = await res.json()
        data.blogs.reverse()
        setBlogs(data.blogs)
        setShowForwardButton(data.blogs.length > 6)
        isLoading(false)
      }
      catch  (e)
      {
        return{fail:true, pastProjFav:[], recentBlogs:[]}
      }
    }
  
    useEffect(()=>
    {
      getInitialData(); 

    }, [])
    console.log(props)
    const AddBlog = async(e:any) => 
    {
      console.log("wtf")
      console.log(customDate == 'false')
      console.log("HELLo")
        e.preventDefault();
        const response = await fetch("/api/admin/addblog", {
        method:"POST",
        headers:
        {
            'Content-Type': 'application/json',
        },

        body: JSON.stringify(
          
            ( customDate === 'false') ? {
              title:blogName,
              content:blogContent
            }:{
              title:blogName,
              content:blogContent,
              datePosted: blogDate
            }
          )
        })
        const data = await response.json();
        if(data.pass)
        {location.reload();}   
        else 
        {
            setResponse(data.msg);
        }
    } 
    const logOut = async () =>
    {
      const logProject = await fetch("/api/admin/logout").then(res => res.json());
      location.reload();
    }
    const [blogPage, setProjectPage] = useState(0);

    const [showForwardButton, setShowForwardButton] = useState(blogs.length > 6 );
    const [showBackButton, setShowBackButton] = useState(false);
  
    const [blogName, setBlogName] = useState("");
    const [blogContent, setBlogContent] = useState("");
    const [blogDate, setBlogDate] = useState("");
    const [responseText,setResponse] = useState("");

    const [customDate, setCustomDate] = useState("false");
    
    console.log(showForwardButton)
    const MovePageForawrd = () =>
    {
      if(blogs.length <= (blogPage+1)*6) return; 
      setProjectPage(blogPage+1);
      if(blogs.length <= (blogPage+2)*6)
      {
        setShowForwardButton(false)
      }
      else 
      {
        setShowForwardButton(true)
  
      }
  
      setShowBackButton(true)
    }
    const MovePageBackward = () =>
    {
      if(blogs.length <= (blogPage-1)*6) return; 
      setProjectPage(blogPage-1);
      if((blogPage-2)*5 < 0 )
      {
        setShowBackButton(false)
      }
      else 
      {
  
        setShowBackButton(true)
      }
  
      setShowForwardButton(true)
    }  
    return (
      <div>
  
        <Head>
          <title>Jaxon Poentis</title>
          <meta name="description" content="Personal Page For Jaxon Poentis" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
          <Header/>
          

          <div className={`bg-[#141414] ${styles.homeMaincotainerBlog}`}>
            <p></p>
            {(props.auth) ?
            <div style={{position:"relative", zIndex:50}}>
              <h1 style={{fontSize:"300%"}}>Post Blog</h1>
              <form onSubmit={AddBlog}>
                <label>
                    {"Blog Title: "} 
                </label>
                <input type={"text" }value={blogName} onChange={(e) => setBlogName(e.currentTarget.value)}/>
                <p></p>
                <label>
                    {"Blog Content: "} 
                </label>
                <p></p>
                <textarea rows={4} cols={50} value={blogContent} onChange={(e) => setBlogContent(e.currentTarget.value)}></textarea>
                
                <p></p>
                <label>
                    {"Set Custom Date?"}
                </label>
                    <p></p>
                <input type='checkbox' value={customDate} onChange={(e)=>setCustomDate(e.currentTarget.value)}/>
                {(customDate === "true") ? 
                <>
                    <label>
                    {"Custom Blog Date: "} 
                        </label>
                        <p></p>
                    <input type='datetime-local'  value={blogDate} onChange={(e)=>setBlogDate(e.currentTarget.value)}/>
                    </> :<></>
                 } 
                <p></p>
                <label>
                    {responseText}
                </label>
                <p></p>
                <input type={"submit"} value={"Post Blog"}/>
            </form>
            <button onClick={logOut}>Log Out</button>
            </div>:
              
            <></>}

            <div className={styles.textContainer}>
                <div className='w-full bg-[#1c1c1c] p-8 '>
                  <div className='grid md:grid-cols-3 w-full'>
                  <h1 className='text-4xl' ><strong>My Blogs 💡</strong></h1>
                  <h3 className='mt-2 md:text-center'><strong>Total Blogs: {blogs.length}</strong></h3>
                  <h1 className='mt-2 md:text-center'><strong>Page: {blogPage+1}</strong></h1>
                  </div>
                  {(showForwardButton || showBackButton) ?<div className='ml-2 mt-4'>
                    <h1 > <strong>Move pages: </strong></h1>
                    <button className='cursor-pointer hover:bg-[rgb(31,0,33)] text-xl duration-500 hover:text-3xl rounded-3xl text-white' onClick={MovePageBackward}>{showBackButton ? "⬅️" :""} </button>
                    <button className='cursor-pointer hover:bg-[rgb(31,0,33)] text-xl duration-500 hover:text-3xl rounded-3xl text-white'  onClick={MovePageForawrd}>{showForwardButton ? "➡️" :""}</button>
                  </div> :<></>}
                </div>
                <br></br>
              
                {(loading) ? 
                <div className='md:ml-14 ml-6 mr-6 font-bold text-xl'>
                  Loading...
                </div> 
                :
                <div className='grid grid-cols-1 md:grid-cols-2 px-8 gap-y-4 gap-x-8'>
                  {
                blogs.slice(blogPage*6, (blogs.length > (blogPage+1)*6 )?((blogPage+1)*6):blogs.length).map((data:any) =>{
                  return (
                <div key={data.id} className='pb-4'>
                  <div  onClick={()=>
                    {
                      window.location.href = `/blogs/${data.id}`
                    }} className=' '>
                      <div   className={`  ${styles.projectContainerText}  ${styles.gradent2} rounded-xl cursor-pointer `  }  >
                        <h2 >
                            <div className={`text-2xl`} style={{'overflow':'hidden',WebkitLineClamp:1, WebkitBoxOrient:"vertical",display:"-webkit-box"}} ><strong>{data.title}</strong></div>
                        
                        </h2>
                        <h3 >
                            <div  style={{ "cursor":"pointer",overflowWrap: "break-word"}}>{new Date(data.datePosted).toLocaleDateString()}</div>
                        
                        </h3>
                        <div >
                            
                            <h3  className={"ml-4 text-xl my-4"} style={{'overflow':'hidden',WebkitLineClamp:4, WebkitBoxOrient:"vertical",display:"-webkit-box"}}>
                            {
                            
                              data.content.split("*").map((data:any, key:any) =>{
                        
                                  if(data.length == 0) return ""
                                  if(data.length >= 3 && data.substring(0, 3) == "<i>")
                                  {
                                    return ""
                                  }
                                  else if(data.length >= 3 && data.substring(0, 3) == "<b>")
                                    {
                                      return data.substring(3)
                                    }
                                  else
                                  {
                                    return data
                                  }
                                })
                            
                            
                            }
                            </h3>
                            <p></p>

                            
                            <p></p>
                            <Link className='text-xl' style={{textDecoration: "underline"}} href={`/blogs/${data.id}`}><div style={{textDecoration: "underline", 'cursor':'pointer'}}>{"-> Read More Here"}</div></Link>
                    
                        </div>
                    </div>
                  </div>
                </div>
                
                )})}</div> }
                
            </div>
            
          
{/*   
            <Footer authSense={false} authenticated={props.auth}/> */}
      </div>

      </div>
    )
  }
  
  export default Index