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
    <div className={`${styles.centerRelX}`} style={{ minHeight:"300px", height:"20vw"}}>
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

        <h2 className={`${styles.scrollDownTitle}`} ref={scrollTitle} style={{"fontSize":"2rem","textAlign":"center"}}>v Scroll Down v</h2> 
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
          <div className={styles.centerRel}>
            <div className='font-tourner text-center lg:text-[10vw] text-[80px]'  >Jaxon Poentis</div> 
            <ScrollDown/>
          </div>
        </div>
        <div className={styles.homeMaincotainer}>
          <div className={` ${styles.textContainer} text-black  bg-white`}>
            <h1 style={{"fontSize":"300%","textAlign":"center"}}><strong>Hey, Aloha, こんにちは, </strong> <br></br><span className={`${styles.fontNormal} font-normal`}>I'm Jaxon</span></h1>
            <div className={`${styles.frontImage} min-w-[300px] min-h-[400px] w-[42%] h-[50vw]`}  >
            <Image  sizes="(min-width: 768px) 100vw, 33vw" alt='front picture' src="/Frontimage2.jpg" fill style={{"borderRadius":"0.5rem"}}/>
            </div>
            
            <h2 className={`${styles.fontNormal} font-light text-2xl mt-5`} style={{"textAlign":"center"}}>My name is Jaxon Poentis and I am born and raised from Hawaii! I am a self-taught programmer and am passionate about building projects that will empower the future 
            {/* I am currently attending <span className='font-bold'>Washington University in St. Louis</span> 🧸 studying Computer Science and Business!  */}
            </h2>
            <h3 style={{"textAlign":"center"}}> </h3>
          </div>
          <div className={` ${styles.textContainer} text-black  bg-[#faf7f5]`}>
            <h1 style={{"fontSize":"300%","textAlign":"center"}}><strong>My Path </strong>
            {/* <span className={`${styles.fontNormal} font-light`}>{`  |  `}</span> */}
            <br></br>
            <div className=''>
              <div className='mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-black h-2 '>
                
              </div>
            </div>
            <span className={`${styles.fontNormal} text-2xl font-extralight`}><i>{`   ${new Date().toLocaleDateString()}`}</i></span>
            </h1>
            <div className={`grid lg:grid-cols-4 gap-4 mt-16 w-[90%] ${styles.centerRelX}`}>
            
              <div className={`${styles.journeyImage} w-[70%] h-[40vw] lg:h-[15vw] lg:w-[90%]`}  >
                <Image alt='front picture' src="/brookings.jpg" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>Washington University in St. Louis</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Working Towards BS CS + Math | Business </i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>2023 - Present</i></h1>
                <br></br>
                <p>
                  Being a current student at Washington University in St. Louis has allowed me to explore my branching interests in software development and business. 
                </p>
                <br></br>
                <p>
                  My current involvement as a Teacher Assistant for Data Structures and Algorithms and Discrete Math has given me the opportunity to benefit my collegues and connect with my community. 

                </p>
                <br></br>
                <p>
                  WashU has given me a place to struggle, to overcome, and to grow

                </p>
              </div>
              <div className={`${styles.journeyImage} h-[30vw] w-[40%] lg:h-[10vw] lg:w-[50%]`}  >
                <Image alt='front picture' src="/robotics.png" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>WU Robotics</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Swarm Team | Software | AI and Navigation</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>2023 - Present</i></h1>
                <br></br>
                <p>
                  My part in WashU robotics is working on the software portion for controlling a swarm robot. The end goal for these swarm robots are to explore a maze, find rubber balls, and bring them home. 
                </p>
                <br></br>
                <p>
                  In my first semester, I created a object recognition AI model with Yolov5 and a custom dataset that detects the target rubber balls in a video input feed. The robot will use this model to detect the rubber balls when exploring. The model will also help the robot align itself when capturing and bringing the balls home.
 

                </p>
                <br></br>
                <p>
                  Currently our navigation software team is working on using Active Slam, ROS 2, and Nav2 to get our first robots able to create a localized map, move from point a and b, and maximize its exploration to find the target balls
                </p>
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
            <div className={`grid lg:grid-cols-4 gap-4 mt-16 w-[90%] ${styles.centerRelX}`}>
              
              <div className={`${styles.journeyImage} h-[45vw] lg:h-[15vw] w-[70%] lg:w-[90%]`}  >
                <Image alt='front picture' src="/EagleScoutPic.jpg" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              <div className='lg:col-span-1'>
                <h1 className={'text-3xl'}><strong>Boy Scouts</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Troop 181 | Eagle Scout</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>2016 - 2023</i></h1>
                <br></br>
                <p>
                  My time in Boy Scouts was an enjoyable one and taught me leadership, comradery, and kindness. From spending time with fellow scouts during camp outs to helping create cubbies for Nu'uanu Elementary School, my fellow scouts were there with me.
                </p>
                <br></br>
                <p>
                  
                  To achieve the rank of Eagle Scout, I organized a service project to construct six benches for my High School. The project took around four months of planning and two days to construct, paint, and install. This experience gave me real experience in being a leader and a chance to better my community
                </p>
              </div>
              <div className={`${styles.journeyImage} h-[30vw] w-[40%] lg:h-[12vw] lg:w-[55%]`}  >
                <Image alt='front picture' src="/fiverrlogo.jpg" fill style={{"borderRadius":"0.5rem"}}/>
              </div>
              <div className='col-span-1'>
                <h1 className={'text-3xl'}><strong>Freelance Browser Game Developer</strong></h1>
                <h1 className={'text-xl text-[#3885f2]'}><i>Freelancer | Developer</i></h1>
                <h1 className={'text-xl text-[#04007a]'}><i>2023</i></h1>
                <br></br>
                <p>
                  One field I explored was offering my skills through a freelance gig on fiverr. My service consisted of creating a full-stack browser game. As a freelancer I was incharge of selling my services and talking with clients.
                </p>
                <br></br>
                <p>
                  The projects I worked on range from real-time multiplayer experiences to platformer games. Some of my favorite tools I used were p5.js, node.js, and socket.io.
                </p>
                <br></br>
                <p>
                  Once college started, I decided to move on and commit my time to focusing on school. My gig allowed me to earn over $1000, and I used that money to help pay for school
                </p>
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
          <div className={`${styles.textContainer} text-center bg-[#020202] text-white `}>
            <h1 className='text-3xl'>
              <strong><i>Stand Proud, You're Strong</i></strong>
            </h1>
            <br></br>
            <h1 className='text-2xl'>
              <strong><i>誇れ、オマエは強い</i></strong>
            </h1>
            <h1>
              <i>Ryomen Sukuna</i>
            </h1>
            <br></br>
            <h1 className='text-2xl'>
              <strong>Life is movement. Once you stop moving, you're dead. Choose life.</strong>
            </h1>
            <h1>
              <i>Eugen Sandow</i>
            </h1>
          </div>


          <div className={`${styles.textContainer} ${styles.projectGradientBackground} text-white `}>
          <Link href={'/projects'}><h1 style={{"fontSize":"250%","textAlign":"center", "cursor":"pointer"}}><strong className='hover:text-[#a3cbff] duration-200'>My Favorite Projects 🧑‍💻</strong></h1></Link>
          
          {
          (frontData.pastProjFav) ? ((frontData.pastProjFav.length > 0 ) ? 
          <div className='grid lg:grid-cols-2'>
          {frontData.pastProjFav.map((data:any) =>
              {
                
                return (
                  <div key={data.id} className=''>
                    <div   >
                    
                      <div onClick={()=>
                      {
                        window.location.href= `/projects/${data.name}`
                      }}   className={`${styles.projectContainerText} ${styles.gradent} transition-all duration-500 bg-pos-0 hover:bg-pos-100 rounded-xl bg-[#171717] cursor-pointer`}style={{"textAlign":"center"}}>
                        <h2>
                            
                            <div className='text-2xl font-bold font-italic' style={{overflowWrap: "break-word","cursor":"pointer",textDecoration: "",}}>{data.name}</div>
                          
                        </h2>
                        <div className='mt-4'>
                            { (data.youtube) ?
                              <Suspense fallback={<h3>loading</h3>}>
                                <YoutubeVideo vId={data.mediaLink}/>
                              </Suspense>
                            :
                            <div className={`${styles.journeyImage} h-[35vw] lg:h-[15vw] w-[70%] lg:w-[50%]`}  >
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

              </div>
              <div className={`${styles.textContainer} text-center bg-[#171717] text-white `}>
            <h1 className='text-3xl'>
              <strong>Connect With Me!</strong>
            </h1>
            <br></br>
            <div className='grid grid-cols-4 w-4/5 relative left-1/2 translate-x-[-50%]'>
                            
              <div>
                <div style={{marginBottom: "20px"}} >
                  
                    <a rel="noreferrer" target={"_blank"}href='https://www.linkedin.com/in/jaxon-poentis/'>
                    <img  className={styles.gmailLogo} src='/linkdinLogo.png'/>
                    </a>
                  </div>
                </div>
              <div>
                <div style={{marginBottom: "20px"}} >
                  
                    <a rel="noreferrer" target={"_blank"}href='https://twitter.com/Jaxonpoentis'>
                    <img  className={styles.normallogo} src='/twitterlogo.png'/>
                    </a>
                  </div>
                </div>
            </div>
          </div>

          <div className={`${styles.textContainer}  bg-[#0a0a0a] text-white`} style={{"textAlign":"center"}}>
            
            <Link href={'/blog'}><h1 style={{ "fontWeight":"400","fontSize":"250%","textAlign":"center", "cursor":"pointer"}}><strong className='hover:text-[#a3cbff] duration-200'>💡 Recent Blogs 💡</strong></h1></Link>
              
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
                            {data.content}
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