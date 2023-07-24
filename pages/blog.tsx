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
        {
        }   
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
  
      <Background/> 
        <Head>
          <title>Jaxon Poentis</title>
          <meta name="description" content="Personal Page For Jaxon Poentis" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
          <Header/>
          <div className={styles.mainTitleName}>
            <div className='font-tourner' style={{"fontSize":"10vw","textAlign":"center"}}>My Blog</div> 
            <ScrollDown/>
          </div>

          <div className={styles.homeMaincotainer}>
            <p></p>
            {(props.auth) ?
            <>
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
            </>:
              
            <></>}

            <div className={styles.textContainer}>
                <h1 style={{ "textAlign":"center",fontSize:"4vw"}}>Blogs 💡</h1>
                <h3 style={{ "textAlign":"center",fontSize:"1.5vw"}}>(Total:{props.blogs.length})</h3>
                <h1 style={{ "textAlign":"center",fontSize:"2vw"}}>～(Page: {blogPage+1})～</h1>

                <div style={{"textAlign":"center"}}>
                    <button className='cursor-pointer bg-black hover:bg-[rgb(31,0,33)] p-2 rounded-3xl text-white' disabled={!showBackButton} onClick={MovePageBackward}>{"<"}</button>
                    <span style={{marginLeft:"25px"}}></span>
                    <button className='cursor-pointer bg-black p-2 hover:bg-[rgb(31,0,33)] rounded-3xl text-white'  disabled={!showForwardButton} onClick={MovePageForawrd}>{">"}</button>
                    </div>
                <p></p>
                {(props.blogs.length == 0) ? 
                
                <h3 style={{ "textAlign":"center",fontSize:"2vw"}}>Sorry blogs could not be loaded, try again!</h3>
                :
                props.blogs.slice(blogPage*5, (props.blogs.length > (blogPage+1)*5 )?((blogPage+1)*5):props.blogs.length).map((data:any) =>
                {
                    return (
                      <div key={data.id} onClick={()=>
                      {
                        window.location.href = `/blogs/${data.id}`
                      }} className='cursor-pointer'>
                        <div   className={`${styles.projectContainerText} rounded-xl` } style={{ "textAlign":"center",}} >
                          <h2 >
                              <div className={styles.specialLink} style={{ "cursor":"pointer",overflowWrap: "break-word",fontSize:"2.5vw",textDecoration: "underline"}}>{data.title}</div>
                          
                          </h2>
                          <div >
                              
                              <h3 style={{fontSize:"1.5vw",'overflow':'hidden',WebkitLineClamp:4, WebkitBoxOrient:"vertical",display:"-webkit-box"}}>
                              {data.content}
                              </h3>
                              <p></p>

                              
                              <p></p>
                              <Link style={{fontSize:"1.5vw",textDecoration: "underline"}} href={`/blogs/${data.id}`}><div style={{textDecoration: "underline", 'cursor':'pointer'}}>{"-> Read More Here"}</div></Link>
                      
                          </div>
                      </div>
                    </div>
                    )})}

                    
                

            </div>
            
          
  
          <Footer authSense={true} authenticated={props.auth}/>
      </div>
      </div>
    )
  }
  
  export default Index