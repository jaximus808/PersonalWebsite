import type { NextPage } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Header from '../components/header'
import Footer from '../components/footer'
import Background from '../components/backgroundThree'
import { PrismaClient , Prisma} from '@prisma/client'
import { useState,useEffect, useRef,Suspense  } from 'react'
import prisma from '../lib/prisma'
import cookies from "cookie"

import Youtube from "react-youtube"
function YoutubeVideo(props:any)
{
  function _onReady(event:any) {
    event.target.pauseVideo();
  }
  const opts = {
    height: "500vw",
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


import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'

type props = 
{
  fail:boolean
  pastProjFav:any,
  recentBlogs:any
}

type frontData = 
{
  fail:boolean
  pastProjFav:any,
  recentBlogs:any
}




// export const getServerSideProps: GetServerSideProps = async (context) =>
// {

//   const prisma = new PrismaClient();
//   let  pastFavoriteProjects:any;
//   try
//   {
//     pastFavoriteProjects = await prisma.projects.findMany({
//       where:
//       {
//         favorite:true
//       }
//     })
  
//   }
//   catch
//   {
//     pastFavoriteProjects = [];
//   }
//   let  recentBlogs:any;
//   try
//   {
//     recentBlogs = await prisma.blog.findMany()

//     if(recentBlogs.length > 4)
//     {

//       recentBlogs.splice(0, recentBlogs.length - 4)
//     }
//     recentBlogs.reverse();

  
//   }
//   catch
//   {
//     recentBlogs = [];
//   }

  

//   return {
//     props:{
//       pastProjFav: JSON.parse(JSON.stringify(pastFavoriteProjects)),
//       recentBlogs: JSON.parse(JSON.stringify(recentBlogs))
//     }
//   }
// }



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
        if(!moved.current && yRef.current > window.innerHeight*0.1 )
        {
            moved.current = true
            window.requestAnimationFrame(hideFixed);
        }
        if(moved.current && yRef.current <=window.innerHeight*0.1 )
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

        <h2 className={`${styles.scrollDownTitle}`} ref={scrollTitle} style={{"fontSize":"2vw","textAlign":"center"}}>v Scroll Down v</h2> 
      </>
    )
}


const Index = (props:props) => {
    async function getInitialData()
    {
      try 
      {
        const res = await fetch('/api/getFrontPageData/', {
          method:"GET",
          headers:
              {
                  'Content-Type': 'application/json',
              },
        })
        const data = await res.json()
        setFrontData(data)
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

    const [frontData, setFrontData] = useState<frontData>({pastProjFav:undefined, recentBlogs:undefined, fail:false }) 
 
  return (
    <div className='text-caviar'>

      <Background/> 
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {}
        <Header/>
        <div className={styles.mainTitleName}>
          <div className='font-tourner' style={{"fontSize":"10vw","textAlign":"center"}}>Jaxon Poentis</div> 
          <ScrollDown/>
        </div>
        <div className={styles.homeMaincotainer}>
          <div className={styles.textContainer}>
            <h1 style={{"fontSize":"300%","textAlign":"center"}}>Aloha 🤙</h1>
            <div className={styles.frontImage}  >
            <Image alt='front picture' src="/Frontimage2.jpg" fill style={{"borderRadius":"0.5rem"}}/>
            </div>
            
            <h2 className='text-2xl mt-5' style={{"textAlign":"center"}}>My name is Jaxon Poentis and I am born and raised from Hawaii! I am a self-taught programmer and enjoy creating many different types of projects from Website-Devolpment, Machine Learning, Networking, and Game Devolpment! I am currently attending <span className='font-bold'>Washington University in St. Lious of class 2027</span> 🧸 studying Computer Science and Business! </h2>
            <h3 style={{"textAlign":"center"}}> </h3>
          </div>
          
          <div className={styles.textContainer} style={{"textAlign":"center"}}>
            
            <Link href={'/blogs'}><h1 style={{"fontSize":"250%","textAlign":"center", "textDecoration":"underline", "cursor":"pointer"}}>Recent Blogs 💡</h1></Link>
              
            {(frontData.recentBlogs) ?
            (frontData.recentBlogs.length == 0) ? 
                  
            <h3 style={{ "textAlign":"center",fontSize:"2vw"}}>Sorry blogs could not be loaded, try again!</h3>
            :
            frontData.recentBlogs.map((data:any) =>
            {
                return (
                    <div key={data.id} onClick={()=>
                    {
                      window.location.href= `/blogs/${data.id}`
                    }}  className={`${styles.blogContainerText} rounded-md cursor-pointer`} style={{ "textAlign":"center",}} >
                        <h2 >
                            <div className={`${styles.specialLink} font-caviar` } style={{ "cursor":"pointer",overflowWrap: "break-word",fontSize:"2.5vw",textDecoration: "underline"}}>{data.title}</div>
                        
                        </h2>
                        <div >
                            
                            <h3 style={{fontSize:"1.5vw",'overflow':'hidden',WebkitLineClamp:4, WebkitBoxOrient:"vertical",display:"-webkit-box"}}>
                            {data.content}
                            </h3>
                            <p></p>

                            
                            <p></p>
                            <Link style={{fontSize:"1.5vw",textDecoration: "underline"}} href={`/blogs/${data.id}`}><div style={{textDecoration: "underline", 'cursor':'pointer'}}>{"Click to Read More 📖"}</div></Link>
                    
                        </div>
                    </div>
                )}):<h3 className='text-center text-3xl'>Loading...</h3>}
          
          </div>
             


          <div className={styles.textContainer}>
          <Link href={'/projects'}><h1 style={{"fontSize":"250%","textAlign":"center", "textDecoration":"underline", "cursor":"pointer"}}>My Favorite Projects 🧑‍💻</h1></Link>
          {
          (frontData.pastProjFav) ? ((frontData.pastProjFav.length > 0 ) ? frontData.pastProjFav.map((data:any) =>
              {
                return (
                
                  <div key={data.id} onClick={()=>
                    {
                      window.location.href= `/projects/${data.name}`
                    }} className='cursor-pointer' >
                  
                    <div    className={`${styles.projectContainerText} rounded-xl`}style={{"textAlign":"center"}}>
                      <h2>
                          
                          <div className='text-3xl font-italic' style={{overflowWrap: "break-word","cursor":"pointer",textDecoration: "underline",}}>{data.name}</div>
                        
                      </h2>
                      <div className='mt-2'>
                          { (data.youtube) ?
                            <Suspense fallback={<h3>loading</h3>}>
                              <YoutubeVideo vId={data.mediaLink}/>
                            </Suspense>
                          :
                          
                          <Image alt='media picture' src={data.mediaLink} className='relative left-1/2 translate-x-[-50%]' width={700} height={500} />}
                          <h3 className='text-xl'>
                            {data.shortDescription}
                            
                            <p></p>
                            <Link  href={`/projects/${data.name}`}><div style={{textDecoration: "underline","cursor":"pointer"}}>{"Click to Learn More 📖"}</div></Link>
                      
                          </h3>
                      </div>
                    </div>
                  </div>
                )}):<h3 className='text-center text-3xl'>Sorry Projects Could Not Be Loaded, Try Again!</h3>):<h3 className='text-center text-3xl' >Loading...</h3>} 

              </div>
              
            <Footer authSense={false} authenticated={false}/>

        </div>
    </div>
  )
}


export default Index