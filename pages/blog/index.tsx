import type { GetStaticProps } from "next";
import { useState } from "react";
import Link from "next/link";
import { Calendar, ArrowLeft, ArrowRight } from "lucide-react";

import Seo from "../../components/Seo";
import Header from "../../components/header";
import Footer from "../../components/footer";
import QuietBackground from "../../components/QuietBackground";
import {
  ScrollObserverProvider,
  PopInBlock,
} from "../../components/popinBlockContext";
import { listPosts, type PostMeta } from "../../lib/content";
import { formatDate } from "../../lib/contentText";

const BLOGS_PER_PAGE = 6;

type Props = { posts: PostMeta[] };

export default function BlogPage({ posts }: Props) {
  const [blogPage, setBlogPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(posts.length / BLOGS_PER_PAGE));
  const currentPage = Math.min(blogPage, totalPages - 1);
  const canGoBack = currentPage > 0;
  const canGoForward = currentPage < totalPages - 1;
  const visiblePosts = posts.slice(
    currentPage * BLOGS_PER_PAGE,
    (currentPage + 1) * BLOGS_PER_PAGE
  );

  return (
    <ScrollObserverProvider>
      <div>
        <Seo
          title="Blog | Jaxon Poentis — Software Engineer"
          description="Notes and write-ups by Jaxon Poentis, software engineer — building distributed systems, AI agents, and robotics; intern at Capital One and previously Tesla."
          path="/blog"
        />
        <Header />
        <QuietBackground />

        <div className="text-center pt-24 md:pt-28">
          <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-montserrat">
            Thoughts, notes & what I&apos;m building
          </p>
          <h1 className="mt-3 font-cormorant font-light text-5xl md:text-6xl text-white">
            The Blog
          </h1>
          <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
        </div>

        <div className="mx-auto w-[90%] max-w-3xl mt-16 font-montserrat">
          {posts.length === 0 && (
            <p className="min-h-[30vh] text-center font-montserrat font-light text-white/60">
              No posts yet.
            </p>
          )}

          {/* Editorial list — one calm row per post, hairline dividers */}
          {posts.length > 0 && (
            <div className="border-t border-white/10">
              {visiblePosts.map((post) => (
                <PopInBlock key={post.slug} variant="materialize">
                  <Link href={`/blog/${post.slug}`} className="group block">
                    <article className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-6 md:gap-10 py-9 border-b border-white/10 transition-colors duration-500 group-hover:border-white/20">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-white/45 font-montserrat">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(post.date)}
                        </p>

                        <h2 className="mt-3 font-cormorant font-light text-3xl md:text-4xl text-white leading-tight transition-colors duration-300 group-hover:text-blue-300">
                          {post.title}
                        </h2>

                        <p className="mt-3 text-sm md:text-base text-white/60 font-light leading-relaxed line-clamp-2">
                          {post.excerpt}
                        </p>

                        <span className="mt-5 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 transition-colors duration-300 group-hover:text-blue-300">
                          Read
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                        </span>
                      </div>

                      {post.cover && (
                        <div className="hidden md:block relative h-28 w-44 flex-none overflow-hidden rounded ring-1 ring-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.cover}
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
          )}

          {/* Pagination — quiet, text-only */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-8 pt-10 pb-20 font-montserrat">
              <button
                type="button"
                onClick={() => canGoBack && setBlogPage(currentPage - 1)}
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
                onClick={() => canGoForward && setBlogPage(currentPage + 1)}
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

        <Footer authenticated={false} authSense={false} />
      </div>
    </ScrollObserverProvider>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: { posts: listPosts() },
});
