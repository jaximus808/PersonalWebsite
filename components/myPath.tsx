import Image from "next/image";
import { useEffect, useRef } from "react";
import { PopInBlock } from "./popinBlockContext";
import SectionHead, { HOME_COLUMN } from "./SectionHead";

type Entry = {
  org: string;
  role: string;
  when: string;
  logo: string;
  logoLight?: boolean; // transparent logo that needs a light tile
};

type YearGroup = { year: string; entries: Entry[] };

// Newest first. Kept short on purpose: only the high-signal stops, no blurbs.
const path: YearGroup[] = [
  {
    year: "2026",
    entries: [
      {
        org: "Northstar Robotics",
        role: "Robotics Engineer",
        when: "Now",
        logo: "/northstar_logo.jpg",
        logoLight: true,
      },
      {
        org: "Capital One",
        role: "Software Engineer Intern",
        when: "Summer",
        logo: "/capital_one_logo.jpg",
      },
      {
        org: "Tesla",
        role: "Software Engineering Intern",
        when: "Spring",
        logo: "/teslalogo.png",
      },
    ],
  },
  {
    year: "2025",
    entries: [
      {
        org: "Spectrum",
        role: "Software Engineering Intern",
        when: "Summer",
        logo: "/spectrum.png",
      },
    ],
  },
  {
    year: "2024",
    entries: [
      {
        org: "Health XR",
        role: "Founding Software Engineer",
        when: "2024 — 2025",
        logo: "/healthxr.png",
      },
    ],
  },
  {
    year: "2023",
    entries: [
      {
        org: "Washington University in St. Louis",
        role: "B.S. CS + Math",
        when: "2023 — 2027",
        logo: "/washulogo.png",
      },
    ],
  },
  {
    year: "2022",
    entries: [
      {
        org: "Regeneron ISEF",
        role: "Finalist, Robotics & Intelligent Machines",
        when: "Atlanta",
        logo: "/isef_logo.png",
      },
    ],
  },
];

// A dot on the rail. Lit (blue) once the scroll fill has reached it.
function Node({ hollow = false }: { hollow?: boolean }) {
  return (
    <div className="relative flex-none w-4 flex justify-center">
      <span
        data-path-node
        className={`block rounded-full ring-4 ring-[#121212] transition-[background-color,border-color,box-shadow] duration-500 ease-out ${
          hollow
            ? "h-3.5 w-3.5 border border-white/35 bg-[#121212] data-[lit]:border-blue-300/80"
            : "h-2 w-2 bg-white/25 data-[lit]:bg-blue-300 data-[lit]:shadow-[0_0_10px_rgba(163,203,255,0.7)]"
        }`}
      />
    </div>
  );
}

function YearStation({ year, first }: { year: string; first: boolean }) {
  return (
    <div
      className={`flex items-center gap-5 md:gap-7 pb-3 ${first ? "" : "pt-8"}`}
    >
      <Node hollow />
      <span className="font-cormorant font-light text-3xl md:text-4xl text-white/85 leading-none">
        {year}
      </span>
    </div>
  );
}

function Row({ entry }: { entry: Entry }) {
  return (
    <div className="flex items-center gap-5 md:gap-7 py-3">
      <Node />
      <div className="flex-1 min-w-0 flex items-center gap-4 md:gap-5 rounded px-3 py-3 -mx-3 transition-colors duration-300 hover:bg-white/[0.03]">
        <div
          className={`relative h-10 w-10 flex-none overflow-hidden rounded ring-1 ring-white/10 ${
            entry.logoLight ? "bg-white" : "bg-white/[0.06]"
          }`}
        >
          <Image
            alt={`${entry.org} logo`}
            src={entry.logo}
            fill
            sizes="40px"
            className="object-contain p-1"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-cormorant font-light text-2xl leading-tight text-white">
            {entry.org}
          </p>
          <p className="mt-0.5 text-sm font-light text-white/55 font-montserrat">
            {entry.role}
          </p>
        </div>
        <p className="hidden sm:block font-mono text-xs text-white/40 whitespace-nowrap">
          {entry.when}
        </p>
      </div>
    </div>
  );
}

/**
 * Fills the rail as the section scrolls past the middle of the screen and
 * lights each node the fill has reached. Writes straight to the DOM, once
 * per frame; reduced motion just shows the rail fully lit.
 */
function useRailFill() {
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    const fill = fillRef.current;
    if (!rail || !fill) return;
    const nodes = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-path-node]")
    );
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    const update = () => {
      raf = 0;
      const box = rail.getBoundingClientRect();
      const reach = reduced
        ? box.height
        : Math.min(box.height, Math.max(0, window.innerHeight * 0.6 - box.top));
      fill.style.height = `${reach}px`;
      for (const node of nodes) {
        const r = node.getBoundingClientRect();
        const lit = r.top + r.height / 2 - box.top <= reach;
        node.toggleAttribute("data-lit", lit);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { railRef, fillRef };
}

export default function MyPath() {
  const { railRef, fillRef } = useRailFill();

  return (
    <div className="pt-4 mt-32 relative w-full">
      <SectionHead n={2} label="Path" />

      <div className={HOME_COLUMN}>
        <PopInBlock variant="materialize">
          <div ref={railRef} className="relative mt-12 max-w-3xl">
            {/* The rail, and the blue fill that follows the scroll */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-2 bottom-2 w-px -translate-x-1/2 bg-white/10"
            />
            <div
              ref={fillRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-2 w-px -translate-x-1/2 bg-gradient-to-b from-blue-300/10 via-blue-300/50 to-blue-300"
              style={{ height: 0 }}
            />

            {path.map((group, i) => (
              <div key={group.year}>
                <YearStation year={group.year} first={i === 0} />
                {group.entries.map((entry) => (
                  <Row key={entry.org} entry={entry} />
                ))}
              </div>
            ))}

            {/* Where it starts */}
            <div className="flex items-center gap-5 md:gap-7 pt-8">
              <Node hollow />
              <span className="font-mono text-xs text-white/40">
                Oʻahu, Hawaiʻi
              </span>
            </div>
          </div>
        </PopInBlock>
      </div>
    </div>
  );
}
