import type { NextPage } from "next";
import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Header from "../components/header";
import Footer from "../components/footer";
import Background from "../components/backgroundThree";
import { PrismaClient, Prisma } from "@prisma/client";
import { useState, useEffect, useRef, Suspense } from "react";
import prisma from "../lib/prisma";
import cookies from "cookie";

import { GetStaticProps, GetStaticPaths, GetServerSideProps } from "next";

import {
  PopInBlock,
  ScrollObserverProvider,
} from "../components/popinBlockContext";
import Youtube from "react-youtube";
import GradientBG from "../components/gradientbg";
import MyPath from "../components/myPath";
import TechStack from "../components/techStack";

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
      <Youtube
        className="relative flex iterms-center justify-center"
        style={{ width: "100%", height: "100%" }}
        videoId={props.vId}
        opts={opts}
      />
    </div>
  );
}

type props = {
  fail: boolean;
  pastProjFav: any;
  recentBlogs: any;
};

type frontData = {
  fail: boolean;
  pastProjFav: any;
  recentBlogs: any;
};

function ScrollDown(props: any) {
  const yRef = useRef(0);
  const moved = useRef(false);
  const scrollTitle: any = useRef(null);
  const scrollbar: any = useRef(null);

  const showFixed = () => {
    if (scrollTitle.current == null) return;
    scrollTitle.current.style.top = "0";
    scrollbar.current.style.top = "0";
    scrollbar.current.style.opacity = "1";
    scrollTitle.current.style.color = "rgba(255,255,255,1)";
  };

  const hideFixed = () => {
    if (scrollTitle.current == null) return;
    scrollTitle.current.style.color = "rgba(255,255,255,0)";
    scrollTitle.current.style.top = "50%";
    scrollbar.current.style.top = "50%";
    scrollbar.current.style.opacity = "0";
  };
  const handleScroll = () => {
    const y = window.pageYOffset;
    yRef.current = y;
    if (!moved.current && yRef.current > window.innerHeight * 0.1) {
      moved.current = true;
      window.requestAnimationFrame(hideFixed);
    }
    if (moved.current && yRef.current <= window.innerHeight * 0.1) {
      moved.current = false;
      window.requestAnimationFrame(showFixed);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    const y = window.pageYOffset;
    yRef.current = y;
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
  return (
    <>
      {/* <h2 className={`${styles.scrollDownTitle} transition-duration-5 lg:text-[2vw] text-2xl text-center font-thin`} ref={scrollTitle} >- scroll down -</h2> */}
      <div
        ref={scrollbar}
        className={`mt-4 ${styles.scrollBarTitle} flex flex-row justify-center items-center gap-8 w-[25rem] md:w-1/2 text-center p-4  lg:text-[2vw] text-2xl underline font-thin ${styles.centerRelX}`}
      >
        <a href="#whoIam" className="hover:text-blue-300 duration-300">
          Me
        </a>
        <a href="#path" className="hover:text-blue-300 duration-300">
          Path
        </a>
        <a href="#projects" className="hover:text-blue-300 duration-300">
          Projects
        </a>
        {/* 
        <a href='#blogs' className='hover:text-blue-300 duration-300'>Blog</a> */}
      </div>
    </>
  );
}

const Index = (props: props) => {
  useEffect(() => {
    let isMounted = true; // Prevent setting state if unmounted

    async function getInitialData() {
      try {
        const res = await fetch("/api/getFrontPageData/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (isMounted) {
          setFrontData({
            ...data,
            pastProjFav: data.pastProjFav
              ? [...data.pastProjFav].reverse()
              : undefined,
          });
        }
      } catch (e) {
        if (isMounted) {
          setFrontData({ fail: true, pastProjFav: [], recentBlogs: [] });
        }
      }
    }
    getInitialData();
  }, []);

  const [frontData, setFrontData] = useState<frontData>({
    pastProjFav: undefined,
    recentBlogs: undefined,
    fail: false,
  });

  return (
    <ScrollObserverProvider>
      <div className="text-caviar ">
        <Background />
        <GradientBG />
        <Head>
          <title>Jaxon Poentis</title>
          <meta name="description" content="Personal Page For Jaxon Poentis" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        {}
        <Header />

        <div className={`${styles.mainTitleName} ${styles.animateFadeIn}`}>
          <div className={styles.centerRel}>
            <div className="text-center md:text-[6vw] text-[80px] px-2 font-thin">
              Jaxon Poentis
            </div>
            <ScrollDown />
          </div>
        </div>
        <div id="whoIam" className={`${styles.homeMaincotainer} `}>
          <div className={` ${styles.textContainer}   text-white `}>
            <h1 style={{ textAlign: "center" }} className="text-5xl"></h1>
            <br></br>
            <div
              className={`grid md:grid-cols-2 w-full h-full py-4 relative left-1/2 translate-x-[-50%] gap-x-8 `}
            >
              <div
                className={`${styles.frontImage} mt-2 md:ml-10 md:w-[18vw] md:min-h-[30rem] md:min-w-[21rem] md:h-[32vw] min-w-[250px] min-h-[27rem] w-[20rem] h-[40vw]`}
              >
                <Image
                  alt="front picture"
                  src="/aura_pic.jpg"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>

              <div className={`w-full flex px-4 md:p-0 mt-4 md:mt-0 `}>
                <div className={`${styles.fadedBg} p-6 rounded-xl md:w-[87%] `}>
                  <h2
                    className={`${styles.fontNormal}  text-2xl md:text-left text-center`}
                  >
                    Hey, I’m Jaxon 🤙
                  </h2>
                  <h2
                    className={`${styles.fontNormal} font-thin  text-lg mt-5 md:text-left text-center`}
                  >
                    Born and Raised Hawaii, island of O'ahu, I'm currently
                    studying CS + Math at Washington University in St. Louis,
                    with a focus on backend development and robotic systems.{" "}
                  </h2>
                  <h2
                    className={`${styles.fontNormal} font-thin  text-lg mt-5 md:text-left text-center`}
                  >
                    <span className="underline">Hobbies</span>: Coding, Hiking,
                    Fishing, Gaming
                  </h2>
                  <br></br>
                  <p
                    className={`${styles.fontNormal} font-thin text-center md:text-left`}
                  >
                    If my webpage is too long, checkout my resume:
                  </p>
                  <div className="w-full text-center md:text-left">
                    <Link
                      className="underline text-blue-300 "
                      href={"./resume"}
                    >
                      📘 Resume
                    </Link>
                  </div>

                  <br></br>
                  <h1
                    className={`${styles.fontNormal} text-2xl md:text-left text-center`}
                  >
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
                          <Link
                            className="underline"
                            href={"https://www.linkedin.com/in/jaxon-poentis"}
                          >
                            LinkedIn
                          </Link>
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
                          <Link
                            className="underline"
                            href={"https://www.linkedin.com/in/jaxon-poentis"}
                          >
                            Youtube
                          </Link>
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
                          <Link
                            className="underline"
                            href={"https://www.linkedin.com/in/jaxon-poentis"}
                          >
                            Github
                          </Link>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div id="path"></div>
            </div>

            <MyPath />

            <br></br>
            <TechStack />
            <div 
              id="projects"></div>
            <div
              className={`${styles.textContainer}  py-4  text-white mt-16`}
            >
              <Link href={"/projects"}>
                <h1
                  className="font-thin"
                  style={{
                    fontSize: "400%",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  My Recent Projects 🧑‍💻
                </h1>
              </Link>
              <div className="">
                <div className="mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-2 "></div>
              </div>
              <div className="flex items-center justify-center mt-4">
                {frontData.pastProjFav ? (
                  frontData.pastProjFav.length > 0 ? (
                    <div className="grid grid-cols-1 md:w-[90%] flex mt-4 gap-12 p-4">
                      {frontData.pastProjFav.map((data: any) => {
                        return (
                          <PopInBlock key={data.id}>
                            <div key={data.id} className="h-full ">
                              <div>
                                <div
                                  onClick={() => {
                                    window.location.href = `/projects/${data.name}`;
                                  }}
                                  className={`${styles.projectContainerText} ${styles.gradent} rounded-lg py-12 px-4  bg-[#171717] cursor-pointer`}
                                  style={{ textAlign: "left" }}
                                >
                                  <div className="">
                                    {
                                      data.youtube ? (
                                        <div
                                          className={` ${styles.journeyImage} md:w-full  `}
                                        >
                                          <Suspense fallback={<h3>loading</h3>}>
                                            <YoutubeVideo
                                              className={"h-[40vw]"}
                                              vId={data.mediaLink}
                                            />
                                          </Suspense>
                                        </div>
                                      ) : (
                                        <div
                                          className={`${styles.journeyImage} w-[15rem] sm:w-96 h-36 sm:h-72`}
                                        >
                                          <Image
                                            alt="front picture"
                                            src={data.mediaLink}
                                            fill
                                            style={{ borderRadius: "0.5rem" }}
                                          />
                                        </div>
                                      )
                                      // <Image alt='media picture' src={data.mediaLink} className='relative left-1/2 translate-x-[-50%]' width={0} height={0} style={{ width: '100%', height: 'auto' }}/>
                                    }
                                    <div className="px-6 mt-4">
                                      <h2
                                        className="text-3xl font-bold font-italic mt-2"
                                        style={{
                                          overflowWrap: "break-word",
                                          cursor: "pointer",
                                          textDecoration: "",
                                        }}
                                      >
                                        {data.name.replace(/_/g, " ")}
                                      </h2>
                                      <h3
                                        className={`text-md mt-4 italic`}
                                        style={{
                                          overflow: "hidden",
                                          WebkitLineClamp: 4,
                                          WebkitBoxOrient: "vertical",
                                          display: "-webkit-box",
                                        }}
                                      >
                                        {data.projectDate}
                                      </h3>
                                      <h3
                                        className={`text-md mt-4`}
                                        style={{
                                          overflow: "hidden",
                                          WebkitLineClamp: 4,
                                          WebkitBoxOrient: "vertical",
                                          display: "-webkit-box",
                                        }}
                                      >
                                        {data.shortDescription}
                                      </h3>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </PopInBlock>
                        );
                      })}
                    </div>
                  ) : (
                    <PopInBlock>
                      <h3 className="text-center text-3xl">
                        Sorry Projects Could Not Be Loaded, Try Again!
                      </h3>
                    </PopInBlock>
                  )
                ) : (
                  <PopInBlock>
                    <h3 className="text-center text-3xl">Loading...</h3>
                  </PopInBlock>
                )}

                <div id="blogs"></div>
              </div>
            </div>
          </div>

          <div
            className={`${styles.textContainer} py-4  bg-[#0a0a0a] text-white`}
            style={{ textAlign: "center" }}
          >
            <Link href={"/blog"}>
              <h1
                style={{
                  fontWeight: "400",
                  fontSize: "250%",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <strong className="hover:text-[#a3cbff] duration-200 ">
                  💡 Recent Blogs 💡
                </strong>
              </h1>
            </Link>

            {frontData.recentBlogs ? (
              frontData.recentBlogs.length == 0 ? (
                <PopInBlock>
                  <h3 style={{ textAlign: "center", fontSize: "2vw" }}>
                    Sorry blogs could not be loaded, try again!
                  </h3>
                </PopInBlock>
              ) : (
                frontData.recentBlogs.map((data: any) => {
                  return (
                    <PopInBlock key={data.id}>
                      <div
                        onClick={() => {
                          window.location.href = `/blogs/${data.id}`;
                        }}
                        className={` ${styles.gradent2} bg-[#242424] hover:bg-[#292929] pt-4 pb-8 px-8 mt-4  w-4/5 relative left-1/2 translate-x-[-50%] rounded-md cursor-pointer duration-200`}
                        style={{ textAlign: "left" }}
                      >
                        <h2>
                          <div
                            className={`text-2xl font-semibold font-caviar`}
                            style={{
                              cursor: "pointer",
                              overflowWrap: "break-word",
                            }}
                          >
                            {data.title}
                          </div>
                        </h2>
                        <div>
                          <h3
                            className="text-xl font-light"
                            style={{
                              overflow: "hidden",
                              WebkitLineClamp: 6,
                              WebkitBoxOrient: "vertical",
                              display: "-webkit-box",
                            }}
                          >
                            <i>
                              {new Date(data.datePosted).toLocaleDateString()}
                            </i>
                          </h3>
                          <br></br>
                          <h3
                            className="font-light text-lg"
                            style={{
                              overflow: "hidden",
                              WebkitLineClamp: 6,
                              WebkitBoxOrient: "vertical",
                              display: "-webkit-box",
                            }}
                          >
                            {data.content
                              .split("*")
                              .map((data: any, key: any) => {
                                if (data.length == 0) return "";
                                if (
                                  data.length >= 3 &&
                                  data.substring(0, 3) == "<i>"
                                ) {
                                  return "";
                                } else if (
                                  data.length >= 3 &&
                                  data.substring(0, 3) == "<b>"
                                ) {
                                  return data.substring(3);
                                } else {
                                  return data;
                                }
                              })}
                          </h3>

                          <br></br>
                          <Link
                            className="text-lg"
                            style={{ textDecoration: "underline" }}
                            href={`/blogs/${data.id}`}
                          >
                            <div
                              style={{
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                            >
                              {"Click to Read More 📖"}
                            </div>
                          </Link>
                        </div>
                      </div>
                    </PopInBlock>
                  );
                })
              )
            ) : (
              <PopInBlock>
                <h3 className="text-center text-3xl">Loading...</h3>
              </PopInBlock>
            )}
          </div>

          <Footer authSense={false} authenticated={false} />
        </div>
      </div>
    </ScrollObserverProvider>
  );
};

export default Index;
