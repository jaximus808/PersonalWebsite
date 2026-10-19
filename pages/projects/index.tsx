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
import { FramedImage } from "../../components/content/Frame";
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
          <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-montserrat">
            Things I&apos;ve designed, built &amp; shipped
          </p>
          <h1 className="mt-3 font-cormorant font-light text-5xl md:text-6xl text-white">
            My Projects
          </h1>
          <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
        </div>

        <div className="mx-auto mt-16 mb-24 grid w-full max-w-6xl grid-cols-1 gap-x-8 gap-y-14 px-6 md:grid-cols-2 md:px-12 lg:grid-cols-3">
          {projects.map((project, i) => (
            <PopInBlock key={project.slug} variant="materialize">
              <Link href={`/projects/${project.slug}`} className="group block font-montserrat">
                {project.cover ? (
                  <FramedImage
                    src={project.cover}
                    alt=""
                    ratio="wide"
                    fit="cover"
                    imgClassName="opacity-85 transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
                  />
                ) : (
                  <div className="aspect-video w-full rounded bg-white/[0.03] ring-1 ring-white/10" />
                )}

                <p className="mt-5 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.18em] text-white/45">
                  <span className="font-cormorant text-[1.35em] normal-case tracking-normal text-white/70">
                    № {String(projects.length - i).padStart(2, "0")}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{year(project.date)}</span>
                  {project.featured && <span aria-hidden="true">·</span>}
                  {project.featured && <span className="text-blue-300/80">Featured</span>}
                </p>

                <h2 className="mt-2 font-cormorant text-3xl font-light leading-tight text-white transition-colors duration-300 group-hover:text-blue-300">
                  {project.title}
                </h2>

                <p className="mt-3 text-sm font-light leading-relaxed text-white/60 line-clamp-3">
                  {project.summary}
                </p>

                <span className="mt-4 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 transition-colors duration-300 group-hover:text-blue-300">
                  View project
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </PopInBlock>
          ))}
        </div>

        <Footer authenticated={false} authSense={false} />
      </div>
    </ScrollObserverProvider>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { projects: listProjects() },
});
