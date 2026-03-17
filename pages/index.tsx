import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import Header from "../components/header";
import Footer from "../components/footer";
import Background from "../components/backgroundThree";
import { useState, useEffect, useRef } from "react";
import { ScrollObserverProvider } from "../components/popinBlockContext";
import GradientBG from "../components/gradientbg";
import MyPath from "../components/myPath";
import TechStack from "../components/techStack";
import BioSection from "../components/sections/BioSection";
import ProjectsSection from "../components/sections/ProjectsSection";
import BlogsSection from "../components/sections/BlogsSection";

type FrontData = {
  fail: boolean;
  pastProjFav: any[] | undefined;
  recentBlogs: any[] | undefined;
};

function ScrollDown() {
  const moved = useRef(false);
  const scrollbar: any = useRef(null);

  const showFixed = () => {
    if (scrollbar.current == null) return;
    scrollbar.current.style.top = "0";
    scrollbar.current.style.opacity = "1";
  };

  const hideFixed = () => {
    if (scrollbar.current == null) return;
    scrollbar.current.style.top = "50%";
    scrollbar.current.style.opacity = "0";
  };

  const handleScroll = () => {
    const y = window.pageYOffset;
    if (!moved.current && y > window.innerHeight * 0.1) {
      moved.current = true;
      window.requestAnimationFrame(hideFixed);
    }
    if (moved.current && y <= window.innerHeight * 0.1) {
      moved.current = false;
      window.requestAnimationFrame(showFixed);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  return (
    <div
      ref={scrollbar}
      className={`mt-4 ${styles.scrollBarTitle} flex flex-row justify-center items-center gap-8 w-[25rem] md:w-1/2 text-center p-4 lg:text-[2vw] text-2xl underline font-thin ${styles.centerRelX}`}
    >
      <a href="#whoIam" className="hover:text-blue-300 duration-300">Me</a>
      <a href="#path" className="hover:text-blue-300 duration-300">Path</a>
      <a href="#projects" className="hover:text-blue-300 duration-300">Projects</a>
      <a href="#blogs" className="hover:text-blue-300 duration-300">Blog</a>
    </div>
  );
}

const Index: NextPage = () => {
  const [frontData, setFrontData] = useState<FrontData>({
    pastProjFav: undefined,
    recentBlogs: undefined,
    fail: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function getInitialData() {
      try {
        const res = await fetch("/api/getFrontPageData/", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
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
    return () => { isMounted = false; };
  }, []);

  return (
    <ScrollObserverProvider>
      <div className="text-caviar">
        <Background />
        <GradientBG />
        <Head>
          <title>Jaxon Poentis</title>
          <meta name="description" content="Personal Page For Jaxon Poentis" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Header />

        <div className={`${styles.mainTitleName} ${styles.animateFadeIn}`}>
          <div className={styles.centerRel}>
            <div className="text-center md:text-[6vw] text-[80px] px-2 font-thin">
              Jaxon Poentis
            </div>
            <ScrollDown />
          </div>
        </div>

        <div id="whoIam" className={`${styles.homeMaincotainer}`}>
          <div className={`${styles.textContainer} text-white`}>
            <h1 style={{ textAlign: "center" }} className="text-5xl"></h1>
            <br></br>
            <BioSection />
            <MyPath />
            <br></br>
            <TechStack />
            <div id="projects"></div>
            <ProjectsSection pastProjFav={frontData.pastProjFav} />
          </div>

          <div id="blogs"></div>
          <BlogsSection recentBlogs={frontData.recentBlogs} />

          <Footer authSense={false} authenticated={false} />
        </div>
      </div>
    </ScrollObserverProvider>
  );
};

export default Index;
