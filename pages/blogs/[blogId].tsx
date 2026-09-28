import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";

import Seo from "../../components/Seo";
import ReadingHeader from "../../components/blog/ReadingHeader";
import BlogContent from "../../components/blog/BlogContent";
import { ArticleSkeleton } from "../../components/blog/BlogSkeleton";
import { blogPreview, readingTime } from "../../lib/blogFormat";

type BlogPost = {
  id: string;
  title: string;
  content: string;
  mediaPic?: string | null;
  datePosted?: string | null;
  format?: string | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "found"; blog: BlogPost }
  | { status: "notfound" }
  | { status: "error" };

const DESCRIPTION_LENGTH = 150;
const CONFIRM_WINDOW_MS = 4000;

function seoDescription(blog: BlogPost): string {
  const preview = blogPreview(blog.content ?? "", blog.format)
    .replace(/\s+/g, " ")
    .trim();
  const clipped =
    preview.length > DESCRIPTION_LENGTH
      ? `${preview.slice(0, DESCRIPTION_LENGTH).trimEnd()}…`
      : preview;
  return `${blog.title} — a blog post by Jaxon Poentis, software engineer. ${clipped}`.trim();
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const BlogPostPage = () => {
  const router = useRouter();
  const rawId = router.query.blogId;
  const blogId = router.isReady
    ? Array.isArray(rawId)
      ? rawId[0]
      : rawId
    : undefined;

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [authenticated, setAuthenticated] = useState(false);
  const [attempt, setAttempt] = useState(0);

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

  // Load the post. Re-runs when the id changes or the reader retries; the
  // AbortController drops any response that belongs to a previous id.
  useEffect(() => {
    if (!router.isReady) return;

    setConfirmingDelete(false);
    setDeleteError("");

    if (!blogId) {
      setState({ status: "notfound" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch(
          `/api/getBlog?id=${encodeURIComponent(blogId)}`,
          { signal: controller.signal }
        );
        if (res.status === 404) {
          if (!controller.signal.aborted) setState({ status: "notfound" });
          return;
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (data.fail || !data.blog) {
          setState({ status: "notfound" });
        } else {
          setState({ status: "found", blog: data.blog as BlogPost });
        }
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    })();

    return () => controller.abort();
  }, [router.isReady, blogId, attempt]);

  // Admin check runs alongside the post fetch and never blocks the article.
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
    if (!blogId || deleting) return;
    if (!confirmingDelete) {
      setDeleteError("");
      setConfirmingDelete(true);
      return;
    }

    setConfirmingDelete(false);
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/deleteblog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogid: blogId }),
      });
      const data = await res.json().catch(() => null);
      if (!mountedRef.current) return;
      if (data?.pass) {
        router.replace("/blog");
        return;
      }
      setDeleteError(
        data?.msg ||
          (res.status === 401
            ? "You are not signed in. Log in again to delete this post."
            : "The post could not be deleted. Please try again.")
      );
    } catch {
      if (!mountedRef.current) return;
      setDeleteError("The post could not be deleted. Please try again.");
    }
    setDeleting(false);
  }, [blogId, confirmingDelete, deleting, router]);

  const blog = state.status === "found" ? state.blog : null;
  const postedOn = blog ? formatDate(blog.datePosted) : "";
  const minutes = blog
    ? Math.max(1, Math.round(readingTime(blog.content ?? "", blog.format)))
    : 0;

  return (
    <div className="min-h-screen bg-[#121212]">
      <Seo
        title={blog ? `${blog.title} | Jaxon Poentis` : "Blog | Jaxon Poentis"}
        description={
          blog
            ? seoDescription(blog)
            : "Notes and write-ups by Jaxon Poentis, software engineer."
        }
        path={blogId ? `/blogs/${blogId}` : "/blog"}
        ogType="article"
      />

      <ReadingHeader />

      <main className="mx-auto w-full max-w-[700px] px-6 pt-28 md:pt-32 pb-24 font-montserrat">
        {state.status === "loading" && <ArticleSkeleton />}

        {blog && (
          <article>
            <header>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
                {postedOn && (
                  <time dateTime={blog.datePosted ?? undefined}>
                    {postedOn}
                  </time>
                )}
                {postedOn && <span aria-hidden="true">·</span>}
                <span>{minutes} min read</span>
              </p>

              <h1 className="mt-5 font-cormorant font-light text-4xl md:text-6xl leading-[1.08] text-white">
                {blog.title}
              </h1>
            </header>

            {blog.mediaPic && (
              <div className="mt-10 overflow-hidden rounded-xl ring-1 ring-white/10">
                <img
                  src={blog.mediaPic}
                  alt={blog.title}
                  className="w-full max-h-[28rem] object-cover"
                />
              </div>
            )}

            <div className="mt-12">
              <BlogContent content={blog.content ?? ""} format={blog.format} />
            </div>
          </article>
        )}

        {state.status === "notfound" && (
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
              Nothing here
            </p>
            <h1 className="mt-5 font-cormorant font-light text-4xl md:text-5xl leading-tight text-white">
              This post could not be found
            </h1>
            <p className="mt-5 font-light leading-relaxed text-white/60">
              It may have been moved or removed.
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div role="alert">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
              Something went wrong
            </p>
            <h1 className="mt-5 font-cormorant font-light text-4xl md:text-5xl leading-tight text-white">
              This post did not load
            </h1>
            <p className="mt-5 font-light leading-relaxed text-white/60">
              The connection may have dropped.{" "}
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="text-blue-300/80 underline underline-offset-4 decoration-blue-300/30 transition-colors duration-300 hover:text-blue-300"
              >
                Try again
              </button>
            </p>
          </div>
        )}

        {state.status !== "loading" && (
          <footer className="mt-16 border-t border-white/10 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/blog"
                className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60 transition-colors duration-300 hover:text-blue-300"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                Back to blog
              </Link>

              {authenticated && blog && (
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
                    : "Delete post"}
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

export default BlogPostPage;
