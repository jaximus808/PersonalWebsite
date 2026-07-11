import styles from "../styles/Home.module.css";
import { PopInBlock } from "./popinBlockContext";

type Domain = {
  index: string;
  title: string;
  blurb: string;
  tech: string[];
};

// Curated by domain rather than a flat wall of logos — each area names what was
// actually built, then the tools behind it. Grounded in the real work on "My Path".
const domains: Domain[] = [
  {
    index: "01",
    title: "Distributed & Backend Systems",
    blurb:
      "Fault-tolerant services and backend infrastructure — distributed systems and energy-platform work at Tesla, cloud backend controllers at Spectrum, and real-time APIs that hold up under load.",
    tech: [
      "Go",
      "Java",
      "Node.js",
      "WebSockets",
      "Real-time Systems",
      "Docker",
      "REST APIs",
    ],
  },
  {
    index: "02",
    title: "Robotics & Low-Level Systems",
    blurb:
      "Project lead for WashU Robotics, paired with a deep dive into the machine itself — ROS control, x86 assembly, and the concurrency and memory model underneath.",
    tech: [
      "C",
      "C++",
      "ROS",
      "x86 Assembly",
      "Concurrency",
      "Memory Systems",
    ],
  },
  {
    index: "03",
    title: "Full-Stack Product",
    blurb:
      "End-to-end products people actually use — typed React front ends over well-designed APIs, databases, and auth, shipped from prototype to production.",
    tech: [
      "TypeScript",
      "React",
      "Next.js",
      "Supabase",
      "Prisma",
      "Tailwind",
    ],
  },
  {
    index: "04",
    title: "Applied AI",
    blurb:
      "Language models wired into real products — AI agents at Tesla, medical-document analysis inside an XR assistant, and LLM-backed features end to end.",
    tech: ["Python", "AI Agents", "LLM Integration", "FastAPI"],
  },
];

// Core languages, kept as a quiet "at a glance" line beneath the domains.
const languages = ["C++", "Go", "C", "Python", "TypeScript", "Java", "C#"];

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs md:text-sm font-montserrat font-light text-white/70 transition-colors duration-300 hover:border-blue-300/30 hover:text-white">
      {label}
    </span>
  );
}

function DomainCard({ domain }: { domain: Domain }) {
  return (
    <div className={`${styles.stagePanel} h-full rounded-2xl p-6 md:p-7`}>
      <div className="flex items-baseline gap-3">
        <span className="font-cormorant font-light text-2xl text-blue-300/70 leading-none">
          {domain.index}
        </span>
        <h3 className="font-cormorant font-light text-2xl md:text-3xl text-white leading-snug">
          {domain.title}
        </h3>
      </div>
      <p className="mt-4 text-sm md:text-base text-white/70 font-light leading-relaxed">
        {domain.blurb}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {domain.tech.map((t) => (
          <Chip key={t} label={t} />
        ))}
      </div>
    </div>
  );
}

export default function TechStack() {
  return (
    <div className={`pt-4 mt-16 ${styles.textContainer}`}>
      {/* Section header — matches the "My Path" cadence */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-montserrat">
          What I build with
        </p>
        <h1 className="mt-3 font-cormorant font-light text-5xl md:text-6xl text-white">
          My Tech Stack
        </h1>
        <div className="mt-5 mx-auto h-px w-16 bg-white/25" />
      </div>

      {/* Domain grid */}
      <div className="mx-auto mt-14 grid w-[90%] md:w-[80%] max-w-4xl grid-cols-1 md:grid-cols-2 gap-5">
        {domains.map((domain, i) => (
          <PopInBlock key={domain.index} variant="materialize" delay={i * 80}>
            <DomainCard domain={domain} />
          </PopInBlock>
        ))}
      </div>

      {/* Languages — quiet closing line */}
      <PopInBlock variant="materialize" delay={120}>
        <div className="mx-auto mt-10 w-[90%] md:w-[80%] max-w-4xl text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/45 font-montserrat">
            Languages I reach for
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {languages.map((lang) => (
              <Chip key={lang} label={lang} />
            ))}
          </div>
        </div>
      </PopInBlock>
    </div>
  );
}
