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


import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import Youtube from "react-youtube"
function YoutubeVideo(props:any)
{
  function _onReady(event:any) {
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
      <Youtube className='relative left-1/2 translate-x-[-37%]' style={{width:'100%', height:'100%'}} videoId={props.vId} 
          opts={opts} onReady={_onReady} />
    </div>
  );
  
}



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






function ScrollDown(props:any)
{

    
    const yRef = useRef(0);
    const moved = useRef(false)
    const scrollTitle:any = useRef(null);
    const scrollbar:any = useRef(null);


    const showFixed =() =>
    {
      if(scrollTitle.current == null) return
      scrollTitle.current.style.top = "0";
      scrollbar.current.style.top = "0"
      scrollbar.current.style.opacity = "1"
      scrollTitle.current.style.color ="rgba(255,255,255,1)"
    }

    const hideFixed =() =>
    {

      if(scrollTitle.current == null) return
      scrollTitle.current.style.color ="rgba(255,255,255,0)"
        scrollTitle.current.style.top = "50%";
        scrollbar.current.style.top = "50%";
      scrollbar.current.style.opacity = "0"
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

        <h2 className={`${styles.scrollDownTitle} lg:text-[2vw] text-2xl text-center font-semibold`} ref={scrollTitle} >v Scroll Down v</h2> 
        <div  ref={scrollbar} className={`mt-4 ${styles.scrollBarTitle} flex flex-row justify-center items-center gap-8 w-[25rem] md:w-1/2 text-center p-4 rounded-full bg-[#1f2126]  lg:text-[2vw] text-2xl underline font-bold ${styles.centerRelX}`}>

          <a href='#whoIam' className='hover:text-blue-300 duration-300'>Me</a>
          <a href='#path' className='hover:text-blue-300 duration-300'>Path</a>
          <a href='#projects' className='hover:text-blue-300 duration-300'>Projects</a>
          <a href='#blogs' className='hover:text-blue-300 duration-300'>Blog</a>

        </div>
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
        data.pastProjFav.reverse();
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
    <div className='text-caviar '>

      <Background/> 
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {}
        <Header/>
        <div className={styles.mainTitleName}>
          <div className={styles.centerRel}>
            <div className='font-tourner text-center md:text-[10vw] text-[80px] px-2'  >Jaxon Poentis</div> 
            <ScrollDown/>
          </div>
        </div>
        <div id='whoIam' className={`${styles.homeMaincotainer} `}>
          <div  className={` ${styles.textContainer} bg-white text-black pt-4   border-t-[1rem] border-[#f2f2f2]`}>
            <h1 style={{"textAlign":"center"}} className='text-5xl'><strong>Aloha 🤙 </strong> </h1>
            <br></br>
            <div className='grid md:grid-cols-2 w-full h-full py-4 relative left-1/2 translate-x-[-50%] gap-x-24'>
              <div className={`${styles.frontImage} md:ml-10 md:w-[30vw] md:min-h-[28rem] md:min-w-[24rem] md:h-[35vw] min-w-[250px] min-h-[300px] w-[20vw] h-[40vw]`}  >
                <img  className='w-full h-full' alt='front picture' src="/swag_f.jpg"  style={{"borderRadius":"0.5rem"}}/>
              </div>

            
              <div className='w-full md:w-4/5 px-4 md:px-0 '>
                <br></br>
                <h2 className={`${styles.fontNormal}  font-meduim text-xl mt-5 md:text-left text-center` }><span>I'm Jaxon,</span> I am born and raised from Hawaii! I am a self-taught programmer and now studying CS + Math at WashU. I like building cool projects with a focus on impact ⚒️  </h2>
                <br></br>
                <p className=' text-center md:text-left'>If my webpage is too long, checkout my resume:</p>
                <div className='w-full text-center md:text-left'>
                  <Link className='underline text-blue-500 ' href={'./resume'}>📘 Resume</Link>
                </div>

                <br></br>
                <h1 className='text-3xl md:text-left text-center'>
                  <strong> Connect With Me 👋</strong>
                </h1>
              <br></br>
              <div className=' mt-8 grid grid-cols-3 w-4/5 md:w-full relative left-1/2 translate-x-[-50%] gap-y-8'>
                              
                <div>
                  <div style={{marginBottom: "20px"}} className='relative left-1/2 md:left-0 translate-x-[-25%] md:translate-x-[0] ' >
                    
                      <a rel="noreferrer" target={"_blank"}href='https://www.linkedin.com/in/jaxon-poentis/'>
                      <img  className={styles.gmailLogo} src='/linkdinLogo.png'/>
                      </a>
                    </div>
                  </div>
                  <div>
                    
                    
                  <div   style={{marginBottom: "20px"}} className='relative mt-2 left-1/2 md:left-0 md:translate-x-[0] ' >
                    
                      <a rel="noreferrer" target={"_blank"}href='https://www.youtube.com/@jaxonpoentis'> 
                      <img  className={`${styles.normallogo} ` } src='/youlogo.png'/>
                      </a>
                    </div>
                  </div>
                  <div>
                    
                    
                  <div   style={{marginBottom: "20px"}} className='relative left-1/2 md:left-0 md:translate-x-[0] ' >
                    
                      <a rel="noreferrer" target={"_blank"}href='https://github.com/jaximus808'> 
                      <img  className={`${styles.normallogo} rounded-full` } src='/githublogo.png'/>
                      </a>
                    </div>
                  </div>
                </div>
                {/* I am currently attending <span className='font-bold'>Washington University in St. Louis</span> 🧸 studying Computer Science and Business!  */}
               
                <br></br>
            </div>
            
            <div id='path'></div>
           
          </div>
          <div  className={`lg:text-left text-center py-4 ${styles.textContainer} text-black  bg-[#faf7f5]`}>
            <h1  style={{"fontSize":"300%","textAlign":"center"}}><strong>My Path </strong>
            {/* <span className={`${styles.fontNormal} font-light`}>{`  |  `}</span> */}
            
            <br></br>
            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-black h-2 '>
                
              </div>
            </div>

           
            <span className={`${styles.fontNormal} text-2xl font-extralight`}><i>{`   ${new Date().toLocaleDateString()}`}</i></span>
            </h1>

            <div className={`grid lg:grid-cols-4 gap-4 gap-y-16 mt-16 w-[90%] ${styles.centerRelX}`}>
            
              
            <div className={`${styles.journeyImage} h-[30vw] w-[35%] lg:h-[15vw] lg:w-[70%]`}  >
                <Image alt='front picture' src="/spectrum.png" fill style={{"borderRadius":"0.5rem"}}/>
              </div>

              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>Spectrum (Charter Comm.)</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Incoming SWE intern</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>May - August</i></h1>
                <br></br> 
                <p> Incoming SWE intern in Spectrum's St. Louis office :)</p>
                <br></br>
                <p> Working on CI/CD pipelines</p>
             
               
              </div>

            <div className={`${styles.journeyImage} w-[70%] h-[40vw] lg:h-[15vw] lg:w-[90%]`}  >
                <Image alt='front picture' src="/brookings.jpg" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>Washington University in St. Louis</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Working Towards BS CS + Math | Business </i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>January - Present</i></h1>
      
                <p className='mt-2'><span className='underline font-bold'>Spring Semester:</span> CS class gameplay 🤓 </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Notable classes + more info</summary>
                  <ul className='list-disc'>
                    <li>System Software</li>
                    <li>OOP Lab (C++)</li>
                    <li>Parallel and Concurrent Programming</li>
                    <li>Digital Logic and Computer Design</li>
                    <li>Graph Theory</li>
                  </ul>

                  <p className='mt-4'>Some fun stuff I do:</p>
                  <ul className='list-disc'>
                    <li>LNYF MM</li>
                    <li>VSA</li>
                    <li>CSA dragon warrior</li>
                  </ul>
                </details>
                
              
              </div>

             
              
              <div className={`${styles.journeyImage} h-[30vw] w-[35%] lg:h-[10vw] lg:w-[50%]`}  >
                <Image alt='front picture' src="/robotics.png" fill style={{"borderRadius":"0.5rem"}}/>
              </div>

              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>WU Robotics</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Swarm Team | Software Lead </i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>January - Present</i></h1>
                <br></br> 
                <p><span className='underline font-bold'>Spring Semester:</span> Architected a modular ROS 2/C++ control system—including a custom PID action server and path‐execution logic—to enable coordinated, precise motion across interlocking swarm robots</p>
             
              

              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">Show more:</summary>
                <ul className="mt-2 list-disc ml-5">
                <li>
                  Created a custom PID action server in <b>ROS 2</b> and <b>C++</b> to enable
                  smooth and accurate low-level control of robot actuators for precise
                  movement.
                </li>
                <li>
                  Implemented path execution logic to unfold and dispatch high-level paths
                  into low-level motion commands using a control algorithm layered over the
                  PID server.
                </li>
                  <li>
                    Developed testing action clients in <b>Python</b> to simulate and validate
                    behavior across control and planning layers, enabling full-system debugging
                    and reliability.
                  </li>
                  <li>
                    Led a cross-functional robotics team, coordinating simulation, perception,
                    and control efforts while managing sprint planning and system integration.
                  </li>
                </ul>
              </details>
              </div>
              <div className={`${styles.journeyImage} h-[30vw] w-[60%] lg:h-[10vw] lg:w-[80%]`}  >
                <Image alt='front picture' src="/palantir.png" fill style={{"borderRadius":"0.5rem"}}/>
              </div>

              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>Palantir Launch</strong></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>March</i></h1>
                <p className='mt-2'>Selected as a Palantir Launcher to visit their DC office and learn more about the company</p>
                <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">Some stuff i did:</summary>
                <ul className='list-disc mt-2'>
                  <li>Created a Fullstack using Palantir's Foundry, <strong>React</strong>, and <strong>TypeScript</strong> to convert conversations with client into a Client Landscape</li>
                  <li>The Client landscape would allow users to see who reports to who, their roles, contact, and iterates off previous states, meaning its use scales exponentially. </li>
                  <li>Devloped using Palantir's Ontology, and no convos are stored, given increased privacy.</li>
                </ul>
                <br></br>
              </details>
               
               
          
              </div>

            </div>
            
            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-4 border-black h-8 border-x-4 rounded-b-xl'>
                
              </div>
            </div>
            <div className=''>
              <div className='w-1/2 border-r-4 border-black h-16'>
                
              </div>
            </div>
            <div className='text-center text-xl p-4'><i>2025</i></div>
            <div className=''>
              <div className='w-1/2 border-r-4 border-black h-16'>
                
              </div>
            </div>
            <div className=''>
              <div className=' relative left-1/2 w-1/2 translate-x-[-50%] border-t-4 border-black h-8 border-x-4 rounded-t-xl'>
                
              </div>
            </div>
            <div className={`grid lg:grid-cols-4 gap-4 gap-y-16 mt-16 w-[90%] py-4 ${styles.centerRelX}`}>
            
              <div>
                <div className={`${styles.journeyImage} w-[40%] h-[20vw] lg:h-[11vw] lg:w-[90%]`}  >
                  <Image alt='front picture' src="/metaquest.png" fill style={{"borderRadius":"0.5rem"}}/>
                </div>

                <div className={`${styles.journeyImage} w-[35%] h-[30vw] lg:h-[18vw] lg:w-[90%] mt-4`}  >
                  <Image alt='front picture' src="/GDG.png" fill style={{"borderRadius":"0.5rem"}}/>
                </div>
              </div>
              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>WashU GDG: XR Healthcare</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Software Project Lead</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>September - December</i></h1>
                <p className=''>Led a team of 5 student developers to create an XR Healthcare assistant with Unity C# and data pipelining with python</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">More Info</summary>
                  <ul className='list-disc'>
                    <li>won <strong>1st place</strong> at St. Louis Tech Confluence Demo Day.</li>
                    <li>Built wrist-mounted passthrough toggle in <strong>Unity</strong> and <strong>C#</strong> for MetaQuest to blend XR with real-world view.</li>
                    <li>Added wrist button that sends image and context to ChatGPT API for real-time analysis and feedback.</li>
                    <li>Created floating XR window UI to display simplified AI-generated responses and image insights.</li>
                    <li>Collaborated directly with the client to define feature requirements, iterate on design feedback, and deliver a functional MVP under a 3-month timeline.</li>
                    <li>Integrated FastAPI backend with Unity to handle image uploads and prompt-response flow.</li>
                  </ul>
                </details>
             
              </div>
              <div className={`${styles.journeyImage} w-[70%] h-[40vw] lg:h-[15vw] lg:w-[90%]`}  >
                <Image alt='front picture' src="/brookings.jpg" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              <div className='col-span-1 pb-4'>
                <h1 className={'text-3xl'}><strong>Washington University in St. Louis</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Working Towards BS CS + Math | Business </i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>January - December</i></h1>
                <p className='mt-2'><span className='underline font-bold'>Fall Semester:</span> Computer Science, Business, and Recruitment 💀</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Notable classes:</summary>
                  <ul className='list-disc'>
                  <li>Intro to CE</li>
                  <li>Intro to Data Science</li>
                  <li>Prob and Stats</li>
                  <li>High Foundations of Mathematics</li>
                  <li>Micro Econ & Acct</li>
                  </ul>
                </details>
                <ul className='list-disc'>
                  
                </ul>
                <br></br>
                <p><span className='underline font-bold'>Spring Semester:</span> Breadth of Classes, DS & Algo TA</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Notable classes</summary>
                  <ul className='list-disc'>
                  <li>Rapid Prototype Development and Creative Programming </li>
                  <li>Physics 2</li>
                  <li>MGT 100 (case comp finalist :O)</li>
                  <li>High Foundations of Mathematics</li>
                  </ul>
                </details>
               
              </div>
              
              <div className={`${styles.journeyImage} h-[30vw] w-[35%] lg:h-[10vw] lg:w-[50%]`}  >
                <Image alt='front picture' src="/robotics.png" fill style={{"borderRadius":"0.5rem"}}/>
              </div>

              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>WU Robotics</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Swarm Team | Software Lead </i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>January - December</i></h1>
                <p className='mt-2'><span className='underline font-bold'>Fall Semester:</span> Pivoted robotic project to be an interlocking modular self-assembly swarm robots</p>
                <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">Show more:</summary>
                <ul className='list-disc mt-2'>
                  <li className=''>Designed and implemented a ROS 2 data pipeline for real-time robot position tracking and mapping using overhead camera input, leveraging <strong>Python</strong> and <strong>C++</strong>.</li>
                  <li className=''>Created robot tracking using <strong>HSV filtering</strong> from overhead camera to create publishers of robot orientation.</li>
                </ul>
              </details>
                
                <br></br>
                <p><span className='underline font-bold'>Spring Semester:</span> Simulated Path planning and Exploration</p>
                
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Show more:</summary>
                  <ul className='list-disc mt-2'>
                  <li>Implemented SLAM and Nav2 path finding with simulated robot</li>
                    <li>Developed Active SLAM exploration algorithm with <strong>Python</strong></li>

                  </ul>
                </details>
               
          
              </div>

              <div className={`${styles.journeyImage} h-[30vw] w-[35%] lg:h-[13vw] lg:w-[90%]`}  >
                <Image alt='front picture' src="/flashcardify.png" fill style={{"borderRadius":"0.5rem"}}/>
              </div>

              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>Flashcardify.ai</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Software Engineering Intern</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>September - December</i></h1>
                <p className='mt-2'>A WashU startup focused on bringing the next gen of education using AI</p>
                                
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Some Stuff I Did:</summary>
                  <ul className='list-disc mt-2'>
                  <li>
                    Developed a community-sharing feature for flashcards using <b>Next.js</b> and <b>PostgreSQL</b>, enabling users to share decks via unique links and access public study materials.
                  </li>
                  <li>
                    Integrated keyword-based search with <b>PostgreSQL</b> full-text search and <b>TypeScript</b> to efficiently query public decks.
                  </li>
                  <li>
                    Designed and implemented UX improvements for deck customization, including settings updates, visibility toggles, and deck metadata editing using <b>Supabase</b> as the backend.
                  </li>
                  <li>
                    Presented the project at the WashU Venture Competition, winning <b>Semi-Finalist</b> and <b>People’s Choice Awards</b>.
                  </li>
                  </ul>
                </details>
                
                
          
              </div>
            </div>
            
            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-4 border-black h-8 border-x-4 rounded-b-xl'>
                
              </div>
            </div>
            <div className=''>
              <div className='w-1/2 border-r-4 border-black h-16'>
                
              </div>
            </div>
            <div className='text-center text-xl p-4'><i>2024</i></div>
            <div className=''>
              <div className='w-1/2 border-r-4 border-black h-16'>
                
              </div>
            </div>
            <div className=''>
              <div className=' relative left-1/2 w-1/2 translate-x-[-50%] border-t-4 border-black h-8 border-x-4 rounded-t-xl'>
                
              </div>
            </div>
            <div className={`grid lg:grid-cols-4 gap-4 mt-16 w-[90%] ${styles.centerRelX}  py-4`}>
              
              <div className={`${styles.journeyImage} h-[45vw] lg:h-[15vw] w-[70%] lg:w-[90%]`}  >
                <Image alt='front picture' src="/EagleScoutPic.jpg" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              <div className='lg:col-span-1'>
                <h1 className={'text-3xl'}><strong>Eagle Scout</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Troop 181 | Boy Scouts</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>March</i></h1>
                <p><span className='underline font-bold'>My Experience:</span> My time in Boy Scouts was enjoyable and taught me leadership, camaraderie, and kindness.</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Some more stuff:</summary>
                  <ul className='list-disc mt-2'>
                  <li>My time in Boy Scouts was enjoyable and taught me leadership, camaraderie, and kindness.</li>
                  <li>To achieve the rank of Eagle Scout, I organized a service project to construct six benches for my high school.</li>
                  <li>The project involved around four months of planning and two days of construction, painting, and installation.</li>
                  <li>This experience gave me hands-on leadership practice and an opportunity to give back to my community.</li>
               
                  </ul>
                </details>
               
              </div>
              
              <div className={`${styles.journeyImage} w-[70%] h-[40vw] lg:h-[15vw] lg:w-[90%]`}  >
                <Image alt='front picture' src="/brookings.jpg" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>Washington University in St. Louis</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Working Towards BS CS + Math | Business </i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>August - December</i></h1>
      
                <p className='mt-2'><span className='underline font-bold'>Fall Semester:</span> First Semester in College 🤓 </p>

                <p className='underline mt-2'>Notable classes:</p>
                <ul className='list-disc'>
                  <li>Data Structure and Algorithm</li>
                  <li>Discrete Math</li>
                  <li>Calc III</li>
                </ul>
              </div>
              
              <div className={`${styles.journeyImage} h-[30vw] w-[35%] lg:h-[10vw] lg:w-[50%]`}  >
                <Image alt='front picture' src="/robotics.png" fill style={{"borderRadius":"0.5rem"}}/>
              </div>

              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>WU Robotics</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Swarm Team | Software Team | AI and SLAM</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>September - December</i></h1>
                
                <p className='mt-2'><span className='underline font-bold'>Fall Semester:</span>Worked on ball detection for resource targets symbolized by rubber balls</p>
                

                <ul className='list-disc mt-2'>
                  <li>Built an object recognition AI model using <strong>YOLOv5</strong> and a <strong>custom dataset</strong>.</li>
                  <li>Model detects rubber balls in video feeds.</li>
                </ul>
              </div>
             
              <div className={`${styles.journeyImage} h-[30vw] w-[35%] lg:h-[12vw] lg:w-[55%]`}  >
                <Image alt='front picture' src="/fiverrlogo.jpg" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              
              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>Freelance Browser Game Developer</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Freelancer | Developer</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>March - September</i></h1>
                <p>Earned over $1000 through my gig of creating full stack web browser games with node.js and socket.io</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Some more stuff:</summary>
                  <ul className='list-disc mt-2'>
                  <li>Explored freelancing by offering my skills on Fiverr, creating full-stack browser games.</li>
                  <li>As a freelancer, I was responsible for selling my services and communicating with clients.</li>
                  <li>Worked on a variety of projects, including real-time multiplayer experiences and platformer games.</li>
                  <li>Used tools like p5.js, Node.js, and Socket.io—some of my favorites.</li>
                  </ul>
                </details>
                
              </div>

            </div>
            
            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-4 border-black h-8 border-x-4 rounded-b-xl'>
                
              </div>
            </div>
            
            <div className=''>
              <div className='w-1/2 border-r-4 border-black h-16'>
                
              </div>
            </div>
            <div className='text-center text-xl p-4'><i>2023</i></div>
            <div className=''>
              <div className='w-1/2 border-r-4 border-black h-16'>
                
              </div>
            </div>
            
              <div className='mt-4 w-1/2 text-center relative left-1/2 translate-x-[-50%]'>
                <h1 className={'text-3xl'}><strong>Learning to Code and Build</strong></h1>
                
                <h1 className={'text-xl text-[#04007a]'}><i>2019 - Present</i></h1>
                <br></br>
                <p>
                  My journey in coding started during the year the covid-19 pandemic put the world into lockdown. Instead of just playing video games all day, I decided why not try and create my own. I then installed the game engine Unity, followed a couple of tutorials, and from there I followed a couple of tutorials and fell in love with coding. I began following online lectures, building side projects, and more. It was fascinating figuring out and learning new coding tools from Networking, Web Development, Training AI models, and more! 
                </p>
                <br>
                </br>
                <p>
                  Learning new exciting tools and focusing on growing as a person has became, and still is, a fundemental core of my character, and my mindset to this day.
                </p>
                
              </div>
              
              <div className=''>
                <div className='mt-4 w-1/2 border-r-4 border-black h-16'>
                  
                </div>
              </div>
              <div className=''>
                <div className='relative left-1/2 w-16 translate-x-[-50%] h-16 border-4 border-black rounded-full'>
                  <div className='relative left-1/2 top-1/2 w-16 translate-x-[-50%] translate-y-[-50%] text-center'>
                  🌺
                  </div>
                </div>
              </div>
          </div>
          <div className={`${styles.textContainer} py-4  text-center bg-[#020202] text-white `}>
            
            <br></br>
            <h1 className='text-2xl'>
              <strong><i>Life is movement. Once you stop moving, you're dead. Choose life.</i></strong>
            </h1>
            <h1 id='projects'>
              <i>Eugen Sandow</i>
            </h1>
          </div>


          <div  className={`${styles.textContainer} ${styles.projectGradientBackground} py-4  text-white `}>
          
          <Link href={'/projects'}><h1 style={{"fontSize":"250%","textAlign":"center", "cursor":"pointer"}}><strong className='hover:text-[#a3cbff] duration-200'>My Favorite Projects 🧑‍💻</strong></h1></Link>
          
          {
          (frontData.pastProjFav) ? ((frontData.pastProjFav.length > 0 ) ? 
          <div className='grid md:grid-cols-1 lg:grid-cols-2 mt-4 gap-16 p-4'>
          {frontData.pastProjFav.map((data:any) =>
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
                               <div className={` ${styles.journeyImage} md:w-full  `}>
                              
                               <Suspense fallback={<h3>loading</h3>}>
 
                                 <YoutubeVideo className={'h-52 sm:h-72'}  vId={data.mediaLink}/>
                               </Suspense>
                               </div>
                            :
                            <div className={`${styles.journeyImage} w-[15rem] sm:w-96 h-36 sm:h-72`}  >
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
                </div>:<h3 className='text-center text-3xl'>Sorry Projects Could Not Be Loaded, Try Again!</h3>):<h3 className='text-center text-3xl' >Loading...</h3>} 

                <div id='blogs'></div>
              </div>
          </div>

          <div className={`${styles.textContainer} py-4  bg-[#0a0a0a] text-white`} style={{"textAlign":"center"}}>
            
            <Link href={'/blog'}><h1 style={{ "fontWeight":"400","fontSize":"250%","textAlign":"center", "cursor":"pointer"}}><strong className='hover:text-[#a3cbff] duration-200 '>💡 Recent Blogs 💡</strong></h1></Link>
              
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
                    }}  className={` ${styles.gradent2} bg-[#242424] hover:bg-[#292929] pt-4 pb-8 px-8 mt-4  w-4/5 relative left-1/2 translate-x-[-50%] rounded-md cursor-pointer duration-200`} style={{ "textAlign":"left",}} >
                        <h2 >
                            <div className={`text-2xl font-semibold font-caviar` } style={{ "cursor":"pointer",overflowWrap: "break-word"}}>{data.title}</div>
                        
                        </h2>
                        <div >
                          <h3 className='text-xl font-light' style={{'overflow':'hidden',WebkitLineClamp:6, WebkitBoxOrient:"vertical",display:"-webkit-box"}}>
                            <i>{new Date(data.datePosted).toLocaleDateString()}
                            </i>
                            </h3>
                            <br></br>
                            <h3 className='font-light text-lg' style={{'overflow':'hidden',WebkitLineClamp:6, WebkitBoxOrient:"vertical",display:"-webkit-box"}}>
                            {data.content.split("*").map((data:any, key:any) =>{
                        
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
                                })}
                            </h3>

                            <br></br>
                            <Link className='text-lg' style={{textDecoration: "underline"}} href={`/blogs/${data.id}`}><div style={{textDecoration: "underline", 'cursor':'pointer'}}>{"Click to Read More 📖"}</div></Link>
                    
                        </div>
                    </div>
                )}):<h3 className='text-center text-3xl'>Loading...</h3>}
          
          </div>
          
             

              

              <Footer authSense={false} authenticated={false}/>
        </div>

    </div>
  )
}


export default Index