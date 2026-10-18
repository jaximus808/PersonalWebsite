import Link from "next/link";

import type { EntryLink } from "../../lib/content";

type Section = "blog" | "projects";

// How many recent entries the rail lists before deferring to the index page.
const MAX_ITEMS = 7;

const SECTIONS: Record<Section, { heading: string; index: string; all: string }> = {
  blog: { heading: "Writing", index: "/blog", all: "All posts" },
  projects: { heading: "Work", index: "/projects", all: "All projects" },
};

const NAV: { section: Section; label: string; href: string }[] = [
  { section: "blog", label: "Blog", href: "/blog" },
  { section: "projects", label: "Projects", href: "/projects" },
];

// The newest entries, with the one being read swapped in if it is older.
function visibleItems(items: EntryLink[], activeHref?: string): EntryLink[] {
  const visible = items.slice(0, MAX_ITEMS);
  const active = items.find((item) => item.href === activeHref);
  if (active && !visible.includes(active)) visible[visible.length - 1] = active;
  return visible;
}

// Left rail for long-form reading on wide screens: the name, the site's two
// destinations, and the recent entries of the current section with the one
// being read marked.
const ReadingSidebar: React.FC<{
  section: Section;
  items: EntryLink[];
  activeHref?: string;
}> = ({ section, items, activeHref }) => {
  const config = SECTIONS[section];

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

        <ul className="m-0 mt-4 space-y-3 border-l border-white/10 text-[0.8rem] font-light leading-snug">
          {visibleItems(items, activeHref).map((item) => {
            const isActive = item.href === activeHref;
            return (
              <li key={item.href} className="m-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`-ml-px block border-l pl-4 line-clamp-2 transition-colors duration-300 ${
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
