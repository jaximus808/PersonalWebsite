import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Header from "../components/header";
import Footer from "../components/footer";
import Background from "../components/backgroundThree";
import { PrismaClient, Prisma, Blog } from "@prisma/client";
import { useState, useEffect, useRef } from "react";
import * as cookies from "cookie";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft, ArrowRight } from "lucide-react";

import jsonwebtoken from "jsonwebtoken";

import { GetStaticProps, GetStaticPaths, GetServerSideProps } from "next";
import UnderConstruction from "../components/UnderConstruction";
import GradientBG from "../components/gradientbg";
import {
  ScrollObserverProvider,
  PopInBlock,
} from "../components/popinBlockContext";

const BLOGS_PER_PAGE = 6;

// Distill a blog's markup-lite content into a quiet plain-text preview:
// drop image markers (*<i>...*), unwrap bold headings (*<b>...*), keep prose.
function blogPreview(content: string): string {
  return content
    .split("*")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment.substring(0, 3) !== "<i>")
    .map((segment) =>
      segment.substring(0, 3) === "<b>" ? segment.substring(3) : segment
    )
    .join(" ");
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const parsedCookies = cookies.parse(
    context.req.headers.cookie ? context.req.headers.cookie : ""
  );

  const token = parsedCookies.token;

  let authenticated = false;
  if (!token) {
    authenticated = false;
  } else {
    try {
      jsonwebtoken.verify(token, process.env.ADMIN_PASS!);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  console.log(authenticated);
  return {
    props: {
      auth: authenticated,
    },
  };
};
interface BlogPageProps {
  auth: boolean;
}

const BlogPage: React.FC<BlogPageProps> = ({ auth }) => {
  const [loading, isLoading] = useState(true);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);

  async function getInitialData() {
    try {
      const res = await fetch("/api/getBlogs/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      setBlogs(data.blogs);
      setShowForwardButton(data.blogs.length > 6);
      isLoading(false);
      console.log(data);
    } catch (e) {
      return { fail: true, pastProjFav: [], recentBlogs: [] };
    }
  }

  useEffect(() => {
    getInitialData();
  }, []);

  const AddBlog = async (e: any) => {
    e.preventDefault();
    console.log("wtf");
    console.log(customDate == "false");
    console.log("HELLo");
    e.preventDefault();
    const response = await fetch("/api/admin/addblog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(
        customDate === "false"
          ? {
              title: blogName,
              mediaPic: mediaInput,
              content: blogContent,
            }
          : {
              title: blogName,
              mediaPic: mediaInput,
              content: blogContent,
              datePosted: blogDate,
            }
      ),
    });
    const data = await response.json();
    if (data.pass) {
      location.reload();
    } else {
      setResponse(data.msg);
    }
  };
  const logOut = async () => {
    const logProject = await fetch("/api/admin/logout").then((res) =>
      res.json()
    );
    location.reload();
  };
  const [blogPage, setBlogPage] = useState(0);

  const [showForwardButton, setShowForwardButton] = useState(blogs.length > 6);
  const [showBackButton, setShowBackButton] = useState(false);

  const [blogName, setBlogName] = useState("");
  const [mediaInput, setMediaInput] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogDate, setBlogDate] = useState("");
  const [responseText, setResponse] = useState("");

  const [customDate, setCustomDate] = useState("false");

  // console.log(showForwardButton);

  const movePageForward = (): void => {
    if (blogs.length > (blogPage + 1) * BLOGS_PER_PAGE) {
      setBlogPage(blogPage + 1);
      if (blogPage + 1 * BLOGS_PER_PAGE >= blogs.length - BLOGS_PER_PAGE) {
        setShowForwardButton(false);
      }
    }
    setShowBackButton(true);
  };

  const movePageBackward = (): void => {
    if (blogPage > 0) {
      setBlogPage(blogPage - 1);
      if ((blogPage - 1) * BLOGS_PER_PAGE <= 0) {
        setShowBackButton(false);
      }
    }
    setShowForwardButton(true);
  };
  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>): void => {
    AddBlog(e);
  };

  return (
    <ScrollObserverProvider>
      <div>
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <Background />
      <GradientBG />
      <>
        {/* Admin Panel Toggle */}
        {auth && (
          <div className="flex justify-end mb-8 gap-4">
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all shadow-lg"
            >
              {showAdminPanel ? "Hide Admin Panel" : "Show Admin Panel"}
            </button>
            <button
              onClick={logOut}
              className="px-6 py-2 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-lg text-white hover:bg-red-500/30 transition-all shadow-lg"
            >
              Logout
            </button>
          </div>
        )}

        {/* Admin Form */}
        {auth && showAdminPanel && (
          <div className="mb-12 bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Create New Blog Post
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2 font-medium">
                  Title
                </label>
                <input
                  type="text"
                  value={blogName}
                  onChange={(e) => setBlogName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Enter blog title..."
                  required
                />
              </div>
              <div>
                <label className="block text-white mb-2 font-medium">
                  Image URL
                </label>
                <input
                  type="text"
                  value={mediaInput}
                  onChange={(e) => setMediaInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Enter blog title..."
                  required
                />
              </div>
              <div>
                <label className="block text-white mb-2 font-medium">
                  Content
                </label>
                <textarea
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                  placeholder="Write your blog content..."
                  required
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={customDate === "true"}
                    onChange={(e) =>
                      setCustomDate(e.target.checked ? "true" : "false")
                    }
                    className="mr-2"
                  />
                  Use custom date
                </label>
              </div>

              {customDate === "true" && (
                <div>
                  <label className="block text-white mb-2 font-medium">
                    Custom Date
                  </label>
                  <input
                    type="datetime-local"
                    value={blogDate}
                    onChange={(e) => setBlogDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
              )}

              {responseText && (
                <div className="text-red-300 bg-red-500/20 px-4 py-2 rounded-lg">
                  {responseText}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full px-6 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white font-semibold hover:bg-white/30 transition-all shadow-lg"
              >
                Publish Blog Post
              </button>
            </div>
          </div>
        )}
        <div className="pt-24 md:pt-28 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-montserrat">
            Thoughts, notes & what I&apos;m building
          </p>
          <h1 className="mt-3 font-cormorant font-light text-5xl md:text-6xl text-white">
            The Blog
          </h1>
          <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
        </div>
        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-sm uppercase tracking-[0.18em] text-white/50 font-montserrat">
              Loading…
            </div>
          </div>
        ) : (
          <div className="mx-auto w-[90%] max-w-3xl mt-16">
            {/* Editorial list — one calm row per post, hairline dividers */}
            <div className="border-t border-white/10">
              {blogs
                .slice(
                  blogPage * BLOGS_PER_PAGE,
                  Math.min((blogPage + 1) * BLOGS_PER_PAGE, blogs.length)
                )
                .map((blog) => (
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
                            {blogPreview(blog.content)}
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

            {/* Pagination — quiet, text-only */}
            {blogs.length > BLOGS_PER_PAGE && (
              <div className="flex justify-center items-center gap-8 pt-10 pb-20 font-montserrat">
                <button
                  onClick={movePageBackward}
                  disabled={!showBackButton}
                  className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] transition-colors duration-300 ${
                    showBackButton
                      ? "text-white/70 hover:text-blue-300 cursor-pointer"
                      : "text-white/25 cursor-not-allowed"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>

                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-white/45">
                  {blogPage + 1} / {Math.ceil(blogs.length / BLOGS_PER_PAGE)}
                </span>

                <button
                  onClick={movePageForward}
                  disabled={!showForwardButton}
                  className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] transition-colors duration-300 ${
                    showForwardButton
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
