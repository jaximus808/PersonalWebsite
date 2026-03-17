import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/footer";
import * as cookies from "cookie";
import { GetServerSideProps } from "next";
import Link from "next/link";
import * as jsonwebtoken from "jsonwebtoken";
import { ArrowLeft } from "lucide-react";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Props = {
  blogid: number;
  exist: boolean;
  blog: any;
  authenticated: boolean;
};

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

  const { blogId } = context.query;
  if (!blogId) {
    return { props: { blog: "", exist: false, authenticated } };
  }

  try {
    const blog = await prisma.blog.findUnique({ where: { id: blogId.toString() } });
    return {
      props: {
        blogid: blogId,
        blog: JSON.parse(JSON.stringify(blog)),
        exist: true,
        authenticated,
      },
    };
  } catch {
    return {
      props: { blogid: blogId, blog: {}, exist: false, authenticated },
    };
  }
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

const BlogPost: React.FC<Props> = (props) => {
  const deleteBlog = async () => {
    await fetch("/api/admin/deleteblog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogid: props.blogid }),
    });
    location.replace("/blog");
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Head>
        <title>
          {props.exist ? `${props.blog.title} | Jaxon Poentis` : "Blog | Jaxon Poentis"}
        </title>
        <meta name="description" content="Writing by Jaxon Poentis" />
        <meta property="og:image" content="/metadata.jpg" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="max-w-2xl mx-auto px-6 pt-10 pb-24">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          All posts
        </Link>

        {props.exist ? (
          <article>
            {/* Article header */}
            <header className="mb-10">
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                {props.blog.title}
              </h1>

              {/* Author + meta */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  JP
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Jaxon Poentis</p>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <time dateTime={props.blog.datePosted}>
                      {new Date(props.blog.datePosted).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <span>·</span>
                    <span>{getReadTime(props.blog.content)}</span>
                  </div>
                </div>
              </div>

              {/* Hero image */}
              {props.blog.mediaPic && (
                <div className="w-full overflow-hidden rounded-xl mb-2">
                  <img
                    src={props.blog.mediaPic}
                    alt={props.blog.title}
                    className="w-full max-h-[28rem] object-cover"
                  />
                </div>
              )}
            </header>

            {/* Article body */}
            <div className="border-t border-white/10 pt-10">
              {props.blog.content.split("*").map((segment: any, key: any) => {
                if (segment.length === 0) {
                  return <div key={key} className="h-4" />;
                }
                if (segment.length >= 3 && segment.substring(0, 3) === "<i>") {
                  return (
                    <figure key={key} className="my-10">
                      <img
                        src={segment.substring(3)}
                        alt="Blog image"
                        className="w-full rounded-xl shadow-2xl"
                      />
                    </figure>
                  );
                }
                if (segment.length >= 3 && segment.substring(0, 3) === "<b>") {
                  return (
                    <h2
                      key={key}
                      className="font-serif text-2xl md:text-3xl font-bold text-white mt-12 mb-4 leading-snug"
                    >
                      {segment.substring(3)}
                    </h2>
                  );
                }
                return (
                  <p
                    key={key}
                    className="text-gray-300 text-lg leading-[1.85] mb-6 whitespace-pre-wrap"
                  >
                    {segment}
                  </p>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between">
              <Link
                href="/blog"
                className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-2 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                More posts
              </Link>

              {props.authenticated && (
                <button
                  onClick={deleteBlog}
                  className="px-4 py-1.5 text-sm text-red-400/70 border border-red-500/20 rounded-full hover:text-red-400 hover:border-red-500/50 transition-all"
                >
                  Delete post
                </button>
              )}
            </div>
          </article>
        ) : (
          <div className="py-24 text-center">
            <h1 className="font-serif text-3xl font-bold text-white mb-4">Post not found</h1>
            <p className="text-gray-500 mb-8">
              This post doesn't exist or has been removed.
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to blog
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogPost;
