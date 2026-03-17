import Head from "next/head";
import Header from "../components/header";
import Footer from "../components/footer";
import { Blog } from "@prisma/client";
import { useState, useEffect } from "react";
import * as cookies from "cookie";
import Link from "next/link";
import jsonwebtoken from "jsonwebtoken";
import { GetServerSideProps } from "next";
import Pagination from "../components/Pagination";
import { usePagination } from "../hooks/usePagination";

const BLOGS_PER_PAGE = 7;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const parsedCookies = cookies.parse(
    context.req.headers.cookie ? context.req.headers.cookie : ""
  );
  const token = parsedCookies.token;
  let authenticated = false;
  if (token) {
    try {
      jsonwebtoken.verify(token, process.env.ADMIN_PASS!);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }
  return { props: { auth: authenticated } };
};

function getReadTime(content: string): string {
  const plainText = content
    .split("*")
    .map((s) => {
      if (s.length >= 3 && s.substring(0, 3) === "<i>") return "";
      if (s.length >= 3 && s.substring(0, 3) === "<b>") return s.substring(3);
      return s;
    })
    .join(" ");
  const words = plainText.trim().split(/\s+/).filter((w) => w.length > 0).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function getExcerpt(content: string): string {
  for (const seg of content.split("*")) {
    if (seg.length === 0) continue;
    if (seg.substring(0, 3) === "<i>") continue;
    if (seg.substring(0, 3) === "<b>") {
      const text = seg.substring(3).trim();
      if (text.length > 0) return text;
      continue;
    }
    const text = seg.trim();
    if (text.length > 0) return text;
  }
  return "";
}

function formatDate(dateStr: any): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface BlogPageProps {
  auth: boolean;
}

const BlogPage: React.FC<BlogPageProps> = ({ auth }) => {
  const [loading, isLoading] = useState(true);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const { page, totalPages, canGoBack, canGoForward, goForward, goBack, sliceItems } =
    usePagination(blogs.length, BLOGS_PER_PAGE);

  const [blogName, setBlogName] = useState("");
  const [mediaInput, setMediaInput] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogDate, setBlogDate] = useState("");
  const [responseText, setResponse] = useState("");
  const [customDate, setCustomDate] = useState("false");

  async function getInitialData() {
    try {
      const res = await fetch("/api/getBlogs/", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setBlogs(data.blogs);
      isLoading(false);
    } catch (e) {
      return { fail: true };
    }
  }

  useEffect(() => {
    getInitialData();
  }, []);

  const AddBlog = async (e: any) => {
    e.preventDefault();
    const response = await fetch("/api/admin/addblog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        customDate === "false"
          ? { title: blogName, mediaPic: mediaInput, content: blogContent }
          : { title: blogName, mediaPic: mediaInput, content: blogContent, datePosted: blogDate }
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
    await fetch("/api/admin/logout").then((res) => res.json());
    location.reload();
  };

  const paginated = sliceItems(blogs);
  const [featured, ...rest] = paginated;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Head>
        <title>Blog | Jaxon Poentis</title>
        <meta name="description" content="Writing by Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        {/* Admin Panel */}
        {auth && (
          <div className="mb-10">
            <div className="flex justify-end gap-3 mb-4">
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="px-4 py-1.5 text-sm border border-white/20 rounded-full text-white/70 hover:text-white hover:border-white/40 transition-all"
              >
                {showAdminPanel ? "Hide Panel" : "New Post"}
              </button>
              <button
                onClick={logOut}
                className="px-4 py-1.5 text-sm border border-red-500/30 rounded-full text-red-400/70 hover:text-red-400 hover:border-red-500/60 transition-all"
              >
                Logout
              </button>
            </div>

            {showAdminPanel && (
              <div className="border border-white/10 rounded-2xl p-8 bg-white/5 mb-10">
                <h2 className="font-serif text-2xl font-bold text-white mb-6">New Post</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">Title</label>
                    <input
                      type="text"
                      value={blogName}
                      onChange={(e) => setBlogName(e.target.value)}
                      className="w-full px-4 py-3 bg-transparent border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                      placeholder="Your story title..."
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">Cover Image URL</label>
                    <input
                      type="text"
                      value={mediaInput}
                      onChange={(e) => setMediaInput(e.target.value)}
                      className="w-full px-4 py-3 bg-transparent border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-1.5">Content</label>
                    <textarea
                      value={blogContent}
                      onChange={(e) => setBlogContent(e.target.value)}
                      rows={10}
                      className="w-full px-4 py-3 bg-transparent border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors resize-none"
                      placeholder="Tell your story..."
                    />
                  </div>
                  <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customDate === "true"}
                      onChange={(e) => setCustomDate(e.target.checked ? "true" : "false")}
                      className="accent-blue-400"
                    />
                    Use custom date
                  </label>
                  {customDate === "true" && (
                    <input
                      type="datetime-local"
                      value={blogDate}
                      onChange={(e) => setBlogDate(e.target.value)}
                      className="w-full px-4 py-3 bg-transparent border border-white/15 rounded-lg text-white focus:outline-none focus:border-white/40 transition-colors"
                    />
                  )}
                  {responseText && (
                    <p className="text-red-400 text-sm">{responseText}</p>
                  )}
                  <button
                    type="button"
                    onClick={AddBlog}
                    className="px-6 py-2.5 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-colors text-sm"
                  >
                    Publish
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Page header */}
        <div className="mb-12 pb-8 border-b border-white/10">
          <h1 className="font-serif text-5xl font-bold text-white mb-3">Writing</h1>
          <p className="text-gray-500 text-lg">Thoughts on software, tech, and life.</p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-24 text-center text-gray-600">Loading...</div>
        ) : blogs.length === 0 ? (
          <div className="py-24 text-center text-gray-600">No posts yet.</div>
        ) : (
          <>
            {/* Featured article */}
            {featured && (
              <Link href={`/blogs/${featured.id}`} className="group block mb-12">
                {featured.mediaPic && (
                  <div className="w-full aspect-video overflow-hidden rounded-2xl mb-7">
                    <img
                      src={featured.mediaPic}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
                <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                  {page === 0 ? "Featured" : "Latest"}
                </p>
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4 leading-tight group-hover:text-gray-200 transition-colors">
                  {featured.title}
                </h2>
                <p className="text-gray-400 text-lg line-clamp-2 mb-5 leading-relaxed">
                  {getExcerpt(featured.content)}
                </p>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <span>Jaxon Poentis</span>
                  <span>·</span>
                  <span>{featured.datePosted ? formatDate(featured.datePosted) : ""}</span>
                  <span>·</span>
                  <span>{getReadTime(featured.content)}</span>
                </div>
              </Link>
            )}

            {/* Article list */}
            {rest.length > 0 && (
              <div className="border-t border-white/10">
                {rest.map((blog) => (
                  <Link
                    key={blog.id}
                    href={`/blogs/${blog.id}`}
                    className="group flex items-start gap-6 py-7 border-b border-white/10 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-xl md:text-2xl font-bold text-white mb-2 leading-snug line-clamp-2">
                        {blog.title}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-3 leading-relaxed">
                        {getExcerpt(blog.content)}
                      </p>
                      <div className="flex items-center gap-2 text-gray-600 text-xs">
                        <span>{blog.datePosted ? formatDate(blog.datePosted) : ""}</span>
                        <span>·</span>
                        <span>{getReadTime(blog.content)}</span>
                      </div>
                    </div>
                    {blog.mediaPic && (
                      <div className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 overflow-hidden rounded-lg">
                        <img
                          src={blog.mediaPic}
                          alt={blog.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {blogs.length > BLOGS_PER_PAGE && (
              <div className="mt-10">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  canGoBack={canGoBack}
                  canGoForward={canGoForward}
                  onBack={goBack}
                  onForward={goForward}
                />
              </div>
            )}
          </>
        )}
      </main>

      <Footer authenticated={false} authSense={false} />
    </div>
  );
};

export default BlogPage;
