import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import Seo, { SITE_URL } from "../../components/Seo";
import ReadingHeader from "../../components/blog/ReadingHeader";
import ReadingSidebar from "../../components/blog/ReadingSidebar";
import ReadingProgress from "../../components/blog/ReadingProgress";
import EntryPager, { type PagerEntry } from "../../components/blog/EntryPager";
import MdxContent from "../../components/content/MdxContent";
import Video from "../../components/content/Video";
import Wide from "../../components/content/Wide";
import { FramedImage } from "../../components/content/Frame";
import {
  getProject,
  listProjects,
  projectLinksList,
  type Entry,
  type EntryLink,
  type ProjectMeta,
} from "../../lib/content";

type Props = {
  project: Entry<ProjectMeta>;
  /** Position in the catalogue, oldest project = 1. */
  number: number;
  rail: EntryLink[];
  older: PagerEntry | null;
  newer: PagerEntry | null;
};

function monthYear(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function HeroMedia({ meta }: { meta: ProjectMeta }) {
  if (meta.hideCover || (!meta.youtube && !meta.cover)) return null;
  return (
    <Wide>
      <div className="relative isolate mt-14">
        {/* A faint pool of light under the media, so it sits on the stage
            rather than on the page. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-16 -inset-y-12 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(163,203,255,0.09),transparent_68%)]"
        />
        {meta.youtube ? (
          <Video youtube={meta.youtube} poster={meta.cover ?? undefined} title={meta.title} priority />
        ) : (
          <FramedImage src={meta.cover!} alt={meta.title} ratio="wide" priority />
        )}
      </div>
    </Wide>
  );
}

export default function ProjectPage({ project, number, rail, older, newer }: Props) {
  const { meta, source } = project;
  const href = `/projects/${meta.slug}`;

  return (
    <div className="min-h-screen overflow-x-clip bg-[#121212]">
      <Seo
        title={`${meta.title} | Jaxon Poentis`}
        description={`${meta.title} — a project by Jaxon Poentis, software engineer. ${meta.summary}`}
        path={href}
        ogImage={meta.cover?.startsWith("/") ? `${SITE_URL}${meta.cover}` : undefined}
      />
      <ReadingProgress />

      <div className="min-[1200px]:hidden">
        <ReadingHeader />
      </div>
      <ReadingSidebar section="projects" items={rail} activeHref={href} />

      <main className="mx-auto w-full max-w-[700px] px-6 pt-28 md:pt-32 pb-24 font-montserrat">
        <article>
          <header>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
              <span>
                Project <span className="font-cormorant text-[1.35em] normal-case tracking-normal text-white/80">№ {String(number).padStart(2, "0")}</span>
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={meta.date}>{monthYear(meta.date)}</time>
              {meta.featured && <span aria-hidden="true">·</span>}
              {meta.featured && <span className="text-blue-300/80">Featured</span>}
            </p>

            <h1 className="mt-5 font-cormorant font-light text-5xl md:text-7xl leading-[1.02] text-white">
              {meta.title}
            </h1>

            <p className="mt-6 text-lg md:text-xl font-light leading-relaxed text-white/60">
              {meta.summary}
            </p>

            {meta.links.length > 0 && (
              <ul className="m-0 mt-8 flex flex-wrap gap-x-7 gap-y-3">
                {meta.links.map((link) => (
                  <li key={link.href} className="m-0">
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-blue-300/80 transition-colors duration-300 hover:text-blue-300"
                    >
                      {link.label}
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </header>

          <HeroMedia meta={meta} />

          <div className="mt-14">
            <MdxContent source={source} />
          </div>
        </article>

        <EntryPager previous={older} next={newer} />

        <footer className="mt-16 border-t border-white/10 pt-8">
          <Link
            href="/projects"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60 transition-colors duration-300 hover:text-blue-300"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to projects
          </Link>
        </footer>
      </main>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: listProjects().map((project) => ({ params: { slug: project.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props, { slug: string }> = async ({ params }) => {
  const projects = listProjects();
  const index = projects.findIndex((project) => project.slug === params!.slug);
  const pager = (project: ProjectMeta | undefined, eyebrow: string): PagerEntry | null =>
    project
      ? { href: `/projects/${project.slug}`, label: project.title, eyebrow, image: project.cover }
      : null;

  return {
    props: {
      project: await getProject(params!.slug),
      number: projects.length - index,
      rail: projectLinksList(projects),
      // The list is newest first.
      older: pager(projects[index + 1], "Earlier project"),
      newer: pager(projects[index - 1], "Later project"),
    },
  };
};
