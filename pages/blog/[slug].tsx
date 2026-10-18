import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import Seo, { SITE_URL } from "../../components/Seo";
import ReadingHeader from "../../components/blog/ReadingHeader";
import ReadingSidebar from "../../components/blog/ReadingSidebar";
import ReadingProgress from "../../components/blog/ReadingProgress";
import EntryPager, { type PagerEntry } from "../../components/blog/EntryPager";
import MdxContent from "../../components/content/MdxContent";
import { FramedImage } from "../../components/content/Frame";
import { getPost, listPosts, postLinks, type Entry, type EntryLink, type PostMeta } from "../../lib/content";
import { formatDate } from "../../lib/contentText";

type Props = {
  post: Entry<PostMeta>;
  rail: EntryLink[];
  older: PagerEntry | null;
  newer: PagerEntry | null;
};

const DESCRIPTION_LENGTH = 150;

function seoDescription(meta: PostMeta): string {
  const clipped =
    meta.excerpt.length > DESCRIPTION_LENGTH
      ? `${meta.excerpt.slice(0, DESCRIPTION_LENGTH).trimEnd()}…`
      : meta.excerpt;
  return `${meta.title} — a blog post by Jaxon Poentis, software engineer. ${clipped}`.trim();
}

export default function BlogPostPage({ post, rail, older, newer }: Props) {
  const { meta, source } = post;
  const href = `/blog/${meta.slug}`;

  return (
    <div className="min-h-screen overflow-x-clip bg-[#121212]">
      <Seo
        title={`${meta.title} | Jaxon Poentis`}
        description={seoDescription(meta)}
        path={href}
        ogType="article"
        ogImage={meta.cover?.startsWith("/") ? `${SITE_URL}${meta.cover}` : undefined}
      />
      <ReadingProgress />

      {/* Wide screens get the left rail; narrower ones keep the slim top bar. */}
      <div className="min-[1200px]:hidden">
        <ReadingHeader />
      </div>
      <ReadingSidebar section="blog" items={rail} activeHref={href} />

      <main className="mx-auto w-full max-w-[700px] px-6 pt-28 md:pt-32 pb-24 font-montserrat">
        <article>
          <header>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
              <time dateTime={meta.date}>{formatDate(meta.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{meta.readingMinutes} min read</span>
            </p>

            <h1 className="mt-5 font-cormorant font-light text-4xl md:text-6xl leading-[1.08] text-white">
              {meta.title}
            </h1>
          </header>

          {meta.cover && (
            <FramedImage src={meta.cover} alt="" priority className="mt-10" />
          )}

          <div className="mt-12">
            <MdxContent source={source} />
          </div>
        </article>

        <EntryPager previous={older} next={newer} />

        <footer className="mt-16 border-t border-white/10 pt-8">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60 transition-colors duration-300 hover:text-blue-300"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to blog
          </Link>
        </footer>
      </main>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: listPosts().map((post) => ({ params: { slug: post.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props, { slug: string }> = async ({ params }) => {
  const posts = listPosts();
  const index = posts.findIndex((post) => post.slug === params!.slug);
  const pager = (post: PostMeta | undefined, eyebrow: string): PagerEntry | null =>
    post ? { href: `/blog/${post.slug}`, label: post.title, eyebrow } : null;

  return {
    props: {
      post: await getPost(params!.slug),
      rail: postLinks(posts),
      // The list is newest first.
      older: pager(posts[index + 1], "Older post"),
      newer: pager(posts[index - 1], "Newer post"),
    },
  };
};
