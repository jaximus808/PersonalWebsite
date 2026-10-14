'use client'
import Header from "../components/header"
import Seo from "../components/Seo"

const resume = {
  name: "Jaxon Poentis",
  contacts: [
    { label: "jaxonp808@gmail.com", href: "mailto:jaxonp808@gmail.com" },
    { label: "linkedin.com/in/jaxon-poentis", href: "https://linkedin.com/in/jaxon-poentis/" },
    { label: "github.com/jaximus808", href: "https://github.com/jaximus808" },
    { label: "jaxonp.com", href: "https://jaxonp.com" },
  ],
  education: {
    school: "Washington University in St. Louis",
    degree: "Bachelor of Science in Computer Science and Mathematics | GPA: 3.75/4.0",
    location: "St. Louis, MO",
    date: "May 2027",
    bullets: [
      "Honors: ISEF Finalist (2022); Dean's List; Eagle Scout | YC Startup School 2026 (SF)",
      "Coursework: Intro to AI, Cloud Computing with Big Data Applications, Systems Software, Analysis of Algorithms, Concurrency & Memory-Safe Systems (Grad), Theory of Parallel Systems (Grad)",
    ],
  },
  experience: [
    {
      org: "Northstar Robotics",
      role: "Robotics Software Engineer",
      location: "Remote, SF",
      date: "Sept. 2026 – Present",
      bullets: [
        "Shipped a multi-relay supervisor for robot teleoperation and data collection; built reusable installers, configuration tools, and hardware diagnostics to support partner deployments.",
        "Built a reliable recording pipeline that raised three-camera capture from 7.5–11.6 to 30 fps; all 29 test recordings reached Azure within 9–36 seconds of stopping, with synchronized video, joints, and actions.",
        "Resolved production camera-session leaks and network dropouts; added automatic reconnection and recording-upload recovery after restarts to support remote operators.",
        "Built a Python/Modal pipeline to prepare robot demonstrations for policy fine-tuning on A100 GPUs, synchronizing video and actions, rejecting incomplete episodes, and holding out sessions for validation.",
      ],
    },
    {
      org: "Capital One",
      role: "Software Engineer Intern",
      location: "McLean, VA",
      date: "June 2026 – Aug. 2026",
      bullets: [
        "Built a FastAPI app on a 5-person team to replace manual CIDR and rule lookups, using PostgreSQL GiST indexes for subsecond searches across 1.5M+ security groups and rules.",
        "Built an in-app chat integration to eliminate separate API token provisioning by wrapping Claude Code in a driver; adopted by the team with expanding use across the organization.",
      ],
    },
    {
      org: "Tesla",
      role: "Software Engineer Intern",
      location: "Fremont, CA",
      date: "Jan. 2026 – May 2026",
      bullets: [
        "Led development of an AI agent platform for internal data retrieval and workflows using Python, FastAPI, LangGraph, and 12+ tools; adopted by billing, support, and application teams.",
        "Automated energy lease transfers and account updates for Tesla's entire U.S. energy customer base through asynchronous, event-driven workflows across 10+ .NET microservices.",
        "Led a cross-team authentication rollout to scope AI tool access to user accounts using Cerberus.",
        "Tuned latency against SLA targets with tracing, APM, and load tests; deployed to Kubernetes via Jenkins.",
      ],
    },
    {
      org: "Spectrum",
      role: "Software Engineer Intern",
      location: "St. Louis, MO",
      date: "May 2025 – Aug. 2025",
      bullets: [
        "Built a Python/AST dependency analyzer, saving 2–4 validation days per refactoring cycle.",
      ],
    },
  ],
  projects: [
    {
      org: "Tandem – AI Agent Orchestration",
      role: "Go, TypeScript, MCP, SQLite",
      date: "May 2026 – Present",
      bullets: [
        "Built an agent-orchestration platform with MCP integration, a durable task queue, and a live web interface where users review plans, approve work, and track execution across parallel agent sessions.",
        "Implemented atomic task claims to prevent duplicate assignments, heartbeat-based claim expiry to recover stalled work, and WebSocket updates that expose agent progress and results to users.",
        "Packaged the platform as a single binary with an embedded UI and SQLite; automated installation, MCP registration, and startup so new projects can reuse the same orchestration infrastructure.",
      ],
    },
    {
      org: "Delivery Robot Platform",
      role: "Go, Kafka, gRPC, WebSockets",
      date: "Aug. 2025 – Present",
      bullets: [
        "Lead a 20-person team building a campus delivery platform; developed Go microservices for fleet coordination, a JWT authentication service, and robot command interfaces, with Docker and GCP deployment.",
      ],
    },
  ],
  skills: [
    { label: "Languages", items: "Python, TypeScript, Go, SQL, C#, C++, Java, JavaScript" },
    { label: "AI & Applications", items: "LangGraph, MCP, FastAPI, React, Next.js, Node.js, PyTorch" },
    { label: "Data & Integrations", items: "PostgreSQL, MongoDB, SQLite, WebSockets, Kafka, gRPC, .NET" },
    { label: "Deployment", items: "Linux, Docker, Kubernetes, Azure, GCP, Modal, Jenkins, GitHub Actions" },
  ],
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-sm font-montserrat font-normal uppercase tracking-[0.18em] text-white/60 border-b border-white/10 pb-3 mb-8">
      {children}
    </h2>
  )
}

