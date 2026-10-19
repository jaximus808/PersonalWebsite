import type { NextPage } from "next";
import Link from "next/link";
import Seo, { PERSON_JSONLD } from "../components/Seo";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Header from "../components/header";
import Footer from "../components/footer";
import Background from "../components/backgroundThree";
import { useEffect, useRef } from "react";

import type { GetStaticProps } from "next";

import {
  PopInBlock,
  ScrollObserverProvider,
} from "../components/popinBlockContext";
import GradientBG from "../components/gradientbg";
import MyPath from "../components/myPath";
import LivingGreeting from "../components/LivingGreeting";
import { FramedImage } from "../components/content/Frame";
import { listPosts, listProjects, type PostMeta, type ProjectMeta } from "../lib/content";
import { formatDate } from "../lib/contentText";

type Props = {
  projects: ProjectMeta[];
  latestPost: PostMeta | null;
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

const Index = ({ projects, latestPost }: Props) => {
  return (
    <ScrollObserverProvider>
      <div className="text-caviar ">
        <Background />
        <GradientBG />
        <Seo
          title="Jaxon Poentis — Software Engineer · Capital One, Tesla · CS + Math at WashU"
          path="/"
          ogType="profile"
        >
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSONLD) }}
          />
        </Seo>
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

            <div id="projects"></div>
            <div className={`pt-4 mt-24 ${styles.textContainer} text-white`}>
              {/* Section header — matches the My Path cadence */}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 px-8 w-full max-w-6xl">
                  {projects.map((project) => (
                    <PopInBlock key={project.slug} variant="materialize">
                      <Link
                        href={`/projects/${project.slug}`}
                        className={`${styles.stagePanel} group block h-full overflow-hidden rounded-2xl`}
                      >
                        {project.cover ? (
                          <FramedImage
                            src={project.cover}
                            alt=""
                            ratio="wide"
                            fit="cover"
                            bare
                            imgClassName="transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                        ) : null}
                        <div className="p-6">
                          <h2 className="font-cormorant font-light text-2xl md:text-3xl text-white leading-tight transition-colors duration-300 group-hover:text-blue-300">
                            {project.title}
                          </h2>
                          <p className="mt-2 text-[0.7rem] uppercase tracking-[0.16em] text-white/45 font-montserrat">
                            {formatDate(project.date)}
                          </p>
                          <p className="mt-3 text-sm text-white/65 font-light leading-relaxed line-clamp-3">
                            {project.summary}
                          </p>
                        </div>
                      </Link>
                    </PopInBlock>
                  ))}
                </div>
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

            {latestPost && (
              <div className="mx-auto w-[90%] max-w-3xl mt-14">
                {/* Editorial list — mirrors the /blog page */}
                <div className="border-t border-white/10 text-left">
                  <PopInBlock variant="materialize">
                    <Link href={`/blog/${latestPost.slug}`} className="group block">
                      <article className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-6 md:gap-10 py-9 border-b border-white/10 transition-colors duration-500 group-hover:border-white/20">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-white/45 font-montserrat">
                            {formatDate(latestPost.date)}
                          </p>

                          <h2 className="mt-3 font-cormorant font-light text-3xl md:text-4xl text-white leading-tight transition-colors duration-300 group-hover:text-blue-300">
                            {latestPost.title}
                          </h2>

                          <p className="mt-3 text-sm md:text-base text-white/60 font-light leading-relaxed line-clamp-2">
                            {latestPost.excerpt}
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

                        {latestPost.cover && (
                          <div className="hidden md:block relative h-28 w-44 flex-none overflow-hidden rounded ring-1 ring-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={latestPost.cover}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                            />
                          </div>
                        )}
                      </article>
                    </Link>
                  </PopInBlock>
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
            )}
          </div>

          <Footer authSense={false} authenticated={false} />
        </div>
      </div>
    </ScrollObserverProvider>
  );
};

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: {
    projects: listProjects().slice(0, 3),
    latestPost: listPosts()[0] ?? null,
  },
});

export default Index;
