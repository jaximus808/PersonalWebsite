import styles from "../styles/Home.module.css";
import { PopInBlock } from "./popinBlockContext";

type Domain = {
  index: string;
  title: string;
  // Short label above the title — used to flag the two focus areas.
  eyebrow?: string;
  blurb: string;
  // Concrete things actually built/shipped — grounded in the real work on
  // "My Path" (Tesla, Spectrum, WashU Robotics, Health XR, Devstac …).
  proof: string[];
  tech: string[];
};

// The two areas I go deepest in — given real estate and a "what I built"
// column so the depth reads, instead of a flat wall of logos.
const focusDomains: Domain[] = [
  {
    index: "01",
    title: "Distributed & Backend Systems",
    eyebrow: "Focus area",
    blurb:
      "Where I go deepest — microservices and the infrastructure underneath them, built to stay correct while the load and the failure modes pile up.",
    proof: [
      "Built microservices powering energy-platform backend infrastructure at Tesla",
      "Cloud backend controllers for Spectrum's Service Delivery platform",
      "Real-time APIs and services over Supabase / Postgres at WashU's Devstac",
      "Joining Capital One's Cloud team to keep building at scale",
    ],
    tech: [
      "Go",
      "Java",
      "Microservices",
      "Node.js",
      "WebSockets",
      "Docker",
      "REST APIs",
      "PostgreSQL",
    ],
  },
  {
    index: "02",
    title: "Robotics & Low-Level Systems",
    eyebrow: "Focus area",
    blurb:
      "The other end of the stack — machines that have to survive the physical world, and a real understanding of the concurrency and memory model they run on.",
    proof: [
      "Project Lead for WashU Robotics, driving the team's ROS-based control work",
      "Teach x86 assembly, C, and the memory model as a System Software TA",
      "Concurrency and parallelism from Parallel & Concurrent Programming coursework",
    ],
    tech: [
      "C",
      "C++",
      "ROS",
      "x86 Assembly",
      "Concurrency",
      "Parallelism",
      "Memory Systems",
    ],
  },
];

// Strong supporting areas — kept tighter so the focus areas lead.
const supportingDomains: Domain[] = [
  {
    index: "03",
    title: "Full-Stack Product",
    blurb:
      "End-to-end products people actually use, shipped from prototype to production.",
    proof: [
      "Won #1 at STL Startup Tech Week with a Meta Quest XR health assistant",
      "Flashcard backend: full-text search, tagging, and privacy controls",
    ],
    tech: ["TypeScript", "React", "Next.js", "Supabase", "Prisma", "Tailwind"],
  },
  {
    index: "04",
    title: "Applied AI",
    blurb: "Language models wired into real products, end to end.",
    proof: [
      "AI agents at Tesla",
      "LLM analysis of medical documents inside an XR assistant",
    ],
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

function ProofList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-2.5 text-sm md:text-[0.95rem] text-white/70 font-light leading-relaxed"
        >
          <span className="mt-2 h-1 w-1 flex-none rounded-full bg-blue-300/60" />
          {item}
        </li>
      ))}
    </ul>
  );
}

// Featured card for a focus area: an editorial two-column split — the pitch on
// the left, the concrete "what I've built" ledger on the right.
function FocusCard({ domain }: { domain: Domain }) {
  return (
    <div className={`${styles.stagePanel} h-full rounded-2xl p-7 md:p-9`}>
      <div className="flex flex-col md:flex-row gap-7 md:gap-12">
        <div className="md:w-[42%]">
          {domain.eyebrow ? (
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80 font-montserrat">
              {domain.eyebrow}
            </p>
          ) : null}
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-cormorant font-light text-2xl text-blue-300/70 leading-none">
              {domain.index}
            </span>
            <h3 className="font-cormorant font-light text-3xl md:text-4xl text-white leading-tight">
              {domain.title}
            </h3>
          </div>
          <p className="mt-4 text-sm md:text-base text-white/70 font-light leading-relaxed">
            {domain.blurb}
          </p>
        </div>
        <div className="md:w-[58%] md:border-l md:border-white/10 md:pl-12">
          <p className="text-[0.7rem] uppercase tracking-[0.16em] text-white/45 font-montserrat">
            What I&apos;ve built
          </p>
          <div className="mt-4">
            <ProofList items={domain.proof} />
          </div>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-2 border-t border-white/[0.06] pt-6">
        {domain.tech.map((t) => (
          <Chip key={t} label={t} />
        ))}
      </div>
    </div>
  );
}

// Tighter card for a supporting area.
function SupportingCard({ domain }: { domain: Domain }) {
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
      <div className="mt-5">
        <ProofList items={domain.proof} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
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
        <p className="mt-6 mx-auto max-w-xl text-sm md:text-base text-white/60 font-light leading-relaxed">
          I&apos;m happiest deep in systems — microservices that hold up under
          load, and robots that have to survive the physical world.
          Everything below is grounded in something I&apos;ve actually shipped.
        </p>
      </div>

      {/* Focus areas — the depth leads */}
      <div className="mx-auto mt-14 flex w-[90%] md:w-[80%] max-w-4xl flex-col gap-5">
        {focusDomains.map((domain, i) => (
          <PopInBlock key={domain.index} variant="materialize" delay={i * 80}>
            <FocusCard domain={domain} />
          </PopInBlock>
        ))}
      </div>

      {/* Supporting areas */}
      <div className="mx-auto mt-5 grid w-[90%] md:w-[80%] max-w-4xl grid-cols-1 md:grid-cols-2 gap-5">
        {supportingDomains.map((domain, i) => (
          <PopInBlock key={domain.index} variant="materialize" delay={i * 80}>
            <SupportingCard domain={domain} />
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
