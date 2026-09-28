import type { NextPage } from "next";
import Seo from "../components/Seo";
import Header from "../components/header";
import Footer from "../components/footer";
import Background from "../components/backgroundThree";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Calendar, ArrowLeft, ArrowRight } from "lucide-react";

import GradientBG from "../components/gradientbg";
import {
  ScrollObserverProvider,
  PopInBlock,
} from "../components/popinBlockContext";
import BlogContent from "../components/blog/BlogContent";
import { BlogListSkeleton } from "../components/blog/BlogSkeleton";
import { blogPreview } from "../lib/blogFormat";

const BLOGS_PER_PAGE = 6;

// Only the fields this page reads. Declared locally so the page compiles
// whether or not the generated Prisma client knows about `format` yet.
type BlogListItem = {
  id: string;
  title: string;
  content: string;
  mediaPic?: string | null;
  datePosted?: string | null;
  format?: string | null;
};

type ListStatus = "loading" | "ready" | "error";
type EditorMode = "write" | "preview";

const FIELD_LABEL =
  "block mb-2 text-[0.7rem] uppercase tracking-[0.18em] text-white/60";
const FIELD_INPUT =
  "w-full px-4 py-3 bg-white/[0.04] border border-white/15 rounded-lg text-white font-light placeholder-white/30 transition-colors duration-300 focus:outline-none focus:border-blue-300/60";
const QUIET_BUTTON =
  "text-xs uppercase tracking-[0.18em] text-white/60 transition-colors duration-300 hover:text-blue-300";

