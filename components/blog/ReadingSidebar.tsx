import Link from "next/link";

import { useCachedJson } from "../../lib/useCachedJson";

type Section = "blog" | "projects";

type RailItem = {
  id: string;
  label: string;
  href: string;
};

// How many recent entries the rail lists before deferring to the index page.
const MAX_ITEMS = 7;

const SECTIONS: Record<
  Section,
  {
    heading: string;
    index: string;
    all: string;
    endpoint: string;
    toItems: (data: any) => RailItem[];
  }
> = {
  blog: {
    heading: "Writing",
    index: "/blog",
    all: "All posts",
    endpoint: "/api/getBlogs?summary=1",
    toItems: (data) =>
      (Array.isArray(data?.blogs) ? data.blogs : []).map((blog: any) => ({
        id: String(blog.id),
        label: String(blog.title),
        href: `/blogs/${blog.id}`,
      })),
  },
  projects: {
    heading: "Work",
    index: "/projects",
    all: "All projects",
    endpoint: "/api/getProjects?summary=1",
    toItems: (data) =>
      (Array.isArray(data?.projects) ? data.projects : []).map(
        (project: any) => ({
          id: String(project.name),
          label: String(project.name).replace(/_/g, " "),
          href: `/projects/${encodeURIComponent(project.name)}`,
        }),
      ),
  },
};

const NAV: { section: Section; label: string; href: string }[] = [
  { section: "blog", label: "Blog", href: "/blog" },
  { section: "projects", label: "Projects", href: "/projects" },
];

// A failed lookup must not overwrite a good cached list.
const succeeded = (data: any) => data?.fail !== true;

// Widths of the placeholder lines shown while the first list loads.
const PLACEHOLDERS = ["w-4/5", "w-3/5", "w-11/12", "w-2/3"];

// Left rail for long-form reading on wide screens: the name, the site's two
// destinations, and the recent entries of the current section with the one
// being read marked.
const ReadingSidebar: React.FC<{ section?: Section; activeId?: string }> = ({
  section = "blog",
  activeId,
}) => {
  const config = SECTIONS[section];
  // Cached copy shows at once; the background refetch swaps it only if the
  // list changed. The rail is optional, so a failed request just leaves the
  // heading and the index link.
  const { data, loading } = useCachedJson<any>(config.endpoint, succeeded);
  const items = config.toItems(data);

  // Recent entries, always including the one being read.
  const visible = items.slice(0, MAX_ITEMS);
  const active = items.find((item) => item.id === activeId);
  if (active && !visible.some((item) => item.id === active.id)) {
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
          {NAV.map((entry) => {
            const isCurrent = entry.section === section;
            return (
              <li key={entry.section} className="relative m-0">
                {isCurrent && (
                  <span
                    aria-hidden="true"
                    className="absolute -left-4 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-blue-300"
                  />
                )}
                <Link
                  href={entry.href}
                  className={`transition-colors duration-300 ${
                    isCurrent
                      ? "text-blue-300 hover:text-white"
                      : "text-white/60 hover:text-blue-300"
                  }`}
                >
                  {entry.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-label={config.heading} className="mt-12">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
          {config.heading}
        </p>

        {loading && (
          <div
            aria-hidden="true"
            className="mt-4 space-y-4 border-l border-white/10 pl-4 motion-safe:animate-[pulse_2.6s_ease-in-out_infinite]"
          >
            {PLACEHOLDERS.map((width) => (
              <div
                key={width}
                className={`h-2.5 rounded bg-white/[0.07] ${width}`}
              />
            ))}
          </div>
        )}

        {visible.length > 0 && (
          <ul className="m-0 mt-4 space-y-3 border-l border-white/10 text-[0.8rem] font-light leading-snug">
            {visible.map((item) => {
              const isActive = item.id === activeId;
              return (
                <li key={item.id} className="m-0">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`-ml-px border-l pl-4 line-clamp-2 transition-colors duration-300 ${
                      isActive
                        ? "border-blue-300 text-white"
                        : "border-transparent text-white/45 hover:text-blue-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href={config.index}
          className="mt-5 inline-block text-[0.65rem] uppercase tracking-[0.18em] text-white/40 transition-colors duration-300 hover:text-blue-300"
        >
          {config.all}
        </Link>
      </nav>
    </aside>
  );
};

export default ReadingSidebar;
