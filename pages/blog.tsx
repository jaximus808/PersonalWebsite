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

const prisma = new PrismaClient();
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
  let blogs:any;
  try  
  {
        blogs = await prisma.blog.findMany()
        blogs.reverse()
    }
    catch
    {
        blogs = []; 
    }

  

    console.log(authenticated)
  return {
    props:{
      blogs: JSON.parse(JSON.stringify(blogs)),
      auth:authenticated
    }
  }
}

function RecentBlog(props:any)
{
  console.log(props[0])
  console.log(props[0])
  const data = props[0]

  return (
  <div key={data.id} onClick={()=>
  {
    window.location.href = `/blogs/${data.id}`
  }} className='cursor-pointer'>
    <div   className={`${styles.projectContainerText} rounded-xl` } style={{ "textAlign":"center",}} >
      <h2 >
          <div className={styles.specialLink} style={{ "cursor":"pointer",overflowWrap: "break-word",fontSize:"2.5vw",textDecoration: "underline"}}>{data.title}</div>
      
      </h2>
      <h3 >
          <div className={styles.specialLink} style={{ "cursor":"pointer",overflowWrap: "break-word",fontSize:"1.2vw",textDecoration: "underline"}}>{new Date(data.datePosted).toLocaleDateString()}</div>
      
      </h3>
      <div >
          
          <h3 style={{fontSize:"1.5vw",'overflow':'hidden',WebkitLineClamp:4, WebkitBoxOrient:"vertical",display:"-webkit-box"}}>
          {data.content}
          </h3>
          <p></p>

          
          <p></p>
          <Link style={{fontSize:"1.5vw",textDecoration: "underline"}} href={`/blogs/${data.id}`}><div style={{textDecoration: "underline", 'cursor':'pointer'}}>{"-> Read More Here"}</div></Link>
  
      </div>
  </div>
</div>)
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

    const [showForwardButton, setShowForwardButton] = useState(props.blogs.length > 5 );
    const [showBackButton, setShowBackButton] = useState(false);
  
    const [blogName, setBlogName] = useState("");
    const [blogContent, setBlogContent] = useState("");
    const [blogDate, setBlogDate] = useState("");
    const [responseText,setResponse] = useState("");

    const [customDate, setCustomDate] = useState("false");
    
    console.log(showForwardButton)
    const MovePageForawrd = () =>
    {
      if(props.blogs.length <= (blogPage+1)*5) return; 
      setProjectPage(blogPage+1);
      if(props.blogs.length <= (blogPage+2)*5)
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
      if(props.blogs.length <= (blogPage-1)*5) return; 
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
                  <h3 className='mt-2 md:text-center'><strong>Total Blogs: {props.blogs.length}</strong></h3>
                  <h1 className='mt-2 md:text-center'><strong>Page: {blogPage+1}</strong></h1>
                  </div>
                  
                </div>
                <br></br>
                <div className='ml-2 mb-4'>
                    <button className='cursor-pointer hover:bg-[rgb(31,0,33)] text-xl duration-500 hover:text-3xl rounded-3xl text-white' onClick={MovePageBackward}>{showBackButton ? "⬅️" :""} </button>
                    <button className='cursor-pointer hover:bg-[rgb(31,0,33)] text-xl duration-500 hover:text-3xl rounded-3xl text-white'  onClick={MovePageForawrd}>{showBackButton ? "➡️" :""}</button>
                  </div>

                <div className='md:border-r-2 border-white border-solid md:mr-4 '>
                  <div  onClick={()=>
                    {
                      window.location.href = `/blogs/${props.blogs[0].id}`
                    }} className=' '>
                      <div   className={`md:ml-14 ml-6 mr-6 ${styles.projectContainerText}  ${styles.gradent2} rounded-xl cursor-pointer `  }  >
                        <h2 >
                            <div className={`text-2xl`}><strong>{props.blogs[0].title}</strong></div>
                        
                        </h2>
                        <h3 >
                            <div  style={{ "cursor":"pointer",overflowWrap: "break-word"}}>{new Date(props.blogs[0].datePosted).toLocaleDateString()}</div>
                        
                        </h3>
                        <div >
                            
                            <h3  className={"ml-4 text-xl my-4"} style={{'overflow':'hidden',WebkitLineClamp:4, WebkitBoxOrient:"vertical",display:"-webkit-box"}}>
                            {props.blogs[0].content}
                            </h3>
                            <p></p>

                            
                            <p></p>
                            <Link className='text-xl' style={{textDecoration: "underline"}} href={`/blogs/${props.blogs[0].id}`}><div style={{textDecoration: "underline", 'cursor':'pointer'}}>{"-> Read More Here"}</div></Link>
                    
                        </div>
                    </div>
                  </div>
                </div>
                
                    
                
            </div>
            
          
{/*   
            <Footer authSense={false} authenticated={props.auth}/> */}
      </div>

      </div>
    )
  }
  
  export default Index