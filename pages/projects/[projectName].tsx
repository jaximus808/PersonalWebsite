import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import YouTube from "react-youtube";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import Seo from "../../components/Seo";
import ReadingHeader from "../../components/blog/ReadingHeader";
import ReadingSidebar from "../../components/blog/ReadingSidebar";
import BlogContent from "../../components/blog/BlogContent";
import { useCachedJson } from "../../lib/useCachedJson";
import { ArticleSkeleton } from "../../components/blog/BlogSkeleton";

type Project = {
  id: string;
  name: string;
  mediaLink?: string | null;
  youtube?: boolean | null;
  description?: string | null;
  shortDescription?: string | null;
  linkName?: string | null;
  projectDate?: string | null;
  favorite?: boolean | null;
  projectLinks?: string | null;
};

// A lookup that failed must not replace a good cached copy.
const hasEntry = (data: any) => data?.fail !== true && Boolean(data?.project);

function parseEntry(raw: string | null): Project | null {
  if (!raw) return null;
  try {
    return (JSON.parse(raw)?.project as Project) ?? null;
  } catch {
    return null;
  }
}

type ProjectLink = {
  href: string;
  label: string;
};

const CONFIRM_WINDOW_MS = 4000;

function displayName(name: string): string {
  return name.replace(/_/g, " ");
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    // A bare YYYY-MM-DD parses as UTC midnight; keep it on that calendar day.
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : undefined,
  });
}

