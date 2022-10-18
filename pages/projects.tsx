
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Header from '../components/header'

import Footer from '../components/footer'

import cookies from "cookie"
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import { getCookies, getCookie, setCookies, removeCookies } from 'cookies-next';

import * as jsonwebtoken from "jsonwebtoken";
import { useState } from 'react'

import {PrismaClient, Prisma, Projects} from "@prisma/client"


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
  console.log(context.req.headers.cookies);

  const parsedCookies = cookies.parse(context.req.headers.cookie?context.req.headers.cookie:"");
  console.log(parsedCookies);
  console.log("token:")
  const token = parsedCookies.token;

  console.log(parsedCookies.token)
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
  console.log(projects)
 
  //console.log(projects)
  return {
    props: 
      {
        auth: authenticated,
        projects:JSON.parse(JSON.stringify(projects)),
      },
  }
}

const Index: React.FC<props> = props => {

  const [projectsPage, setProjectPage] = useState(0);

  const [showForwardButton, setShowForwardButton] = useState(props.projects.length > 5 );
  const [showBackButton, setShowBackButton] = useState(false);

  console.log(props.projects)
  
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
      console.log("POG")
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
    console.log(logProject)
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
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
        <Header/>
       
        <div className={styles.maincotainer}>
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
            <h1 style={{fontSize:"300%"}}>～Projects (Page: {projectsPage+1})～</h1>

            <p></p>
              {props.projects.slice(projectsPage*5, (props.projects.length > (projectsPage+1)*5 )?((projectsPage+1)*5):props.projects.length).map((data:any) =>
              {
                return (<div>
                    <h2>
                      <a style={{textDecoration: "underline"}} target={"_blank"} href={`/api/projects/${data.githubLink}`}>
                        {data.name}
                      </a>
                    </h2>
                    <div style={{paddingLeft:"20px"}}>
                        { (data.youtube) ?
                        <iframe width="560" height="315" src={data.mediaLink} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>  
                        :
                         <img src={data.mediaLink} width="370" height="315" /> }
                        <h3>
                        {data.shortDescription}
                        <p></p>
                        <a style={{textDecoration: "underline"}} target={"_blank"} href={`https://github.com/jaximus808/${data.githubLink}`}>{"--> Check out the Repo"}</a>
                        <p></p>
                        <a style={{textDecoration: "underline"}} target={"_blank"} href={`/api/projects/${data.name}`}>{"-> Learn More Here"}</a>
                  
                        </h3>
                    </div>
                  </div>
                )})}

                
                <div>
                  <button disabled={!showBackButton} onClick={MovePageBackward}>{"<"}</button>
                  <span style={{marginLeft:"25px"}}></span>
                  <button disabled={!showForwardButton} onClick={MovePageForawrd}>{">"}</button>
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