import Head from 'next/head'
import styles from '../../styles/Home.module.css'
import Header from '../../components/header'
import Footer from '../../components/footer'
import Background from '../../components/backgroundThree'
import * as cookies from "cookie"
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import * as jsonwebtoken from "jsonwebtoken"
import { Suspense } from 'react'
import Image from 'next/image'
import { PrismaClient, Projects } from "@prisma/client"
import YouTube from "react-youtube"
import { Calendar, ExternalLink, Github, Star, ArrowLeft } from 'lucide-react'

function YoutubeVideo(props: any) {
  const opts = {
    height: "100%",
    width: "95%",
    playerVars: {
      autoplay: 0,
    },
  };
  
  return (
    <div className={`${styles.centerRelX} ${props.className}`}>
      <YouTube
        className="relative flex items-center justify-center"
        style={{ width: "100%", height: "100%" }}
        videoId={props.vId}
        opts={opts}
      />
    </div>
  );
}

const prisma = new PrismaClient();

type props = {
  id: string,
  exist: boolean
  projectData: any,
  authenticated: boolean
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const parsedCookies = cookies.parse(context.req.headers.cookie ? context.req.headers.cookie : "");
  
  const token = parsedCookies.token;

  let authenticated = false; 
  if (!token) {
    authenticated = false;
  } else {
    try {
      jsonwebtoken.verify(token, process.env.ADMIN_PASS!);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }
  
  const { projectName } = context.query
  if (!projectName) {
    return {
      props: {
        projectData: "",
        exist: false
      }
    }
  }
  
  try {
    const project = await prisma.projects.findMany({
      where: {
        name: projectName.toString()
      }
    })
    
    const proj_data = JSON.parse(JSON.stringify(project))[0]
    if (!proj_data) {
      throw "error"
    }
    
    return {
      props: {
        projectData: proj_data,
        exist: true,
        authenticated: authenticated,
        id: projectName,
      }
    }
  } catch {
    return {
      redirect: {
        permanent: false,
        destination: "/projects",
      },
      props: {},
    }
  }
}

const Index: React.FC<props> = props => {
  const deleteProject = async () => {
    const response = await fetch("/api/admin/deleteProjects", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_name: props.id
      }) 
    }).then(() => {
      location.replace("/projects");
    })
  }
  
  return ( 
    <div className="min-h-screen bg-[#0a0a0a]">
      <Head>
        <title>{props.exist ? props.projectData.name.replace(/_/g, " ") + ' | Jaxon Poentis' : 'Project | Jaxon Poentis'}</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <meta property="og:image" content="/metadata.jpg" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header/>
      
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        {/* Back to Projects Link */}
        <Link href="/projects">
          <div className="inline-flex items-center text-white/70 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Projects
          </div>
        </Link>

        {props.exist ? (
          <article className="bg-[#121212] rounded-2xl shadow-2xl overflow-hidden">
            {/* Project Header */}
            <header className="px-8 md:px-12 pt-12 pb-8 border-b border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                    {props.projectData.name.replace(/_/g, " ")}
                  </h1>
                  
                  {/* Project Metadata */}
                  <div className="flex flex-wrap gap-4 items-center">
                    {props.projectData.projectDate && (
                      <div className="flex items-center text-gray-400 text-lg">
                        <Calendar className="w-5 h-5 mr-2" />
                        <time dateTime={props.projectData.projectDate}>
                          {new Date(props.projectData.projectDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </time>
                      </div>
                    )}
                    
                    {props.projectData.favorite && (
                      <div className="flex items-center bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 mr-2 fill-current" />
                        Featured Project
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Short Description */}
              {props.projectData.shortDescription && (
                <p className="text-xl text-gray-300 mt-6 leading-relaxed">
                  {props.projectData.shortDescription}
                </p>
              )}
            </header>

            {/* Project Media */}
            <div className="px-8 md:px-12 py-10">
              {props.projectData.youtube ? (
                <div className="w-full aspect-video bg-black/30 rounded-xl overflow-hidden mb-10">
                  <Suspense fallback={
                    <div className="w-full h-full flex items-center justify-center text-white">
                      Loading video...
                    </div>
                  }>
                    <YoutubeVideo 
                      vId={props.projectData.mediaLink}
                      className="w-full h-full"
                    />
                  </Suspense>
                </div>
              ) : (
                <figure className="mb-10 rounded-xl overflow-hidden">
                  <Image 
                    src={props.projectData.mediaLink} 
                    width={1200} 
                    height={675}
                    alt={props.projectData.name}
                    className="w-full h-auto object-cover"
                  /> 
                </figure>
              )}

              {/* Project Description */}
              <div className="prose prose-invert prose-lg max-w-none mb-10">
                <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                  {props.projectData.description}
                </p>
              </div>

              {/* Project Links */}
              <div className="flex flex-wrap gap-4">
                {props.projectData.linkName && (
                  <a 
                    href={props.projectData.linkName}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    View Repository
                  </a>
                )}
                
                {props.projectData.projectLinks && props.projectData.projectLinks !== "" && (
                  <a 
                    href={props.projectData.projectLinks}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Live Demo
                  </a>
                )}
              </div>
            </div>

            {/* Admin Controls */}
            {props.authenticated && (
              <div className="px-8 md:px-12 pb-8 border-t border-gray-800 pt-6">
                <button 
                  onClick={deleteProject}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Delete Project
                </button>
              </div>
            )}
          </article>
        ) : (
          <div className="bg-[#121212] rounded-2xl shadow-2xl p-12 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Project Not Found</h1>
            <p className="text-gray-400 text-lg mb-8">
              The project you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/projects">
              <div className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                Back to Projects
              </div>
            </Link>
          </div>
        )}
      </main>
      
      <Footer authenticated={false} authSense={false} />
    </div>
  )
}

export default Index;