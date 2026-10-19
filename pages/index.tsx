import type { NextPage } from "next";
import Link from "next/link";
import Seo, { PERSON_JSONLD } from "../components/Seo";
import styles from "../styles/Home.module.css";
import Header from "../components/header";
import Footer from "../components/footer";
import Background from "../components/backgroundThree";

import type { GetStaticProps } from "next";

import {
  PopInBlock,
  ScrollObserverProvider,
} from "../components/popinBlockContext";
import GradientBG from "../components/gradientbg";
import MyPath from "../components/myPath";
import HeroIntro from "../components/HeroIntro";
import About from "../components/About";
import SectionHead, { HOME_COLUMN } from "../components/SectionHead";
import { FramedImage } from "../components/content/Frame";
import { listPosts, listProjects, type PostMeta, type ProjectMeta } from "../lib/content";
import { formatDate } from "../lib/contentText";

type Props = {
  projects: ProjectMeta[];
  latestPost: PostMeta | null;
};

const Index = ({ projects, latestPost }: Props) => {
  return (
    <ScrollObserverProvider>
      <div className="text-caviar ">
        <Background fadeOnScroll offsetRight />
        <GradientBG fadeOnScroll />
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
        <Header hideOnHero />

        <div className={styles.animateFadeIn}>
          <HeroIntro />
        </div>
        <div id="whoIam" className={`${styles.homeMaincotainer} `}>
          <div className={` ${styles.textContainer}   text-white`}>
            <About />
            <div id="path"></div>

            <MyPath />

            <div id="projects"></div>
            <div className={`pt-4 mt-32 ${styles.textContainer} text-white`}>
              <SectionHead n={3} label="Projects" />

              <div className={`${HOME_COLUMN} mt-12`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <PopInBlock key={project.slug} variant="materialize">
                      <Link
                        href={`/projects/${project.slug}`}
                        className={`${styles.stagePanel} group block h-full overflow-hidden rounded`}
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
              <div className={`${HOME_COLUMN} mt-10`}>
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
          <div className={`pt-4 mt-32 pb-4 ${styles.textContainer} text-white`}>
            <SectionHead n={4} label="Writing" />

            {latestPost && (
              <div className={`${HOME_COLUMN} mt-12`}>
                {/* Editorial list — mirrors the /blog page */}
                <div className="text-left">
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
                <div className="mt-10">
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
