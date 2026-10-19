const ELSEWHERE = [
  { label: "github", href: "https://github.com/jaximus808" },
  { label: "linkedin", href: "https://www.linkedin.com/in/jaxon-poentis" },
  { label: "x", href: "https://x.com/soljaxonp" },
  { label: "email", href: "mailto:jaxonp808@gmail.com" },
  { label: "resume", href: "/resume" },
];

const INDEX = [
  { href: "#whoIam", label: "About" },
  { href: "#path", label: "Path" },
  { href: "#projects", label: "Projects" },
  { href: "#blogs", label: "Writing" },
];

/**
 * Hero: left-aligned and still. A small headshot, the name, one line on what
 * I build, a row of plain links, and a numbered index of the page pinned to
 * the bottom of the screen. The particle stage sits to the right of it.
 */
export default function HeroIntro() {
  return (
    <div className="relative z-10 min-h-[100svh] w-full">
      {/* A soft wash behind the words so the particles never cross the text.
          Wide screens fade it out toward the cloud on the right. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#121212]/45 md:bg-transparent md:bg-[linear-gradient(90deg,rgba(18,18,18,0.85)_0%,rgba(18,18,18,0.55)_38%,rgba(18,18,18,0)_62%)]"
      />
      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 md:px-12 text-left text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/headshot.jpg"
          alt="Jaxon"
          className="h-12 w-12 md:h-14 md:w-14 rounded-full object-cover ring-1 ring-white/15"
        />

        <h1 className="mt-8 font-cormorant font-light leading-[0.95] tracking-[0.005em] text-[clamp(52px,8vw,104px)]">
          Jaxon Poentis
        </h1>

        <p className="mt-6 font-mono text-sm md:text-base leading-relaxed text-white/75">
          Building robots, and the
          <br />
          infrastructure that runs them.
        </p>

        <p className="mt-6 max-w-md text-[0.7rem] uppercase tracking-[0.18em] leading-loose text-white/45 font-montserrat">
          Robotics @ Northstar
          <br />
          CS + Math @ WashU
          <br />
          prev Tesla, Capital One, Spectrum
        </p>

        <nav
          aria-label="Elsewhere"
          className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs md:text-sm"
        >
          {ELSEWHERE.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-white/55 underline decoration-white/20 underline-offset-4 transition-colors duration-300 hover:text-blue-300 hover:decoration-blue-300/60"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* The page, as a numbered index */}
        <nav
          aria-label="On this page"
          className="absolute bottom-10 left-6 right-6 md:left-12 md:right-12 flex flex-wrap gap-x-5 sm:gap-x-8 gap-y-2 font-mono text-xs"
        >
          {INDEX.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              style={{ animationDelay: `${650 + i * 120}ms` }}
              className="navHint group inline-flex items-baseline gap-2 text-white/55 transition-colors duration-300 hover:text-white"
            >
              <span className="text-white/30 transition-colors duration-300 group-hover:text-blue-300">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