// projectLinks holds comma-separated URLs; linkName is the display name and
// only fits when there is a single link. Anything that is not http(s) is
// dropped.
function parseLinks(project: Project): ProjectLink[] {
  const urls = (project.projectLinks ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^https?:\/\//i.test(part));

  return urls.map((href) => {
    let label = "Visit";
    try {
      const host = new URL(href).hostname.replace(/^www\./, "");
      label = host === "github.com" ? "GitHub" : host;
    } catch {
      // keep the fallback label
    }
    if (urls.length === 1 && project.linkName?.trim()) {
      label = project.linkName.trim();
    }
    return { href, label };
  });
}

const ProjectPage = () => {
  const router = useRouter();
  const rawName = router.query.projectName;
  const projectName = router.isReady
    ? Array.isArray(rawName)
      ? rawName[0]
      : rawName
    : undefined;

  // Cached copy shows at once; the background refetch replaces it only when
  // the server's version differs.
  const { raw, loading, failed, retry } = useCachedJson(
    projectName ? `/api/getProject?name=${encodeURIComponent(projectName)}` : null,
    { isUsable: hasEntry },
  );
  const project = useMemo(() => parseEntry(raw), [raw]);
  const waiting = !router.isReady || loading;

  const [authenticated, setAuthenticated] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setConfirmingDelete(false);
    setDeleteError("");
  }, [projectName]);

  // Admin check runs alongside the project fetch and never blocks the page.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/me", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (!controller.signal.aborted) {
          setAuthenticated(Boolean(data?.authenticated));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setAuthenticated(false);
      });
    return () => controller.abort();
  }, []);

  // The delete confirmation quietly expires if the second click never comes.
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(
      () => setConfirmingDelete(false),
      CONFIRM_WINDOW_MS
    );
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  const handleDelete = useCallback(async () => {
    if (!projectName || deleting) return;
    if (!confirmingDelete) {
      setDeleteError("");
      setConfirmingDelete(true);
      return;
    }

    setConfirmingDelete(false);
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/deleteProjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_name: projectName }),
      });
      const data = await res.json().catch(() => null);
      if (!mountedRef.current) return;
      if (data?.pass) {
        router.replace("/projects");
        return;
      }
      setDeleteError(
        data?.msg ||
          (res.status === 401
            ? "You are not signed in. Log in again to delete this project."
            : "The project could not be deleted. Please try again.")
      );
    } catch {
      if (!mountedRef.current) return;
      setDeleteError("The project could not be deleted. Please try again.");
    }
    setDeleting(false);
  }, [projectName, confirmingDelete, deleting, router]);

  const title = project ? displayName(project.name) : "";
  const dated = project ? formatDate(project.projectDate) : "";
  const links = project ? parseLinks(project) : [];

  return (
    <div className="min-h-screen bg-[#121212]">
      <Seo
        title={project ? `${title} | Jaxon Poentis` : "Project | Jaxon Poentis"}
        description={
          project?.shortDescription
            ? `${title} — a project by Jaxon Poentis, software engineer. ${project.shortDescription}`
            : undefined
        }
        path={
          projectName
            ? `/projects/${encodeURIComponent(projectName)}`
            : "/projects"
        }
      />

      {/* Wide screens get the left rail; narrower ones keep the slim top bar. */}
      <div className="min-[1200px]:hidden">
        <ReadingHeader />
      </div>
      <ReadingSidebar section="projects" activeId={projectName} />

      <main className="mx-auto w-full max-w-[700px] px-6 pt-28 md:pt-32 pb-24 font-montserrat">
        {waiting && <ArticleSkeleton />}

        {project && (
          <article>
            <header>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
                <span>Project</span>
                {dated && <span aria-hidden="true">·</span>}
                {dated && <time>{dated}</time>}
                {project.favorite && <span aria-hidden="true">·</span>}
                {project.favorite && <span>Featured</span>}
              </p>

              <h1 className="mt-5 font-cormorant font-light text-4xl md:text-6xl leading-[1.08] text-white">
                {title}
              </h1>

              {project.shortDescription && (
                <p className="mt-6 text-lg md:text-xl font-light leading-relaxed text-white/60">
                  {project.shortDescription}
                </p>
              )}

              {links.length > 0 && (
                <ul className="m-0 mt-7 flex flex-wrap gap-x-7 gap-y-3">
                  {links.map((link) => (
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

            {project.mediaLink &&
              (project.youtube ? (
                <div className="mt-10 aspect-video overflow-hidden rounded-xl bg-white/[0.05] ring-1 ring-white/10">
                  <YouTube
                    videoId={project.mediaLink}
                    className="h-full w-full"
                    iframeClassName="h-full w-full"
                    opts={{
                      width: "100%",
                      height: "100%",
                      playerVars: { autoplay: 0 },
                    }}
                  />
                </div>
              ) : (
                <div className="mt-10 overflow-hidden rounded-xl ring-1 ring-white/10">
                  <img
                    src={project.mediaLink}
                    alt={title}
                    className="w-full max-h-[28rem] object-cover"
                  />
                </div>
              ))}

            <div className="mt-12">
              <BlogContent
                content={project.description ?? ""}
                format="markdown"
              />
            </div>
          </article>
        )}

        {!waiting && !project && !failed && (
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
              Nothing here
            </p>
            <h1 className="mt-5 font-cormorant font-light text-4xl md:text-5xl leading-tight text-white">
              This project could not be found
            </h1>
            <p className="mt-5 font-light leading-relaxed text-white/60">
              It may have been moved or removed.
            </p>
          </div>
        )}

        {!waiting && !project && failed && (
          <div role="alert">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
              Something went wrong
            </p>
            <h1 className="mt-5 font-cormorant font-light text-4xl md:text-5xl leading-tight text-white">
              This project did not load
            </h1>
            <p className="mt-5 font-light leading-relaxed text-white/60">
              The connection may have dropped.{" "}
              <button
                type="button"
                onClick={retry}
                className="text-blue-300/80 underline underline-offset-4 decoration-blue-300/30 transition-colors duration-300 hover:text-blue-300"
              >
                Try again
              </button>
            </p>
          </div>
        )}

        {!waiting && (
          <footer className="mt-16 border-t border-white/10 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/projects"
                className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60 transition-colors duration-300 hover:text-blue-300"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                Back to projects
              </Link>

              {authenticated && project && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className={`text-xs uppercase tracking-[0.18em] transition-colors duration-300 disabled:cursor-not-allowed disabled:text-white/25 ${
                    confirmingDelete
                      ? "text-red-300"
                      : "text-white/40 hover:text-red-300"
                  }`}
                >
                  {deleting
                    ? "Deleting…"
                    : confirmingDelete
                    ? "Click again to confirm"
                    : "Delete project"}
                </button>
              )}
            </div>

            {deleteError && (
              <p
                role="alert"
                className="mt-4 text-right text-sm font-light text-red-300/90"
              >
                {deleteError}
              </p>
            )}
          </footer>
        )}
      </main>
    </div>
  );
};

export default ProjectPage;
