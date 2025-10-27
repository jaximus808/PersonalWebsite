
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Header from '../components/header'

import Background from '../components/backgroundprojects'

import Footer from '../components/footer'
import { Suspense } from 'react'
import Link from 'next/link'
import cookies from "cookie"
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import { getCookies, getCookie, setCookie, deleteCookie } from 'cookies-next';

import Image from 'next/image'
import { useState,useEffect, useRef  } from 'react'
import * as jsonwebtoken from "jsonwebtoken";
import {PrismaClient, Prisma, Projects} from "@prisma/client"


import Youtube from "react-youtube"
import UnderConstruction from '../components/UnderConstruction'

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
  auth:boolean;
  projects:any;
  favorite_projects:any;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // ...

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
  
  let projects : any;
  
  try
  {

    projects = await prisma.projects.findMany();
  }
  catch
  {
    projects = []
  }
 
  let  pastFavoriteProjects:any;
  try
  {
      pastFavoriteProjects = await prisma.projects.findMany({
      where:
      {
          favorite:true
      }
      })
  
  }
  catch
  {
      pastFavoriteProjects = [];
  }
  //console.log(projects
  return {
    props: 
      {
        auth: authenticated,
        projects:JSON.parse(JSON.stringify(projects)).reverse(),
        favorite_projects:JSON.parse(JSON.stringify(pastFavoriteProjects))
      },
  }
}

function YoutubeVideo(props:any)
{
  function _onReady(event:any) {
    event.target.pauseVideo();
  }
  const opts = {

    height: "300",
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
        
    })
    return (
      <>

        <h2 className={styles.scrollDownTitle} ref={scrollTitle} style={{"fontSize":"2vw","textAlign":"center"}}>v Scroll Down v</h2> 
      </>
    )
}

const Index: React.FC<props> = props => {

  const [projectsPage, setProjectPage] = useState(0);

  const [showForwardButton, setShowForwardButton] = useState(props.projects.length > 6 );
  const [showBackButton, setShowBackButton] = useState(false);

  
  const MovePageForawrd = () =>
  {
    if(props.projects.length <= (projectsPage+1)*5) return; 
    setProjectPage(projectsPage+1);
    if(props.projects.length <= (projectsPage+2)*5)
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
    if(props.projects.length <= (projectsPage-1)*5) return; 
    setProjectPage(projectsPage-1);
    if((projectsPage-2)*5 < 0 )
    {
      setShowBackButton(false)
    }
    else 
    {

      setShowBackButton(true)
    }

    setShowForwardButton(true)
  }

  const AddProject = async(e:any) => 
  {
    e.preventDefault();
    const response = await fetch("/api/admin/addproject", {
      method:"POST",
      headers:
      {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(
      {
          name: projectN,
          mediaLink: mediaLink,
          youtube: ytLink,
          description: projectDesc,
          shortDescription: shortProjectDesc,
          linkName: githubLink,
          projectDate:date,
          favorite: favorite,
          projectLinks: projectLink
      })
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

  const [projectN, setProjectN] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [shortProjectDesc, setShortProjectDesc] = useState("");
  const [ytLink, isYtLink] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [mediaLink, setMediaLink] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [date, setDate] = useState("");
  const [responseText,setResponse] = useState("");
  const [projectLink,setProjectLink] = useState("");
  
  const [projectList, setProjectList] = useState(props.projects);

  const logOut = async () =>
  {
    const logProject = await fetch("/api/admin/logout").then(res => res.json());
    location.reload();
  }

  const handleProjectChange = (e:any) =>
  {
    setProjectN(e.target.value);
  }
  const handleProjectDesc = (e:any) =>
  {
    setProjectDesc(e.target.value);
  }
  const handleShortProjectDesc = (e:any) =>
  {
    setShortProjectDesc(e.target.value);
  }
  const handleYtLink = (e:any) =>
  {
    isYtLink(!ytLink);
  }

  const handleFavorite = (e:any) =>
  {
    setFavorite(!favorite);
  }
  const handleMediaLink = (e:any) =>
  {
    setMediaLink(e.target.value);
  }

  const handleGithubLink = (e:any) =>
  {
    setGithubLink(e.target.value);
  }

  const handleProjectLink = (e:any) =>
  {
    setProjectLink(e.target.value);
  }


  const handleDate = (e:any) =>
  {
    setDate(e.target.value);
  }


  return (
    <div>
       
      <Head>
        <title >Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
        
      <Header/>
      <UnderConstruction title='Projects Page'/>
    </div>
  )
}

export default Index;