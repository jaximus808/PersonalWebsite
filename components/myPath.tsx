import Image from "next/image";
import styles from "../styles/Home.module.css";
import { PopInBlock } from "./popinBlockContext";

type DetailSection = { label: string; items: string[] };

type Entry = {
  org: string;
  role: string;
  location?: string;
  dates: string;
  logo: string;
  logoLight?: boolean; // transparent logo that needs a light tile
  blurb: string;
  detailsLabel?: string;
  details?: DetailSection[];
};

type YearGroup = { year: string; entries: Entry[] };

const timeline: YearGroup[] = [
  {
    year: "2026",
    entries: [
      {
        org: "Capital One",
        role: "Software Engineer Intern",
        dates: "06/2026 — 08/2026",
        logo: "/capital_one_logo.jpg",
        blurb:
          "Cloud Ops Resilience Engineering — security group visibility, audits, role shopping, GIST value/range search over millions of rows, and agent skills answering business questions in natural language over our API.",
      },
      {
        org: "Tesla",
        role: "Software Engineering Intern",
        location: "Fremont, CA",
        dates: "01/2026 — 05/2026",
        logo: "/teslalogo.png",
        blurb: "Distributed Systems, Energy Backend Infra, and AI Agents.",
      },
    ],
  },
  {
    year: "2025",
    entries: [
      {
        org: "WashU McKelvey Engineering",
        role: "System Software Teaching Assistant",
        location: "St. Louis, MO",
        dates: "08/2025 — Present",
        logo: "/mck_logo_2.png",
        logoLight: true,
        blurb:
          "Assist students with x86 assembly reading, C code, and memory concepts.",
      },
      {
        org: "Spectrum",
        role: "Software Engineering Intern",
        location: "St. Louis, MO",
        dates: "05/2025 — 08/2025",
        logo: "/spectrum.png",
        blurb:
          "Service Delivery team — built cloud backend controllers in Salesforce Java.",
      },
      {
        org: "WashU IT — Devstac",
        role: "Software Engineer",
        location: "St. Louis, MO",
        dates: "04/2025 — Present",
        logo: "/devstac.jpg",
        blurb:
          "Building full-stack software for internal and external clients, from web apps to mobile apps.",
        detailsLabel: "Key skills",
        details: [
          {
            label: "Key skills",
            items: [
              "Node.js + TypeScript",
              "API Development",
              "Supabase Database",
              "React",
            ],
          },
        ],
      },
    ],
  },
  {
    year: "2024",
    entries: [
      {
        org: "Health XR",
        role: "Founding Software Engineer",
        location: "St. Louis, MO",
        dates: "09/2024 — 01/2025",
        logo: "/healthxr.png",
        blurb:
          "Built the first prototype of a Meta Quest XR healthcare assistant in Unity + C#, winning #1 at St. Louis Startup Tech Week.",
        detailsLabel: "Key features built",
        details: [
          {
            label: "Key features built",
            items: [
              "Integrated reality environment in Unity",
              "Wrist button in the virtual world wired to a FastAPI backend",
              "AI analysis of medical documents rendered into the 3D world",
            ],
          },
        ],
      },
      {
        org: "Flashcardify.ai",
        role: "Software Engineering Intern",
        location: "St. Louis, MO",
        dates: "09/2024 — 01/2025",
        logo: "/flashcardify.png",
        blurb:
          "Built out backend infrastructure for flashcard decks with Node.js and Supabase.",
        detailsLabel: "Key features built",
        details: [
          {
            label: "Key features built",
            items: [
              "Deck privacy controls (public / private visibility)",
              "Full-text search using Supabase",
              "Tagging system for deck organization and discovery",
              "Search matching by deck names and metadata",
            ],
          },
        ],
      },
      {
        org: "WashU McKelvey Engineering",
        role: "Data Structures & Algorithms Teaching Assistant",
        location: "St. Louis, MO",
        dates: "01/2025 — 12/2025",
        logo: "/mck_logo_2.png",
        logoLight: true,
        blurb:
          "Guided students through data structures, algorithm implementation, and runtime analysis.",
      },
    ],
  },
];

const education: Entry = {
  org: "Washington University in St. Louis",
  role: "B.S. — CS + Math, and Entrepreneurship",
  location: "GPA 3.76",
  dates: "08/2023 — Expected 05/2027",
  logo: "/washulogo.png",
  blurb:
    "Pursuing CS + Math with a focus on systems and algorithms, involved in entrepreneurship and student organizations on campus.",
  detailsLabel: "Notable classes & clubs",
  details: [
    {
      label: "Notable classes",
      items: [
        "Cloud Computing",
        "Intro to Cryptography",
        "System Software",
        "Parallel and Concurrent Programming",
        "Linear Algebra (proof-based)",
        "Object-Oriented Programming (C++)",
      ],
    },
    {
      label: "Campus involvement",
      items: [
        "WashU Robotics (Project Lead)",
        "Google Developer Group (Core Lead)",
        "LNYF (Multimedia)",
      ],
    },
  ],
};

function LogoTile({ entry }: { entry: Entry }) {
  return (
    <div
      className={`relative flex-none h-16 w-16 md:h-[4.75rem] md:w-[4.75rem] rounded-xl overflow-hidden ring-1 ring-white/10 p-2 ${
        entry.logoLight ? "bg-white" : "bg-white/[0.06]"
      }`}
    >
      <Image
        alt={`${entry.org} logo`}
        src={entry.logo}
        fill
        sizes="76px"
        className="object-contain p-1"
      />
    </div>
  );
}

