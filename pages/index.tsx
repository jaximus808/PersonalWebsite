import type { NextPage } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Header from '../components/header'
import Footer from '../components/footer'
import Background from '../components/backgroundThree'
import { PrismaClient, Prisma } from '@prisma/client'
import { useState, useEffect, useRef, Suspense } from 'react'
import prisma from '../lib/prisma'
import cookies from "cookie"


import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import Youtube from "react-youtube"
import GradientBG from '../components/gradientbg'
function YoutubeVideo(props: any) {
  function _onReady(event: any) {
    event.target.pauseVideo();
  }
  const opts = {
    height: "100%",
    width: "75%",
    playerVars: {
      autoplay: 1,
    },
  };

  return (
    <div className={`${styles.centerRelX} ${props.className}`} >
      <Youtube className='relative left-1/2 translate-x-[-37%]' style={{ width: '100%', height: '100%' }} videoId={props.vId}
        opts={opts} onReady={_onReady} />
    </div>
  );

}



type props =
  {
    fail: boolean
    pastProjFav: any,
    recentBlogs: any
  }

type frontData =
  {
    fail: boolean
    pastProjFav: any,
    recentBlogs: any
  }






function ScrollDown(props: any) {


  const yRef = useRef(0);
  const moved = useRef(false)
  const scrollTitle: any = useRef(null);
  const scrollbar: any = useRef(null);


  const showFixed = () => {
    if (scrollTitle.current == null) return
    scrollTitle.current.style.top = "0";
    scrollbar.current.style.top = "0"
    scrollbar.current.style.opacity = "1"
    scrollTitle.current.style.color = "rgba(255,255,255,1)"
  }

  const hideFixed = () => {

    if (scrollTitle.current == null) return
    scrollTitle.current.style.color = "rgba(255,255,255,0)"
    scrollTitle.current.style.top = "50%";
    scrollbar.current.style.top = "50%";
    scrollbar.current.style.opacity = "0"
  }
  const handleScroll = () => {
    const y = window.pageYOffset;
    yRef.current = y;
    if (!moved.current && yRef.current > window.innerHeight * 0.1) {
      moved.current = true
      window.requestAnimationFrame(hideFixed);
    }
    if (moved.current && yRef.current <= window.innerHeight * 0.1) {

      moved.current = false
      window.requestAnimationFrame(showFixed);
    }
  }

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)

    const y = window.pageYOffset;
    yRef.current = y;
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }

  })
  return (
    <>

      {/* <h2 className={`${styles.scrollDownTitle} transition-duration-5 lg:text-[2vw] text-2xl text-center font-thin`} ref={scrollTitle} >- scroll down -</h2> */}
      <div ref={scrollbar} className={`mt-4 ${styles.scrollBarTitle} flex flex-row justify-center items-center gap-8 w-[25rem] md:w-1/2 text-center p-4  lg:text-[2vw] text-2xl underline font-thin ${styles.centerRelX}`}>

        <a href='#whoIam' className='hover:text-blue-300 duration-300'>Me</a>
        <a href='#path' className='hover:text-blue-300 duration-300'>Path</a>
        {/* <a href='#projects' className='hover:text-blue-300 duration-300'>Projects</a>
        <a href='#blogs' className='hover:text-blue-300 duration-300'>Blog</a> */}

      </div>
    </>
  )
}


