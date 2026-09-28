import Link from "next/link";
import { useRouter } from "next/router";

import { cacheKey, useCachedJson } from "../../lib/useCachedJson";

type Section = "blog" | "projects";

// How many recent entries the rail lists before deferring to the index page.
const MAX_ITEMS = 7;

const SECTIONS: Record<
  Section,
  { heading: string; index: string; all: string; endpoint: string }
> = {
  blog: {
    heading: "Writing",
    index: "/blog",
    all: "All posts",
    endpoint: "/api/getBlogs?summary=1",
  },
  projects: {
    heading: "Work",
    index: "/projects",
    all: "All projects",
    endpoint: "/api/getProjects?summary=1",
  },
};

const NAV: { section: Section; label: string; href: string }[] = [
  { section: "blog", label: "Blog", href: "/blog" },
  { section: "projects", label: "Projects", href: "/projects" },
];

// A failed lookup must not overwrite a good cached list.
const succeeded = (data: any) => data?.fail !== true;

/**
 * Markup for the list area: the entries, placeholder lines while the first
 * list loads, or nothing.
 *
 * This one function runs in two places: in React, and (through toString) in an
 * inline script that fills the list from the cache before the first paint. So
 * it must stay self-contained and plain: no imports, no outer variables, no
 * syntax that compiles to helper calls.
 */
function buildListHtml(
  raw: string | null,
  section: string,
  activeId: string,
  max: number,
  loading: boolean,
): string {
  function esc(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var items: { id: string; label: string; href: string }[] = [];
  try {
    var data = raw ? JSON.parse(raw) : null;
    var list = data ? (section === "projects" ? data.projects : data.blogs) : null;
    if (list && list.length) {
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        if (section === "projects") {
          items.push({
            id: String(entry.name),
            label: String(entry.name).replace(/_/g, " "),
            href: "/projects/" + encodeURIComponent(entry.name),
          });
        } else {
          items.push({
            id: String(entry.id),
            label: String(entry.title),
            href: "/blogs/" + encodeURIComponent(entry.id),
          });
        }
      }
    }
  } catch (e) {
    items = [];
  }

  if (!items.length) {
    if (!loading) return "";
    return (
      '<div aria-hidden="true" class="mt-4 space-y-4 border-l border-white/10 pl-4 motion-safe:animate-[pulse_2.6s_ease-in-out_infinite]">' +
      '<div class="h-2.5 rounded bg-white/[0.07] w-4/5"></div>' +
      '<div class="h-2.5 rounded bg-white/[0.07] w-3/5"></div>' +
      '<div class="h-2.5 rounded bg-white/[0.07] w-11/12"></div>' +
      '<div class="h-2.5 rounded bg-white/[0.07] w-2/3"></div>' +
      "</div>"
    );
  }

  // Recent entries, always including the one being read.
  var visible = items.slice(0, max);
  var listed = false;
  for (var v = 0; v < visible.length; v++) {
    if (visible[v].id === activeId) listed = true;
  }
  if (!listed) {
    for (var a = 0; a < items.length; a++) {
      if (items[a].id === activeId) visible[visible.length - 1] = items[a];
    }
  }

  var html =
    '<ul class="m-0 mt-4 space-y-3 border-l border-white/10 text-[0.8rem] font-light leading-snug">';
  for (var n = 0; n < visible.length; n++) {
    var item = visible[n];
    var isActive = item.id === activeId;
    html +=
      '<li class="m-0"><a href="' +
      esc(item.href) +
      '"' +
      (isActive ? ' aria-current="page"' : "") +
      ' class="-ml-px border-l pl-4 line-clamp-2 transition-colors duration-300 ' +
      (isActive
        ? "border-blue-300 text-white"
        : "border-transparent text-white/45 hover:text-blue-300") +
      '">' +
      esc(item.label) +
      "</a></li>";
  }
  return html + "</ul>";
}

// The id of the entry being read, taken from the address bar. Shared with the
// inline script, so the same rules as buildListHtml apply.
function idFromPath(pathname: string): string {
  var parts = pathname.split("/");
  var last = "";
  for (var i = 0; i < parts.length; i++) {
    if (parts[i]) last = parts[i];
  }
  try {
    return decodeURIComponent(last);
  } catch (e) {
    return last;
  }
}

// Runs while the HTML is being parsed, before the first paint: if a cached
// list exists, the list area is filled with it right away.
function prefillScript(section: Section): string {
  return (
    "(function(){try{" +
    "var el=document.currentScript.previousElementSibling;" +
    `var raw=localStorage.getItem(${JSON.stringify(
      cacheKey(SECTIONS[section].endpoint),
    )});` +
    "if(!el||!raw)return;" +
    `el.innerHTML=(${buildListHtml.toString()})(raw,${JSON.stringify(
      section,
    )},(${idFromPath.toString()})(location.pathname),${MAX_ITEMS},false);` +
    "}catch(e){}})();"
  );
}

// Left rail for long-form reading on wide screens: the name, the site's two
// destinations, and the recent entries of the current section with the one
// being read marked.
const ReadingSidebar: React.FC<{ section?: Section; activeId?: string }> = ({
  section = "blog",
  activeId,
}) => {
  const router = useRouter();
  const config = SECTIONS[section];
  // Cached copy shows at once; the background refetch swaps it only if the
  // list changed. The rail is optional, so a failed request just leaves the
  // heading and the index link.
  const { raw, loading } = useCachedJson(config.endpoint, {
    isUsable: succeeded,
    eager: true,
  });

  // The router has no id yet while hydrating; the address bar does.
  const active =
    activeId ??
    (typeof window === "undefined" ? "" : idFromPath(window.location.pathname));

  const listHtml = buildListHtml(raw, section, active, MAX_ITEMS, loading);

  // The entries are plain anchors; route their clicks through the router so
  // they stay client-side navigations.
  const handleListClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const anchor = (event.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href");
    if (!href || !href.startsWith("/")) return;
    event.preventDefault();
    router.push(href);
  };

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

        {/* The server cannot know the visitor's cached list, so this area is
            allowed to differ from the server's HTML: the script below fills it
            before the first paint and React then renders the same markup. */}
        <div
          suppressHydrationWarning
          onClick={handleListClick}
          dangerouslySetInnerHTML={{ __html: listHtml }}
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: prefillScript(section) }}
        />

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
