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
import UnderConstruction from '../components/UnderConstruction'
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
          <UnderConstruction title='Blog Page'/>

      </div>
    )
  }
  
  export default Index