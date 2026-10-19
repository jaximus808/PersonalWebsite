import type { GetStaticProps } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import Seo from "../../components/Seo";
import Header from "../../components/header";
import Footer from "../../components/footer";
import QuietBackground from "../../components/QuietBackground";
import {
  ScrollObserverProvider,
  PopInBlock,
} from "../../components/popinBlockContext";
import { listProjects, type ProjectMeta } from "../../lib/content";

type Props = { projects: ProjectMeta[] };

function year(ymd: string): string {
  return ymd.slice(0, 4);
}

export default function ProjectsPage({ projects }: Props) {
  return (
    <ScrollObserverProvider>
      <div>
        <Seo
          title="Projects | Jaxon Poentis — Software Engineer"
          description="Software projects by Jaxon Poentis — distributed systems, AI agents, robotics, XR, and full-stack builds from a software engineer with experience at Capital One and Tesla."
          path="/projects"
        />
        <Header />
        <QuietBackground />

        <div className="pt-24 md:pt-28 text-center">
          <h1 className="font-cormorant font-light text-5xl md:text-6xl text-white">
            My Projects
          </h1>
          <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
        </div>

        {/* Editorial list — one calm row per project, hairline dividers,
            the same rhythm as /blog */}
        <div className="mx-auto w-[90%] max-w-3xl mt-16 pb-20 font-montserrat">
          <div className="border-t border-white/10">
            {projects.map((project, i) => (
              <PopInBlock key={project.slug} variant="materialize">
                <Link href={`/projects/${project.slug}`} className="group block">
                  <article className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-6 md:gap-10 py-9 border-b border-white/10 transition-colors duration-500 group-hover:border-white/20">
                    <div className="min-w-0">
                      <p className="flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.18em] text-white/45">
                        <span className="font-cormorant text-[1.35em] normal-case tracking-normal text-white/70">
                          № {String(projects.length - i).padStart(2, "0")}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{year(project.date)}</span>
                        {project.featured && <span aria-hidden="true">·</span>}
                        {project.featured && <span className="text-blue-300/80">Featured</span>}
                      </p>

                      <h2 className="mt-3 font-cormorant font-light text-3xl md:text-4xl text-white leading-tight transition-colors duration-300 group-hover:text-blue-300">
                        {project.title}
                      </h2>

                      <p className="mt-3 text-sm md:text-base text-white/60 font-light leading-relaxed line-clamp-2">
                        {project.summary}
                      </p>

                      <span className="mt-5 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 transition-colors duration-300 group-hover:text-blue-300">
                        View project
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>

                    {project.cover && (
                      <div className="hidden md:block relative h-28 w-44 flex-none overflow-hidden rounded ring-1 ring-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={project.cover}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                        />
                      </div>
                    )}
                  </article>
                </Link>
              </PopInBlock>
            ))}
          </div>
        </div>

        <Footer authenticated={false} authSense={false} />
      </div>
    </ScrollObserverProvider>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { projects: listProjects() },
});