const Index = (props: props) => {
  async function getInitialData() {
    try {
      const res = await fetch('/api/getFrontPageData/', {
        method: "GET",
        headers:
        {
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      data.pastProjFav.reverse();
      setFrontData(data)
    }
    catch (e) {
      return { fail: true, pastProjFav: [], recentBlogs: [] }
    }
  }

  useEffect(() => {
    getInitialData();

  }, [])

  const [frontData, setFrontData] = useState<frontData>({ pastProjFav: undefined, recentBlogs: undefined, fail: false })

  return (
    <div className='text-caviar '>
  
      <Background />
      <GradientBG />
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      { }
      <Header />
      <div className={styles.mainTitleName}>
        <div className={styles.centerRel}>
          <div className='text-center md:text-[6vw] text-[80px] px-2 font-thin'  >Jaxon Poentis</div>
          <ScrollDown />
        </div>
      </div>
      <div id='whoIam' className={`${styles.homeMaincotainer} `}>
        <div className={` ${styles.textContainer}   text-white `}>
          <h1 style={{ "textAlign": "center" }} className='text-5xl'></h1>
          <br></br>
          <div className={`grid md:grid-cols-2 w-full h-full py-4 relative left-1/2 translate-x-[-50%] gap-x-12 `}>
            <div className={`${styles.frontImage} mt-2 md:ml-10 md:w-[18vw] md:min-h-[30rem] md:min-w-[21rem] md:h-[32vw] min-w-[250px] min-h-[27rem] w-[20rem] h-[40vw]`}  >
              <Image alt='front picture' src="/aura_pic.jpg" fill style={{ "borderRadius": "0.5rem" }} />
            </div>


            <div className={`w-full flex px-4 md:p-0 mt-4 md:mt-0 `}>
              <div className={`${styles.fadedBg} p-6 rounded-xl md:w-4/5 `}>
                  <h2 className={`${styles.fontNormal}  text-2xl md:text-left text-center`}>Hey, I’m Jaxon 🤙</h2>
              <h2 className={`${styles.fontNormal} font-thin  text-lg mt-5 md:text-left text-center`}>Born and Raised Hawaii, island of O'ahu, I'm currently studying CS + Math at Washington University in St. Louis, with a focus on backend development and robotic systems. </h2>
              <br></br>
              <p className={`${styles.fontNormal} font-thin text-center md:text-left`}>If my webpage is too long, checkout my resume:</p>
              <div className='w-full text-center md:text-left'>
                <Link className='underline text-blue-300 ' href={'./resume'}>📘 Resume</Link>
              </div>

              <br></br>
              <h1 className={`${styles.fontNormal} text-2xl md:text-left text-center`}>
                Connect With Me 👋
              </h1>

                <div className="mt-8 pb-8 mx-auto w-full md:w-auto">
                <ul className="space-y-4 md:text-left text-center underline">
                  <li className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-3">
                    <Image
                    src="/LinkedIn_icon.png"
                    alt="LinkedIn"
                    width={24}
                    height={24}
                    className="object-contain"
                    />
                    <Link className="underline" href={'https://www.linkedin.com/in/jaxon-poentis'}>LinkedIn</Link>
                  </div>
                  </li>

                  <li className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-3">
                    <Image
                    src="/youlogo.png"
                    alt="YouTube"
                    width={24}
                    height={24}
                    className="object-contain"
                    />
                    <Link className="underline" href={'https://www.linkedin.com/in/jaxon-poentis'}>Youtube</Link>
                  </div>
                  </li>

                  <li className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-3">
                    <Image
                    src="/githublogo.png"
                    alt="GitHub"
                    width={24}
                    height={24}
                    className="rounded-full object-contain"
                    />
                    <Link className="underline" href={'https://www.linkedin.com/in/jaxon-poentis'}>Github</Link>
                  </div>
                  </li>
                </ul>
                </div>
              </div>
            </div>

            <div id='path'></div>

          </div>
          <div className={`md:text-left text-center pt-4 mt-16  ${styles.textContainer} s   `}>
            <h1 className={`${styles.fontNormal } font-thin`} style={{ "fontSize": "300%", "textAlign": "center" }}>My Path
              {/* <span className={`${styles.fontNormal} font-light`}>{`  |  `}</span> */}

              <br></br>
              <div className=''>
                <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-2 '>

                </div>
              </div>


            </h1>
            <div className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-16 w-[70%]  ${styles.centerRelX}`}>
           <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>

                <div className='flex items-center'>
                  <div className={`${styles.journeyImage} h-[9rem] w-[7rem] md:h-[9rem] md:w-[7rem] `}  >
                    <Image alt='front picture' src="/teslalogo.png" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>
                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>Tesla</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>Incoming Software Engineering Intern</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>Fremont, CA</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>01/2026-05/2026</i></h1>
                  
                  <br></br>
                  <p> Joining Tesla's Digital Experience Org as a backend Software Engineering Intern.</p>


                </div>
                
              </div>
            </div>
            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-8 border-x-2 rounded-b-xl'>

              </div>
            </div>
            <div className=''>
              <div className='w-1/2 border-r-2 border-white h-8'>

              </div>
            </div>
            <div className='text-center text-xl p-4'><i>2026</i></div>
            <div className=''>
              <div className='w-1/2 border-r-2 border-white h-8'>

              </div>
            </div>
            <div className=''>
              <div className=' relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-8 border-x-2 rounded-t-xl'>

              </div>
            </div>
            <div className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-4 w-[70%]  ${styles.centerRelX}`}>
           <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>

                <div className='flex items-center'>
                  <div className={`${styles.journeyImage} h-[9rem] w-[9rem] md:h-[9rem] md:w-[9rem] `}  >
                    <Image alt='front picture' src="/washulogo.png" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>
                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>Mckelvey Engineering</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>System Software Teaching Assistant</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>St. Louis, MO</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>08/2025-Present</i></h1>
                  <br></br>
                  <p> Assist Students in x86 Assembly reading, C code, and memory concepts.  </p>


                </div>
                
              </div>
              <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>

                <div className='flex items-center'>
                  <div className={`${styles.journeyImage} h-[12rem] w-[12rem] md:h-[10rem] md:w-[10rem] `}  >
                    <Image alt='front picture' src="/spectrum.png" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>
                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>Spectrum</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>Software Engineering Intern</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>St. Louis, MO</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>05/2025 - 08/2025</i></h1>
                  <br></br>
                  <p>Software Engineering Intern in Service Delivery Team. Worked on Cloud Backend Controllers in Salesforce Java</p>


                </div>
              </div>

              <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>

                <div className='flex items-center'>
                  <div className={`${styles.journeyImage} h-[10rem] w-[10rem] md:h-[8rem] md:w-[8rem] `}  >
                    <Image alt='front picture' src="/devstac.jpg" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>
                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>WashU IT - Devstac</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>Software Engineer</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>St. Louis, MO</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>04/2025 - Present</i></h1>
                  <br></br>
                  <p>Building full-stack software for internal and external clients ranging from web-apps to mobile-apps</p>


                </div>
              </div>
              <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>

                <div className='flex items-center'>
                  <div className={`${styles.journeyImage} h-[9rem] w-[14rem] md:h-[7rem] md:w-[12rem] `}  >
                    <Image alt='front picture' src="/palantir.png" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>
                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>Palantir</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>Palantir Launch</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>Washington, DC</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>03/2025</i></h1>
                  <br></br>
                  <p>Selected as a Palantir Launcher to visit their DC office and learn more about the company. </p>


                </div>
                
              </div>
              
              
            </div>
            
            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-8 border-x-2 rounded-b-xl'>

              </div>
            </div>
            <div className=''>
              <div className='w-1/2 border-r-2 border-white h-8'>

              </div>
            </div>
            <div className='text-center text-xl p-4'><i>2025</i></div>
            <div className=''>
              <div className='w-1/2 border-r-2 border-white h-8'>

              </div>
            </div>
            <div className=''>
              <div className=' relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-8 border-x-2 rounded-t-xl'>

              </div>
            </div>
            <div className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-4 w-[70%]  ${styles.centerRelX}`}>
           
              <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>
                <div className='flex items-center'>
                   <div className={`${styles.journeyImage} h-[10rem] w-[12rem] md:h-[8rem] md:w-[10rem]  `}  >
                    <Image alt='front picture' src="/healthxr.png" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>
               

                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>Health XR</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>Founding Software Engineer</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>St. Louis, MO</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>09/2024 - 01/2025</i></h1>
                  <br></br>
                  <p>Developed the first prototype of Meta Quest XR Healthcare assistant within Unity + C#, winning #1 at St. Louis startup tech week.</p>


                </div>
              </div>

              <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>

                <div className='flex items-center'>
                  <div className={`${styles.journeyImage} h-[10rem] w-[14rem] md:h-[8rem] md:w-[11rem] `}  >
                    <Image alt='front picture' src="/flashcardify.png" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>

                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>Flashcardify.ai</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>Software Engineering Intern</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>St. Louis, MO</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>09/2024 - 01/2025</i></h1>
                  <br></br>
                  <p>Built-out backend infrastructure for flashcard decks with Node.js and Supabase </p>


                </div>
              </div>
              <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>

                <div className='flex items-center'>
                  <div className={`${styles.journeyImage} h-[9rem] w-[9rem] md:h-[9rem] md:w-[9rem] `}  >
                    <Image alt='front picture' src="/washulogo.png" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>
                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>Mckelvey Engineering</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>Data Structures and Algorithms Teaching Assistant</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>St. Louis, MO</i></h1>
                  <h1 className={`text-md ${styles.dateRangeTex}`}><i>01/2025-12/2025</i></h1>
                  <br></br>
                  <p> Assisted students in developing data structures, implementation of algorithms, and runtime analysis.  </p>


                </div>
                
              </div>
            </div>

            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-8 border-x-2 rounded-b-xl'>

              </div>
            </div>
            
            <div className=''>
              <div className='w-1/2 border-r-2 border-white h-8'>

              </div>
            </div>
            <div className='text-center text-xl p-4'><i>2024</i></div>
            <div className=''>
              <div className='w-1/2 border-r-2 border-white h-8'>

              </div>
            </div>
            <div className=''>
              <div className=' relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-8 border-x-2 rounded-t-xl'>

              </div>
            </div>
            <div className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-4 w-[70%]  ${styles.centerRelX}`}>

              <div className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}>

                <div className='flex items-center'>
                  <div className={`${styles.journeyImage} h-[10rem] w-[10rem] md:h-[8rem] md:w-[8rem] `}  >
                    <Image alt='front picture' src="/fiverrlogo.jpg" fill style={{ "borderRadius": "0.5rem" }} />
                  </div>
                </div>

                <div className='col-span-2 mt-2 '>
                  <h1 className={'text-3xl'}><strong>Fiverr</strong></h1>
                  <h1 className={`text-xl ${styles.titleTex}`}><i>Freelance Software Developer</i></h1>
                  <h1 className={`text-lg ${styles.dateRangeTex}`}><i>03/2023 - 09/2023</i></h1>
                  <br></br>
                  Earned over $1000 through my gig of creating full stack web browser games with Node.js, Socket.io, React, + more.


                </div>
              </div>
            </div>
            

            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-8 border-x-2 rounded-b-xl'>

              </div>
            </div>

            <div className=''>
              <div className='w-1/2 border-r-2 border-white h-16'>

              </div>
            </div>
            <div className='text-center text-xl p-4'><i>2023</i></div>
            <div className=''>
              <div className='w-1/2 border-r-2 border-white h-16'>

              </div>
            </div>

            <div className={`${styles.fadedBg} rounded-xl p-8 mt-4 w-2/3 text-center relative left-1/2 translate-x-[-50%]`}>
              <h1 className={'text-3xl'}><strong>A Lifelong Journey of Learning</strong></h1>
              <h1 className={`text-xl ${styles.titleTex}`}><i>Aspiring Software Engineer</i></h1>
              <h1 className={`text-lg ${styles.dateRangeTex}`}><i>2019 - Present</i></h1>
              <br></br>
              <p className='w-4/5 mx-auto'>
                What began as a simple curiosity for making a video game during the Covid-19 pandemic has ignited my passion for all things software, and a lifelong drive to keep learning and building.
              </p>

            </div>

            <div className=''>
              <div className='mt-2 w-1/2 border-r-2 border-white h-16'>

              </div>
            </div>
            <div className=''>
              <div className='relative left-1/2 w-16 translate-x-[-50%] h-16 border-2 border-white rounded-full'>
                <div className='relative left-1/2 top-1/2 w-16 translate-x-[-50%] translate-y-[-50%] text-center'>
                  🌺
                </div>
              </div>
            </div>
          </div>
          <br></br>


          {/* <div className={`${styles.textContainer} ${styles.projectGradientBackground} py-4  text-white `}>

            <Link href={'/projects'}><h1 style={{ "fontSize": "250%", "textAlign": "center", "cursor": "pointer" }}><strong className='hover:text-[#a3cbff] duration-200'>My Favorite Projects 🧑‍💻</strong></h1></Link>

            {
              (frontData.pastProjFav) ? ((frontData.pastProjFav.length > 0) ?
                <div className='grid md:grid-cols-1 lg:grid-cols-2 mt-4 gap-16 p-4'>
                  {frontData.pastProjFav.map((data: any) => {

                    return (
                      <div key={data.id} className=''>
                        <div   >

                          <div onClick={() => {
                            window.location.href = `/projects/${data.name}`
                          }} className={`${styles.projectContainerText} ${styles.gradent}  rounded-xl bg-[#171717] cursor-pointer`} style={{ "textAlign": "center" }}>
                            <h2>

                              <div className='text-2xl font-bold font-italic' style={{ overflowWrap: "break-word", "cursor": "pointer", textDecoration: "", }}>{data.name.replace(/_/g, " ")}</div>

                            </h2>
                            <div className='mt-4'>
                              {(data.youtube) ?
                                <div className={` ${styles.journeyImage} md:w-full  `}>

                                  <Suspense fallback={<h3>loading</h3>}>

                                    <YoutubeVideo className={'h-52 sm:h-72'} vId={data.mediaLink} />
                                  </Suspense>
                                </div>
                                :
                                <div className={`${styles.journeyImage} w-[15rem] sm:w-96 h-36 sm:h-72`}  >
                                  <Image alt='front picture' src={data.mediaLink} fill style={{ "borderRadius": "0.5rem" }} />
                                </div>
                                // <Image alt='media picture' src={data.mediaLink} className='relative left-1/2 translate-x-[-50%]' width={0} height={0} style={{ width: '100%', height: 'auto' }}/>
                              }
                              <h3 className='text-md mt-4'>
                                {data.shortDescription}

                                <p></p>

                                <Link href={`/projects/${data.name}`}><div style={{ textDecoration: "underline", "cursor": "pointer" }}>{"Click to Learn More 📖"}</div></Link>

                              </h3>
                            </div>
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div> : <h3 className='text-center text-3xl'>Sorry Projects Could Not Be Loaded, Try Again!</h3>) : <h3 className='text-center text-3xl' >Loading...</h3>}

            <div id='blogs'></div>
          </div>
        </div>

        <div className={`${styles.textContainer} py-4  bg-[#0a0a0a] text-white`} style={{ "textAlign": "center" }}>

          <Link href={'/blog'}><h1 style={{ "fontWeight": "400", "fontSize": "250%", "textAlign": "center", "cursor": "pointer" }}><strong className='hover:text-[#a3cbff] duration-200 '>💡 Recent Blogs 💡</strong></h1></Link>

          {(frontData.recentBlogs) ?
            (frontData.recentBlogs.length == 0) ?

              <h3 style={{ "textAlign": "center", fontSize: "2vw" }}>Sorry blogs could not be loaded, try again!</h3>
              :
              frontData.recentBlogs.map((data: any) => {
                return (
                  <div key={data.id} onClick={() => {
                    window.location.href = `/blogs/${data.id}`
                  }} className={` ${styles.gradent2} bg-[#242424] hover:bg-[#292929] pt-4 pb-8 px-8 mt-4  w-4/5 relative left-1/2 translate-x-[-50%] rounded-md cursor-pointer duration-200`} style={{ "textAlign": "left", }} >
                    <h2 >
                      <div className={`text-2xl font-semibold font-caviar`} style={{ "cursor": "pointer", overflowWrap: "break-word" }}>{data.title}</div>

                    </h2>
                    <div >
                      <h3 className='text-xl font-light' style={{ 'overflow': 'hidden', WebkitLineClamp: 6, WebkitBoxOrient: "vertical", display: "-webkit-box" }}>
                        <i>{new Date(data.datePosted).toLocaleDateString()}
                        </i>
                      </h3>
                      <br></br>
                      <h3 className='font-light text-lg' style={{ 'overflow': 'hidden', WebkitLineClamp: 6, WebkitBoxOrient: "vertical", display: "-webkit-box" }}>
                        {data.content.split("*").map((data: any, key: any) => {

                          if (data.length == 0) return ""
                          if (data.length >= 3 && data.substring(0, 3) == "<i>") {
                            return ""
                          }
                          else if (data.length >= 3 && data.substring(0, 3) == "<b>") {
                            return data.substring(3)
                          }
                          else {
                            return data
                          }
                        })}
                      </h3>

                      <br></br>
                      <Link className='text-lg' style={{ textDecoration: "underline" }} href={`/blogs/${data.id}`}><div style={{ textDecoration: "underline", 'cursor': 'pointer' }}>{"Click to Read More 📖"}</div></Link>

                    </div>
                  </div>
                )
              }) : <h3 className='text-center text-3xl'>Loading...</h3>} */}

        </div>





        <Footer authSense={false} authenticated={false} />
      </div>

    </div>
  )
}


export default Index