function EntryDetails({ entry }: { entry: Entry }) {
  if (!entry.details) return null;
  return (
    <details className="group mt-4">
      <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-blue-300/80 hover:text-blue-300 transition-colors duration-300">
        <span className="transition-transform duration-300 group-open:rotate-90">
          ›
        </span>
        {entry.detailsLabel ?? "More"}
      </summary>
      <div className="mt-4 space-y-4">
        {entry.details.map((section) => (
          <div key={section.label}>
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-white/45">
              {section.label}
            </p>
            <ul className="mt-2 space-y-1.5">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-sm text-white/65 font-light leading-relaxed"
                >
                  <span className="mt-2 h-1 w-1 flex-none rounded-full bg-blue-300/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  return (
    <div
      className={`${styles.stagePanel} rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row gap-5`}
    >
      <LogoTile entry={entry} />
      <div className="flex-1 min-w-0">
        <h3 className="font-montserrat text-xl md:text-2xl font-medium text-white leading-snug">
          {entry.org}
        </h3>
        <p className="mt-1 font-montserrat text-blue-300 text-sm md:text-base font-light">
          {entry.role}
        </p>
        <p className="mt-2 text-[0.7rem] uppercase tracking-[0.14em] text-white/45">
          {entry.location ? `${entry.location}  ·  ${entry.dates}` : entry.dates}
        </p>
        <p className="mt-3 text-sm md:text-base text-white/70 font-light leading-relaxed">
          {entry.blurb}
        </p>
        <EntryDetails entry={entry} />
      </div>
    </div>
  );
}

// One row on the rail: an accent node on the vertical line + the card.
function TimelineRow({ entry }: { entry: Entry }) {
  return (
    <PopInBlock variant="materialize">
      <div className="flex gap-5 md:gap-8 pb-10">
        <div className="relative flex-none w-4 flex justify-center pt-7">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-300/80 ring-4 ring-[#121212]" />
        </div>
        <div className="flex-1 min-w-0">
          <EntryCard entry={entry} />
        </div>
      </div>
    </PopInBlock>
  );
}

function YearStation({ year }: { year: string }) {
  return (
    <div className="flex items-center gap-5 mt-14 mb-7 first:mt-0">
      <div className="relative flex-none w-4 flex justify-center">
        <span className="h-4 w-4 rounded-full border border-white/40 bg-[#121212]" />
      </div>
      <span className="font-cormorant font-light text-4xl md:text-5xl text-white/85 leading-none">
        {year}
      </span>
    </div>
  );
}

export default function MyPath() {
  return (
    <div className={`pt-4 mt-16 ${styles.textContainer}`}>
      {/* Section header */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-montserrat">
          The journey so far
        </p>
        <h1 className="mt-3 font-cormorant font-light text-5xl md:text-6xl text-white">
          My Path
        </h1>
        <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
      </div>

      {/* Timeline rail */}
      <div className="relative w-[90%] md:w-[80%] max-w-3xl mx-auto mt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 bottom-16 left-2 w-px bg-gradient-to-b from-transparent via-white/15 to-white/5"
        />

        {timeline.map((group) => (
          <div key={group.year}>
            <PopInBlock variant="materialize">
              <YearStation year={group.year} />
            </PopInBlock>
            {group.entries.map((entry) => (
              <TimelineRow key={`${entry.org}-${entry.dates}`} entry={entry} />
            ))}
          </div>
        ))}

        {/* Education */}
        <PopInBlock variant="materialize">
          <YearStation year="2023" />
        </PopInBlock>
        <PopInBlock variant="materialize">
          <div className="flex gap-5 md:gap-8 pb-10">
            <div className="relative flex-none w-4 flex justify-center pt-7">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-300/80 ring-4 ring-[#121212]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="mb-3 text-[0.7rem] uppercase tracking-[0.16em] text-white/45">
                Education
              </p>
              <EntryCard entry={education} />
            </div>
          </div>
        </PopInBlock>

        {/* Origin — where it all began */}
        <PopInBlock variant="materialize">
          <div className="flex gap-5 md:gap-8 pb-10">
            <div className="relative flex-none w-4 flex justify-center pt-7">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-300/80 ring-4 ring-[#121212]" />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`${styles.stagePanel} rounded-2xl p-7 md:p-9 text-center`}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-white/45 font-montserrat">
                  2019 — Present
                </p>
                <h3 className="mt-3 font-cormorant font-light text-3xl md:text-4xl text-white">
                  A Lifelong Journey of Learning
                </h3>
                <p className="mt-2 text-blue-300 text-sm md:text-base font-light">
                  Aspiring Software Engineer
                </p>
                <p className="mt-5 max-w-xl mx-auto text-sm md:text-base text-white/70 font-light leading-relaxed">
                  What began as a simple curiosity for making a video game
                  during the COVID-19 pandemic ignited my passion for all things
                  software — and a lifelong drive to keep learning and building.
                </p>
              </div>
            </div>
          </div>
        </PopInBlock>

        {/* Root node — a station on the rail */}
        <PopInBlock variant="materialize">
          <div className="flex items-center gap-5 md:gap-8 pt-2 pb-2">
            <div className="relative flex-none w-4 flex justify-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#121212] text-xl">
                🌺
              </span>
            </div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/45 font-montserrat">
              Where it all began · Oʻahu, Hawaiʻi
            </p>
          </div>
        </PopInBlock>
      </div>
    </div>
  );
}