const BlogPage: NextPage = () => {
  const [status, setStatus] = useState<ListStatus>("loading");
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [blogPage, setBlogPage] = useState(0);

  const [auth, setAuth] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [blogName, setBlogName] = useState("");
  const [mediaInput, setMediaInput] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogDate, setBlogDate] = useState("");
  const [customDate, setCustomDate] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("write");
  const [responseText, setResponse] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Each load gets a ticket; a response is only applied if its ticket is
  // still the latest and the page is still mounted.
  const loadTicket = useRef(0);

  const loadBlogs = useCallback(async () => {
    const ticket = ++loadTicket.current;
    setStatus("loading");
    try {
      const res = await fetch("/api/getBlogs/");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      if (ticket !== loadTicket.current) return;
      if (data.fail || !Array.isArray(data.blogs)) {
        setStatus("error");
        return;
      }
      setBlogs(data.blogs);
      setBlogPage(0);
      setStatus("ready");
    } catch {
      if (ticket !== loadTicket.current) return;
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadBlogs();
    return () => {
      // Invalidate any in-flight load on unmount.
      loadTicket.current++;
    };
  }, [loadBlogs]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/me", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (!controller.signal.aborted) setAuth(Boolean(data?.authenticated));
      })
      .catch(() => {
        if (!controller.signal.aborted) setAuth(false);
      });
    return () => controller.abort();
  }, []);

  const addBlog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (publishing) return;
    setResponse("");
    setPublishing(true);
    try {
      const response = await fetch("/api/admin/addblog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          customDate && blogDate
            ? {
                title: blogName,
                mediaPic: mediaInput,
                content: blogContent,
                datePosted: blogDate,
              }
            : {
                title: blogName,
                mediaPic: mediaInput,
                content: blogContent,
              }
        ),
      });
      const data = await response.json().catch(() => null);
      if (data?.pass) {
        location.reload();
        return;
      }
      setResponse(
        data?.msg ||
          (response.status === 401
            ? "You are not signed in. Log in again to publish."
            : "The post could not be published. Please try again.")
      );
    } catch {
      setResponse("The post could not be published. Please try again.");
    }
    setPublishing(false);
  };

  const logOut = async () => {
    try {
      await fetch("/api/admin/logout");
    } finally {
      location.reload();
    }
  };

  // Pagination is derived from the page index and the list, never stored.
  const totalPages = Math.max(1, Math.ceil(blogs.length / BLOGS_PER_PAGE));
  const currentPage = Math.min(blogPage, totalPages - 1);
  const canGoBack = currentPage > 0;
  const canGoForward = currentPage < totalPages - 1;
  const visibleBlogs = blogs.slice(
    currentPage * BLOGS_PER_PAGE,
    (currentPage + 1) * BLOGS_PER_PAGE
  );

  const movePageForward = (): void => {
    if (canGoForward) setBlogPage(currentPage + 1);
  };

  const movePageBackward = (): void => {
    if (canGoBack) setBlogPage(currentPage - 1);
  };

  return (
    <ScrollObserverProvider>
      <div>
        <Seo
          title="Blog | Jaxon Poentis — Software Engineer"
          description="Notes and write-ups by Jaxon Poentis, software engineer — building distributed systems, AI agents, and robotics; intern at Capital One and previously Tesla."
          path="/blog"
        />
        <Header />
        <Background />
        <GradientBG />
        <>
          {/* Admin bar — padded to clear the fixed header */}
          {auth && (
            <div className="relative mx-auto w-[90%] max-w-3xl pt-24 md:pt-28 font-montserrat">
              <div className="flex justify-end items-center gap-8">
                <button
                  type="button"
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  aria-expanded={showAdminPanel}
                  className={QUIET_BUTTON}
                >
                  {showAdminPanel ? "Close editor" : "New post"}
                </button>
                <button
                  type="button"
                  onClick={logOut}
                  className="text-xs uppercase tracking-[0.18em] text-white/40 transition-colors duration-300 hover:text-red-300"
                >
                  Log out
                </button>
              </div>

              {/* Admin Form */}
              {showAdminPanel && (
                <form
                  onSubmit={addBlog}
                  className="mt-8 rounded-2xl border border-white/10 bg-[#121212]/80 backdrop-blur-md p-6 md:p-8"
                >
                  <h2 className="font-cormorant font-light text-3xl text-white">
                    New post
                  </h2>
                  <div className="mt-8 space-y-6">
                    <div>
                      <label htmlFor="blog-title" className={FIELD_LABEL}>
                        Title
                      </label>
                      <input
                        id="blog-title"
                        type="text"
                        value={blogName}
                        onChange={(e) => setBlogName(e.target.value)}
                        className={FIELD_INPUT}
                        placeholder="Enter blog title..."
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="blog-image" className={FIELD_LABEL}>
                        Image URL
                      </label>
                      <input
                        id="blog-image"
                        type="text"
                        value={mediaInput}
                        onChange={(e) => setMediaInput(e.target.value)}
                        className={FIELD_INPUT}
                        placeholder="https://example.com/cover.jpg"
                        required
                      />
                    </div>
                    <div>
                      <div className="mb-2 flex items-end justify-between gap-4">
                        <label
                          htmlFor="blog-content"
                          className={`${FIELD_LABEL} mb-0`}
                        >
                          Content (Markdown)
                        </label>
                        <div
                          role="group"
                          aria-label="Editor mode"
                          className="flex items-center gap-5"
                        >
                          {(["write", "preview"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setEditorMode(mode)}
                              aria-pressed={editorMode === mode}
                              className={`pb-1 border-b text-[0.7rem] uppercase tracking-[0.18em] transition-colors duration-300 ${
                                editorMode === mode
                                  ? "border-blue-300/60 text-white"
                                  : "border-transparent text-white/45 hover:text-blue-300"
                              }`}
                            >
                              {mode === "write" ? "Write" : "Preview"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* The textarea stays mounted in preview so required
                          validation and the draft itself are preserved. */}
                      <textarea
                        id="blog-content"
                        value={blogContent}
                        onChange={(e) => setBlogContent(e.target.value)}
                        rows={18}
                        hidden={editorMode !== "write"}
                        className={`${FIELD_INPUT} min-h-[24rem] resize-y font-mono text-sm leading-relaxed`}
                        placeholder={
                          "## A heading\n\nWrite your post in markdown..."
                        }
                      />

                      {editorMode === "preview" && (
                        <div className="min-h-[24rem] rounded-lg border border-white/15 bg-[#121212] px-5 py-6 md:px-8">
                          {blogContent.trim() ? (
                            <BlogContent
                              content={blogContent}
                              format="markdown"
                            />
                          ) : (
                            <p className="text-sm font-light text-white/40">
                              Nothing to preview yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center text-sm font-light text-white/70">
                        <input
                          type="checkbox"
                          checked={customDate}
                          onChange={(e) => setCustomDate(e.target.checked)}
                          className="mr-2"
                        />
                        Use custom date
                      </label>
                    </div>

                    {customDate && (
                      <div>
                        <label htmlFor="blog-date" className={FIELD_LABEL}>
                          Custom Date
                        </label>
                        <input
                          id="blog-date"
                          type="datetime-local"
                          value={blogDate}
                          onChange={(e) => setBlogDate(e.target.value)}
                          className={FIELD_INPUT}
                        />
                      </div>
                    )}

                    {responseText && (
                      <p
                        role="alert"
                        className="text-sm font-light text-red-300/90"
                      >
                        {responseText}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={publishing || !blogContent.trim()}
                      className="w-full px-6 py-3 rounded-lg border border-white/20 text-xs uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:border-blue-300/60 hover:text-blue-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    >
                      {publishing ? "Publishing…" : "Publish post"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div
            className={`text-center ${auth ? "pt-12" : "pt-24 md:pt-28"}`}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-montserrat">
              Thoughts, notes & what I&apos;m building
            </p>
            <h1 className="mt-3 font-cormorant font-light text-5xl md:text-6xl text-white">
              The Blog
            </h1>
            <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
          </div>

          {status === "loading" && (
            <div className="mx-auto w-[90%] max-w-3xl mt-16 pb-20">
              <BlogListSkeleton />
            </div>
          )}

          {status === "error" && (
            <div
              role="alert"
              className="mx-auto w-[90%] max-w-3xl mt-16 min-h-[40vh] text-center font-montserrat"
            >
              <p className="font-light text-white/60">
                The posts did not load. The connection may have dropped.
              </p>
              <button
                type="button"
                onClick={loadBlogs}
                className="mt-5 text-xs uppercase tracking-[0.18em] text-blue-300/80 transition-colors duration-300 hover:text-blue-300"
              >
                Try again
              </button>
            </div>
          )}

          {status === "ready" && (
            <div className="mx-auto w-[90%] max-w-3xl mt-16">
              {blogs.length === 0 && (
                <p className="min-h-[30vh] text-center font-montserrat font-light text-white/60">
                  No posts yet.
                </p>
              )}

              {/* Editorial list — one calm row per post, hairline dividers */}
              {blogs.length > 0 && (
                <div className="border-t border-white/10">
                  {visibleBlogs.map((blog) => (
                    <PopInBlock key={blog.id} variant="materialize">
                      <Link href={`/blogs/${blog.id}`} className="group block">
                        <article className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-6 md:gap-10 py-9 border-b border-white/10 transition-colors duration-500 group-hover:border-white/20">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-white/45 font-montserrat">
                              <Calendar className="w-3.5 h-3.5" />
                              {blog.datePosted
                                ? new Date(blog.datePosted).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )
                                : ""}
                            </p>

                            <h2 className="mt-3 font-cormorant font-light text-3xl md:text-4xl text-white leading-tight transition-colors duration-300 group-hover:text-blue-300">
                              {blog.title}
                            </h2>

                            <p className="mt-3 text-sm md:text-base text-white/60 font-light leading-relaxed line-clamp-2">
                              {blogPreview(blog.content ?? "", blog.format)}
                            </p>

                            <span className="mt-5 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 transition-colors duration-300 group-hover:text-blue-300">
                              Read
                              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                            </span>
                          </div>

                          {blog.mediaPic && (
                            <div className="hidden md:block relative h-28 w-44 flex-none overflow-hidden rounded-xl ring-1 ring-white/10">
                              <img
                                src={blog.mediaPic}
                                alt={blog.title}
                                className="h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                              />
                            </div>
                          )}
                        </article>
                      </Link>
                    </PopInBlock>
                  ))}
                </div>
              )}

              {/* Pagination — quiet, text-only */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-8 pt-10 pb-20 font-montserrat">
                  <button
                    type="button"
                    onClick={movePageBackward}
                    disabled={!canGoBack}
                    className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] transition-colors duration-300 ${
                      canGoBack
                        ? "text-white/70 hover:text-blue-300 cursor-pointer"
                        : "text-white/25 cursor-not-allowed"
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="text-[0.7rem] uppercase tracking-[0.18em] text-white/45">
                    {currentPage + 1} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={movePageForward}
                    disabled={!canGoForward}
                    className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] transition-colors duration-300 ${
                      canGoForward
                        ? "text-white/70 hover:text-blue-300 cursor-pointer"
                        : "text-white/25 cursor-not-allowed"
                    }`}
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>

        <Footer authenticated={false} authSense={false} />
      </div>
    </ScrollObserverProvider>
  );
};

export default BlogPage;
