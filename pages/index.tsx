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

import { GetStaticProps, GetStaticPaths, GetServerSideProps } from "next";

import {
  PopInBlock,
  ScrollObserverProvider,
} from "../components/popinBlockContext";
import Youtube from "react-youtube";
import GradientBG from "../components/gradientbg";
import MyPath from "../components/myPath";
import TechStack from "../components/techStack";
import LivingGreeting from "../components/LivingGreeting";

// Distill a blog's markup-lite content into a quiet plain-text preview:
// drop image markers (*<i>...*), unwrap bold headings (*<b>...*), keep prose.
function blogPreview(content: string): string {
  return content
    .split("*")
    .map((segment) => segment.trim())
    .filter(
      (segment) => segment.length > 0 && segment.substring(0, 3) !== "<i>"
    )
    .map((segment) =>
      segment.substring(0, 3) === "<b>" ? segment.substring(3) : segment
    )
    .join(" ");
}

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
  const items = [
    { href: "#whoIam", label: "Me" },
    { href: "#path", label: "Path" },
    { href: "#projects", label: "Projects" },
    { href: "#blogs", label: "Blog" },
  ];
  return (
    <div
      ref={scrollbar}
      className={`mt-10 md:mt-12 ${styles.scrollBarTitle} ${styles.centerRelX} flex flex-row justify-center items-center gap-7 md:gap-10 font-cormorant`}
    >
      {items.map((it, i) => (
        <a
          key={it.href}
          href={it.href}
          style={{ animationDelay: `${650 + i * 120}ms` }}
          className="navHint group relative text-white/55 hover:text-white transition-colors duration-300 md:text-[1.7vw] text-xl"
        >
          {it.label}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 -bottom-1 h-px w-[72%] -translate-x-1/2 origin-center scale-x-0 bg-white/60 transition-transform duration-300 ease-out group-hover:scale-x-100"
          />
        </a>
      ))}
    </div>
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
            <LivingGreeting />
            <ScrollDown />
          </div>
        </div>
        <div id="whoIam" className={`${styles.homeMaincotainer} `}>
          <div className={` ${styles.textContainer}   text-white`}>
            <h1 style={{ textAlign: "center" }} className="text-5xl"></h1>
            <br></br>
            <div
              className={`grid md:grid-cols-2 w-full h-full py-4 relative left-1/2 translate-x-[-50%] gap-x-8`}
            >
              <PopInBlock variant="materialize">
                <div
                  className={`${styles.frontImage} ${styles.stageImage} mt-2 md:ml-10 w-[280px] h-[392px] md:w-[320px] md:h-[448px] lg:w-[380px] lg:h-[532px] xl:w-[480px] xl:h-[672px] 2xl:w-[580px] 2xl:h-[812px]`}
                >
                  <Image
                    alt="front picture"
                    src="/aura_pic.jpg"
                    fill
                    className="rounded-2xl object-cover"
                  />
                </div>
              </PopInBlock>
              <PopInBlock variant="materialize" delay={100}>
                <div className={`w-full flex px-4 md:p-0 mt-4 md:mt-0 `}>
                  <div
                    className={`${styles.stagePanel} p-6 md:p-8 rounded-2xl md:w-[87%] `}
                  >
                    <h2
                      className={`${styles.fontNormal} text-2xl xl:text-3xl 2xl:text-4xl md:text-left text-center`}
                    >
                      Hey, I'm Jaxon 🤙
                    </h2>
                    <h2
                      className={`${styles.fontNormal} font-semithin text-md xl:text-lg 2xl:text-xl mt-5 md:text-left text-center`}
                    >
                      Born and Raised Hawaii, island of O'ahu, I'm currently
                      studying CS + Math at Washington University in St. Louis,
                      with a focus on backend development and robotic systems.{" "}
                    </h2>
                    <h2
                      className={`${styles.fontNormal} font-thin text-lg xl:text-xl 2xl:text-2xl mt-5 md:text-left text-center`}
                    >
                      <span className="underline">Hobbies</span>: Coding,
                      Hiking, Fishing, Gaming
                    </h2>
                    <h2
                      className={`${styles.fontNormal} font-thin text-lg xl:text-xl 2xl:text-2xl mt-2 md:text-left text-center`}
                    >
                      <span className="underline">Fav Languages</span>: Go, C++,
                      Python
                    </h2>
                    <br></br>
                    <p
                      className={`${styles.fontNormal} font-thin xl:text-lg 2xl:text-xl text-center md:text-left`}
                    >
                      If my webpage is too long, checkout my resume:
                    </p>
                    <div className="w-full text-center md:text-left">
                      <Link
                        className="underline text-blue-300 xl:text-lg 2xl:text-xl"
                        href={"./resume"}
                      >
                        📘 Resume
                      </Link>
                    </div>

                    <br></br>
                    <h1
                      className={`${styles.fontNormal} text-2xl xl:text-3xl 2xl:text-4xl md:text-left text-center`}
                    >
                      Connect With Me 👋
                    </h1>

                    <div className="mt-8 pb-8 mx-auto w-full md:w-auto">
                      <ul className="space-y-4 md:text-left text-center underline xl:text-lg 2xl:text-xl">
                        <li className="flex items-center gap-3 justify-center md:justify-start">
                          <div className="flex items-center gap-3">
                            <Image
                              src="/LinkedIn_icon.png"
                              alt="LinkedIn"
                              width={24}
                              height={24}
                              className="object-contain xl:w-7 xl:h-7 2xl:w-8 2xl:h-8"
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
                              className="object-contain xl:w-7 xl:h-7 2xl:w-8 2xl:h-8"
                            />
                            <Link
                              className="underline"
                              href={"https://www.youtube.com/@jaxonpoentis"}
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
                              className="rounded-full object-contain xl:w-7 xl:h-7 2xl:w-8 2xl:h-8"
                            />
                            <Link
                              className="underline"
                              href={"https://github.com/jaximus808"}
                            >
                              Github
                            </Link>
                          </div>
                        </li>
                        <li className="flex items-center gap-3 justify-center md:justify-start">
                          <div className="flex items-center gap-3">
                            <Image
                              src="/X.png"
                              alt="X"
                              width={24}
                              height={24}
                              className="rounded-full object-contain xl:w-7 xl:h-7 2xl:w-8 2xl:h-8"
                            />
                            <Link
                              className="underline"
                              href={"https://x.com/soljaxonp"}
                            >
                              @SolJaxonp
                            </Link>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </PopInBlock>
              <div id="path"></div>
            </div>

            <MyPath />

            <br></br>

            <TechStack />
            <div id="projects"></div>
            <div className={`pt-4 mt-24 ${styles.textContainer} text-white`}>
              {/* Section header — matches the My Path / Tech Stack cadence */}
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-montserrat">
                  A few things I&apos;ve built
                </p>
                <h1 className="mt-3 font-cormorant font-light text-5xl md:text-6xl text-white">
                  Recent Projects
                </h1>
                <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
              </div>

              <div className="mt-14 flex items-center justify-center">
                {frontData.pastProjFav ? (
                  frontData.pastProjFav.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 px-8 w-full max-w-6xl">
                      {frontData.pastProjFav.map((data: any) => {
                        return (
                          <PopInBlock key={data.id} variant="materialize">
                            <div
                              onClick={() => {
                                window.location.href = `/projects/${data.name}`;
                              }}
                              className={`${styles.stagePanel} group h-full overflow-hidden rounded-2xl cursor-pointer`}
                            >
                              {data.youtube ? (
                                <div className="relative aspect-video w-full overflow-hidden bg-white/5">
                                  <Suspense
                                    fallback={
                                      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.18em] text-white/40">
                                        Loading…
                                      </div>
                                    }
                                  >
                                    <YoutubeVideo
                                      className={"h-full w-full"}
                                      vId={data.mediaLink}
                                    />
                                  </Suspense>
                                </div>
                              ) : (
                                <div className="relative aspect-video w-full overflow-hidden bg-white/5">
                                  <Image
                                    alt={data.name.replace(/_/g, " ")}
                                    src={data.mediaLink}
                                    fill
                                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                  />
                                </div>
                              )}
                              <div className="p-6">
                                <h2 className="font-cormorant font-light text-2xl md:text-3xl text-white leading-tight transition-colors duration-300 group-hover:text-blue-300">
                                  {data.name.replace(/_/g, " ")}
                                </h2>
                                {data.projectDate ? (
                                  <p className="mt-2 text-[0.7rem] uppercase tracking-[0.16em] text-white/45 font-montserrat">
                                    {data.projectDate}
                                  </p>
                                ) : null}
                                <p className="mt-3 text-sm text-white/65 font-light leading-relaxed line-clamp-3">
                                  {data.shortDescription}
                                </p>
                              </div>
                            </div>
                          </PopInBlock>
                        );
                      })}
                    </div>
                  ) : (
                    <PopInBlock>
                      <p className="text-center text-sm uppercase tracking-[0.18em] text-white/50 font-montserrat">
                        Sorry, projects could not be loaded — try again.
                      </p>
                    </PopInBlock>
                  )
                ) : (
                  <PopInBlock>
                    <p className="text-center text-sm uppercase tracking-[0.18em] text-white/50 font-montserrat">
                      Loading…
                    </p>
                  </PopInBlock>
                )}
              </div>

              {/* Connective cue → the full projects page */}
              <div className="mt-12 text-center">
                <Link
                  href={"/projects"}
                  className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 hover:text-blue-300 transition-colors duration-300 font-montserrat"
                >
                  View all projects
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>

          <div id="blogs"></div>
          <div className={`pt-4 mt-24 pb-4 ${styles.textContainer} text-white`}>
            {/* Section header — same cadence as the rest of the page */}
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-montserrat">
                Thoughts, notes &amp; what I&apos;m building
              </p>
              <h1 className="mt-3 font-cormorant font-light text-5xl md:text-6xl text-white">
                From the Blog
              </h1>
              <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
            </div>

            {frontData.recentBlogs ? (
              frontData.recentBlogs.length == 0 ? (
                <PopInBlock>
                  <p className="mt-12 text-center text-sm uppercase tracking-[0.18em] text-white/50 font-montserrat">
                    Sorry, blogs could not be loaded — try again.
                  </p>
                </PopInBlock>
              ) : (
                <div className="mx-auto w-[90%] max-w-3xl mt-14">
                  {/* Editorial list — mirrors the /blog page */}
                  <div className="border-t border-white/10 text-left">
                    {frontData.recentBlogs.map((data: any) => (
                      <PopInBlock key={data.id} variant="materialize">
                        <div
                          onClick={() => {
                            window.location.href = `/blogs/${data.id}`;
                          }}
                          className="group block cursor-pointer"
                        >
                          <article className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-6 md:gap-10 py-9 border-b border-white/10 transition-colors duration-500 group-hover:border-white/20">
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-white/45 font-montserrat">
                                {data.datePosted
                                  ? new Date(
                                      data.datePosted
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : ""}
                              </p>

                              <h2 className="mt-3 font-cormorant font-light text-3xl md:text-4xl text-white leading-tight transition-colors duration-300 group-hover:text-blue-300">
                                {data.title}
                              </h2>

                              <p className="mt-3 text-sm md:text-base text-white/60 font-light leading-relaxed line-clamp-2">
                                {blogPreview(data.content)}
                              </p>

                              <span className="mt-5 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 transition-colors duration-300 group-hover:text-blue-300">
                                Read
                                <span
                                  aria-hidden="true"
                                  className="transition-transform duration-300 group-hover:translate-x-1"
                                >
                                  →
                                </span>
                              </span>
                            </div>

                            {data.mediaPic && (
                              <div className="hidden md:block relative h-28 w-44 flex-none overflow-hidden rounded-xl ring-1 ring-white/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={data.mediaPic}
                                  alt={data.title}
                                  className="h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                                />
                              </div>
                            )}
                          </article>
                        </div>
                      </PopInBlock>
                    ))}
                  </div>

                  {/* Connective cue → the full blog */}
                  <div className="mt-10 text-center">
                    <Link
                      href={"/blog"}
                      className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 hover:text-blue-300 transition-colors duration-300 font-montserrat"
                    >
                      Read the blog
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <PopInBlock>
                <p className="mt-12 text-center text-sm uppercase tracking-[0.18em] text-white/50 font-montserrat">
                  Loading…
                </p>
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
