import Link from "next/link";
import { useEffect, useState } from "react";

type PostLink = {
  id: string;
  title: string;
};

// How many recent posts the rail lists before deferring to the blog index.
const MAX_POSTS = 7;

// Left rail for long-form reading on wide screens: the name, the site's two
// destinations, and the recent posts with the current one marked.
const ReadingSidebar: React.FC<{ activeId?: string }> = ({ activeId }) => {
  const [posts, setPosts] = useState<PostLink[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/getBlogs?summary=1", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { blogs: [] }))
      .then((data) => {
        if (controller.signal.aborted) return;
        setPosts(Array.isArray(data?.blogs) ? data.blogs : []);
      })
      // The rail is optional; the article stands without the list.
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Recent posts, always including the one being read.
  const visible = posts.slice(0, MAX_POSTS);
  const active = posts.find((post) => post.id === activeId);
  if (active && !visible.some((post) => post.id === active.id)) {
    visible[visible.length - 1] = active;
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] flex-col overflow-y-auto pl-[2.5vw] pr-4 pt-28 pb-10 font-montserrat min-[1200px]:flex [scrollbar-width:none]">
      <Link
        href="/"
        className="font-cormorant text-3xl font-light leading-[1.05] tracking-[0.01em] text-white transition-colors duration-300 hover:text-blue-300"
      >
        Jaxon
        <br />
        Poentis
      </Link>

      <nav aria-label="Site" className="mt-12">
        <ul className="m-0 space-y-3 text-sm font-light">
          <li className="m-0">
            <Link
              href="/projects"
              className="text-white/60 transition-colors duration-300 hover:text-blue-300"
            >
              Projects
            </Link>
          </li>
          <li className="relative m-0">
            <span
              aria-hidden="true"
              className="absolute -left-4 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-blue-300"
            />
            <Link
              href="/blog"
              className="text-blue-300 transition-colors duration-300 hover:text-white"
            >
              Blog
            </Link>
          </li>
        </ul>
      </nav>

      {visible.length > 0 && (
        <nav aria-label="Posts" className="mt-12">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
            Writing
          </p>
          <ul className="m-0 mt-4 space-y-3 border-l border-white/10 text-[0.8rem] font-light leading-snug">
            {visible.map((post) => {
              const isActive = post.id === activeId;
              return (
                <li key={post.id} className="m-0">
                  <Link
                    href={`/blogs/${post.id}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`-ml-px border-l pl-4 line-clamp-2 transition-colors duration-300 ${
                      isActive
                        ? "border-blue-300 text-white"
                        : "border-transparent text-white/45 hover:text-blue-300"
                    }`}
                  >
                    {post.title}
                  </Link>
                </li>
              );
            })}
          </ul>
          {posts.length > visible.length && (
            <Link
              href="/blog"
              className="mt-5 inline-block text-[0.65rem] uppercase tracking-[0.18em] text-white/40 transition-colors duration-300 hover:text-blue-300"
            >
              All posts
            </Link>
          )}
        </nav>
      )}
    </aside>
  );
};

export default ReadingSidebar;