function Entry({ entry }: { entry: { org: string; role: string; location?: string; date: string; bullets: string[] } }) {
  return (
    <div className="mb-10 last:mb-0">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
        <h3 className="text-2xl font-cormorant font-light text-white">{entry.org}</h3>
        <span className="text-sm font-montserrat font-light text-white/60">{entry.date}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mt-1">
        <p className="text-sm font-montserrat font-light italic text-white/70">{entry.role}</p>
        {entry.location && <span className="text-sm font-montserrat font-light text-white/60">{entry.location}</span>}
      </div>
      <ul className="mt-4 space-y-2.5">
        {entry.bullets.map((bullet) => (
          <li key={bullet} className="text-[15px] font-montserrat font-light leading-relaxed text-white/70 pl-5 relative before:content-['·'] before:absolute before:left-0 before:text-blue-300">
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ResumePage() {
  return (
    <div className="bg-[#121212] text-white">
      <Seo
        title="Resume — Jaxon Poentis · Software Engineer"
        description="Resume of Jaxon Poentis: Robotics Software Engineer at Northstar Robotics, previously Software Engineer Intern at Capital One, Tesla, and Spectrum. CS + Math at Washington University in St. Louis, expected 2027."
        path="/resume"
      />
      {/* Full-viewport PDF first */}
      <div className="flex flex-col h-screen">
        <Header />
        <iframe
          className="mt-4 w-full flex-grow"
          title="Jaxon Poentis résumé PDF"
          src="./Jaxon_Poentis_main_resume.pdf"
        />
      </div>

      {/* Selectable, crawler-friendly text version below */}
      <section className="max-w-3xl mx-auto px-6 sm:px-8 pt-24 pb-32">
        <header className="mb-16">
          <h1 className="text-5xl sm:text-6xl font-cormorant font-light">{resume.name}</h1>
          <p className="mt-4 text-sm font-montserrat font-light text-white/60">
            {resume.contacts.map((contact, i) => (
              <span key={contact.label}>
                {i > 0 && <span className="mx-2 text-white/30">|</span>}
                <a
                  href={contact.href}
                  target={contact.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noreferrer"
                  className="text-blue-300 hover:text-white transition-colors duration-200"
                >
                  {contact.label}
                </a>
              </span>
            ))}
          </p>
        </header>

        <div className="mb-16">
          <SectionLabel>Education</SectionLabel>
          <Entry
            entry={{
              org: resume.education.school,
              role: resume.education.degree,
              location: resume.education.location,
              date: resume.education.date,
              bullets: resume.education.bullets,
            }}
          />
        </div>

        <div className="mb-16">
          <SectionLabel>Experience</SectionLabel>
          {resume.experience.map((entry) => (
            <Entry key={entry.org} entry={entry} />
          ))}
        </div>

        <div className="mb-16">
          <SectionLabel>Projects</SectionLabel>
          {resume.projects.map((entry) => (
            <Entry key={entry.org} entry={entry} />
          ))}
        </div>

        <div>
          <SectionLabel>Technical Skills</SectionLabel>
          <ul className="space-y-2.5">
            {resume.skills.map((skill) => (
              <li key={skill.label} className="text-[15px] font-montserrat font-light leading-relaxed text-white/70">
                <span className="text-white">{skill.label}:</span> {skill.items}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
