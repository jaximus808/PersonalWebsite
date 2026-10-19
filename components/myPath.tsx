import Image from "next/image";
import { PopInBlock } from "./popinBlockContext";
import SectionHead, { HOME_COLUMN } from "./SectionHead";

type Entry = {
  org: string;
  role: string;
  when: string;
  logo: string;
  logoLight?: boolean; // transparent logo that needs a light tile
};

// Newest first. Kept short on purpose: only the high-signal stops, no blurbs.
const path: Entry[] = [
  {
    org: "Northstar Robotics",
    role: "Robotics Engineer",
    when: "2026 — now",
    logo: "/northstar_logo.jpg",
    logoLight: true,
  },
  {
    org: "Capital One",
    role: "Software Engineer Intern",
    when: "Summer 2026",
    logo: "/capital_one_logo.jpg",
  },
  {
    org: "Tesla",
    role: "Software Engineering Intern",
    when: "Spring 2026",
    logo: "/teslalogo.png",
  },
  {
    org: "Spectrum",
    role: "Software Engineering Intern",
    when: "Summer 2025",
    logo: "/spectrum.png",
  },
  {
    org: "Health XR",
    role: "Founding Software Engineer",
    when: "2024 — 2025",
    logo: "/healthxr.png",
  },
  {
    org: "Washington University in St. Louis",
    role: "B.S. CS + Math",
    when: "2023 — 2027",
    logo: "/washulogo.png",
  },
  {
    org: "Regeneron ISEF",
    role: "Finalist, Robotics & Intelligent Machines",
    when: "2022",
    logo: "/isef_logo.png",
  },
];

function Row({ entry }: { entry: Entry }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-5 md:gap-x-6 gap-y-1 py-5 border-b border-white/10">
      <div
        className={`relative row-span-2 sm:row-span-1 h-10 w-10 flex-none overflow-hidden rounded ring-1 ring-white/10 ${
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
      <div className="min-w-0">
        <p className="font-cormorant font-light text-2xl md:text-[1.7rem] leading-tight text-white">
          {entry.org}
        </p>
        <p className="mt-0.5 text-sm font-light text-white/55 font-montserrat">
          {entry.role}
        </p>
      </div>
      <p className="col-start-2 sm:col-start-auto font-mono text-xs text-white/40 sm:text-right whitespace-nowrap">
        {entry.when}
      </p>
    </li>
  );
}

export default function MyPath() {
  return (
    <div className="pt-4 mt-32 relative w-full">
      <SectionHead n={2} label="Path" title="My Path" />

      <div className={HOME_COLUMN}>
        <PopInBlock variant="materialize">
          <ul className="ml-0 mt-10 max-w-3xl border-t border-white/10">
            {path.map((entry) => (
              <Row key={entry.org} entry={entry} />
            ))}
          </ul>
          <p className="mt-6 font-mono text-xs text-white/35">
            Oʻahu, Hawaiʻi
          </p>
        </PopInBlock>
      </div>
    </div>
  );
}
