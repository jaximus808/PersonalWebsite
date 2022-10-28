
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Header from '../components/header'

import Footer from '../components/footer'

import Link from 'next/link'
import cookies from "cookie"
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import { getCookies, getCookie, setCookies, removeCookies } from 'cookies-next';

import { useState,useEffect, useRef  } from 'react'
import * as jsonwebtoken from "jsonwebtoken";
import {PrismaClient, Prisma, Projects} from "@prisma/client"

import Background from '../components/backgroundThree'

import Youtube from "react-youtube"

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
  projects:any
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
  
  const projects = await prisma.projects.findMany();
 
  //console.log(projects)
  return {
    props: 
      {
        auth: authenticated,
        projects:JSON.parse(JSON.stringify(projects)),
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
        
    },[])
    return (
      <>

        <h2 className={styles.scrollDownTitle} ref={scrollTitle} style={{"fontSize":"2vw","textAlign":"center"}}>v Scroll Down v</h2> 
      </>
    )
}

const Index: React.FC<props> = props => {

  const [projectsPage, setProjectPage] = useState(0);

  const [showForwardButton, setShowForwardButton] = useState(props.projects.length > 5 );
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
      
<Background/> 
      <Head>
        <title >Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
        
        <Header/>
        <div className={styles.mainTitleName}>
          <div style={{"fontSize":"10vw","textAlign":"center"}}>My Projects</div> 
          <ScrollDown/>
        </div>
       
        <div className={styles.homeMaincotainer}>
            <p></p>
            {(props.auth) ?
            <>
              <h1 style={{fontSize:"300%"}}>～Add Projects～</h1>
              <form onSubmit={AddProject}>
                <label>
                    {"Project Name: "} 
                </label>
                <input type={"text" }value={projectN} onChange={handleProjectChange}/>
                <p></p>
                <label>
                    {"Project Description: "} 
                </label>
                <p></p>
                <textarea rows={4} cols={50} value={projectDesc} onChange={handleProjectDesc}></textarea>
                
                <p></p>
                <label>
                    {"Short Project Description: "} 
                </label>
                <p></p>
                <textarea rows={4} cols={50} value={shortProjectDesc} onChange={handleShortProjectDesc}></textarea>
                
                <p></p>
                <label>
                    {"Uses Youtube?: "} 
                </label>
                <input type={"checkbox"} checked={ytLink} onChange={handleYtLink}/>
                <p></p>
                <label>
                    {"Favorite?: "} 
                </label>
                <input type={"checkbox"} checked={favorite} onChange={handleFavorite}/>
                <p></p>
                <label>
                    {"Media Link: "} 
                </label>
                <input  type={"text" }value={mediaLink} onChange={handleMediaLink}/>
                <p></p>
                <label>
                    {"Github Link: "} 
                </label>
                <input  type={"text" }value={githubLink} onChange={handleGithubLink}/>
                <p></p>
                <label>
                    {"Project Link: "} 
                </label>
                <input  type={"text"}value={projectLink} onChange={handleProjectLink}/>
                <p></p>
                <label>
                  {"Date Created: "}
                </label>
                <input  type={"date"}value={date} onChange={handleDate}/>
                <p></p>
                <label>
                    {responseText}
                </label>
                <p></p>
                <p> </p>
                <input type={"submit"} value={"Add Project"}/>
            </form>
            <button onClick={logOut}>Log Out</button>
            </>:
              
            <></>}

            <div className={styles.textContainer}>
              <h1 style={{ "textAlign":"center",fontSize:"4vw"}}>～Projects (Page: {projectsPage+1})～</h1>
            <div style={{"textAlign":"center"}}>
                  <button disabled={!showBackButton} onClick={MovePageBackward}>{"<"}</button>
                  <span style={{marginLeft:"25px"}}></span>
                  <button disabled={!showForwardButton} onClick={MovePageForawrd}>{">"}</button>
                </div>
            <p></p>
              {props.projects.slice(projectsPage*5, (props.projects.length > (projectsPage+1)*5 )?((projectsPage+1)*5):props.projects.length).map((data:any) =>
              {
                return (
                <div key={data.id} className={styles.projectContainerText} style={{ "textAlign":"center",}} >
                    <h2 >
                      <Link className={styles.specialLink}  style={{fontSize:"2.5vw",textDecoration: "underline"}} href={`/projects/${data.name}`}>
                        <div className={styles.specialLink} style={{ "cursor":"pointer",overflowWrap: "break-word"}}>{data.name}</div>
                      </Link>
                    </h2>
                    <div >
                        { (data.youtube) ?
                        <YoutubeVideo vId={data.mediaLink}/>
                        // <iframe width="100%" height="100%" src={data.mediaLink} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>  
                        :
                         <img src={data.mediaLink} margin-left=""width="100%" height="100%" /> }
                        <h3 style={{fontSize:"1.5vw"}}>
                        {data.shortDescription}
                        <p></p>
                        <a rel="noreferrer" style={{fontSize:"1.5vw",textDecoration: "underline"}} target={"_blank"} href={`${data.linkName}`}>{"--> Check out the Repo"}</a>
                        <p></p>
                        <Link style={{fontSize:"1.5vw",textDecoration: "underline"}} href={`/projects/${data.name}`}><div style={{textDecoration: "underline"}}>{"-> Learn More Here"}</div></Link>
                  
                        </h3>
                    </div>
                  </div>
                )})}

                
                

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
            <Footer authSense={true} authenticated={props.auth}/>
        </div>
    </div>
  )
}

export default Index;