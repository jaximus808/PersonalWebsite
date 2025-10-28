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

const BLOGS_PER_PAGE = 6;

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
        <div>
          <h1 className="text-5xl font-bold text-white mb-8 text-center mt-10">
            My Blogs
          </h1>
          <div className="">
            <div className="mt-2 relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-2 "></div>
          </div>
        </div>
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-white text-2xl">Blogs Loading...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 py-4 px-12 ">
              {blogs
                .slice(
                  blogPage * BLOGS_PER_PAGE,
                  Math.min((blogPage + 1) * BLOGS_PER_PAGE, blogs.length)
                )
                .map((blog) => (
                  <Link
                    key={blog.id}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer group"
                    href={`/blogs/${blog.id}`}
                  >
                    {/* Blog Image */}
                    {blog.mediaPic && (
                      <div className="mb-4 rounded-xl overflow-hidden">
                        <img
                          src={blog.mediaPic}
                          alt={blog.title}
                          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}

                    {/* Blog Title */}
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-200 transition-colors">
                      {blog.title}
                    </h3>

                    {/* Blog Date */}
                    <div className="flex items-center text-white/70 mb-4">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        {blog.datePosted
                          ? new Date(blog.datePosted).toDateString()
                          : ""}
                      </span>
                    </div>

                    {/* Blog Content Preview */}
                    <div className="text-white/80 line-clamp-3 mb-4">
                      {blog.content.split("*").map((data: any, key: any) => {
                        if (data.length == 0) return <div key={key}></div>;
                        if (data.length >= 3 && data.substring(0, 3) == "<i>") {
                          return <></>;
                        } else if (
                          data.length >= 3 &&
                          data.substring(0, 3) == "<b>"
                        ) {
                          return (
                            <h3
                              key={key}
                              className="font-bold"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {data.substring(3)}
                            </h3>
                          );
                        } else {
                          return (
                            <h3 key={key} style={{ whiteSpace: "pre-wrap" }}>
                              {data}
                            </h3>
                          );
                        }
                      })}
                    </div>

                    <div className="text-blue-300 font-medium group-hover:text-blue-200 flex items-center">
                      Read more
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
            </div>

            {/* Pagination */}
            {blogs.length > BLOGS_PER_PAGE && (
              <div className="flex justify-center items-center gap-4 pb-12">
                <button
                  onClick={movePageBackward}
                  disabled={!showBackButton}
                  className={`px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white flex items-center gap-2 transition-all shadow-lg ${
                    showBackButton
                      ? "hover:bg-white/20 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                  Previous
                </button>

                <span className="text-white bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
                  Page {blogPage + 1} of{" "}
                  {Math.ceil(blogs.length / BLOGS_PER_PAGE)}
                </span>

                <button
                  onClick={movePageForward}
                  disabled={!showForwardButton}
                  className={`px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white flex items-center gap-2 transition-all shadow-lg ${
                    showForwardButton
                      ? "hover:bg-white/20 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  Next
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </>

      <Footer authenticated={false} authSense={false} />
    </div>
  );
};

export default BlogPage;
