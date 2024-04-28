
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Header from '../components/header'

import Background from '../components/backgroundprojects'

import Footer from '../components/footer'
import { Suspense } from 'react'
import Link from 'next/link'
import cookies from "cookie"
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import { getCookies, getCookie, setCookies, removeCookies } from 'cookies-next';

import Image from 'next/image'
import { useState,useEffect, useRef  } from 'react'
import * as jsonwebtoken from "jsonwebtoken";
import {PrismaClient, Prisma, Projects} from "@prisma/client"


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
        projects:JSON.parse(JSON.stringify(projects)),
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
        
    },[])
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
        {/* <div className={styles.mainTitleName}>
          <div className={styles.centerRel}>
            <div className='font-tourner' style={{"fontSize":"10vw","textAlign":"center"}}>My Projects</div> 
            <ScrollDown/>
          </div>
        </div> */}
        <Background/>
        
        <div className={`${styles.homeMaincotainerBlog}  w-full  bg-[#121212] text-white`}>
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
              <div className='w-full bg-[#1c1c1c] p-8 '>
                  <div className='grid md:grid-cols-3 w-full'>
                    <h1 className='text-4xl' ><strong>My Projects 🦾</strong></h1>
                    <h3 className='mt-2 md:text-center'><strong>Total Projects: {props.projects.length}</strong></h3>
                    <h1 className='mt-2 md:text-center'><strong>Page: {projectsPage+1}</strong></h1>
                  </div>
                  {(showForwardButton || showBackButton) ?<div className='ml-2 mt-4'>
                    <h1 > <strong>Move pages: </strong></h1>
                    <button className='cursor-pointer hover:bg-[rgb(31,0,33)] text-xl duration-500 hover:text-3xl rounded-3xl text-white' onClick={MovePageBackward}>{showBackButton ? "⬅️" :""} </button>
                    <button className='cursor-pointer hover:bg-[rgb(31,0,33)] text-xl duration-500 hover:text-3xl rounded-3xl text-white'  onClick={MovePageForawrd}>{showForwardButton ? "➡️" :""}</button>
                  </div> :<></>}
                  
                </div>
                <br></br>
                
             
                {(props.projects.length === 0 ) ? 
                <h3  style={{ "textAlign":"center",fontSize:"2vw"}}>Sorry projects could not be loaded, try again!</h3>
                :
                <div className='grid grid-cols-1 gap-16 p-4 lg:w-1/2'>
                  {
                props.projects.slice(projectsPage*6, (props.projects.length > (projectsPage+1)*6 )?((projectsPage+1)*6):props.projects.length).map((data:any) =>
                {
                  return (
                   
                    <div key={data.id} className=''>
                    <div   >
                    
                      <div onClick={()=>
                      {
                        window.location.href= `/projects/${data.name}`
                      }}   className={`${styles.projectContainerText} ${styles.gradent}  rounded-xl bg-[#171717] cursor-pointer`}style={{"textAlign":"center"}}>
                        <h2>
                            
                            <div className='text-2xl font-bold font-italic' style={{overflowWrap: "break-word","cursor":"pointer",textDecoration: "",}}>{data.name.replace(/_/g," ")}</div>
                          
                        </h2>
                        <div className='mt-4'>
                            { (data.youtube) ?
                            <div className={` ${styles.journeyImage} w-[22rem] h-72`}>
                              
                              <Suspense fallback={<h3>loading</h3>}>

                                <YoutubeVideo   vId={data.mediaLink}/>
                              </Suspense>
                              </div>
                            :
                            <div className={`${styles.journeyImage} w-full sm:w-96 h-64`}  >
                              <Image alt='front picture'src={data.mediaLink} fill style={{"borderRadius":"0.5rem"}}/>
                            </div>
                            // <Image alt='media picture' src={data.mediaLink} className='relative left-1/2 translate-x-[-50%]' width={0} height={0} style={{ width: '100%', height: 'auto' }}/>
                            }
                            <h3 className='text-md mt-4'>
                              {data.shortDescription}
                              
                              <p></p>
                              
                              <Link  href={`/projects/${data.name}`}><div style={{textDecoration: "underline","cursor":"pointer"}}>{"Click to Learn More 📖"}</div></Link>
                        
                            </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                  )})}

                </div>

                }
                

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
        </div>
    </div>
  )
}

export default Index;