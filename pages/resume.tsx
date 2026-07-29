'use client'
import Header from "../components/header"
import Seo from "../components/Seo"

const resume = {
  name: "Jaxon Poentis",
  contacts: [
    { label: "j.k.poentis@wustl.edu", href: "mailto:j.k.poentis@wustl.edu" },
    { label: "linkedin.com/in/jaxon-poentis", href: "https://linkedin.com/in/jaxon-poentis/" },
    { label: "github.com/jaximus808", href: "https://github.com/jaximus808" },
    { label: "jaxonp.com", href: "https://jaxonp.com" },
  ],
  education: {
    school: "Washington University in St. Louis",
    degree: "Bachelor of Science in Computer Science + Math",
    location: "St. Louis, MO",
    date: "May 2027",
    bullets: [
      "Awards: Eagle Scout, Anheuser-Busch Scholar, Dean's List",
      "Coursework: Parallel Programming, Cloud Computing, System Software, OOP, Rapid Prototyping",
    ],
  },
  experience: [
    {
      org: "Capital One",
      role: "Software Engineering Intern",
      location: "McLean, VA",
      date: "June 2026 – Present",
      bullets: [
        "Built a self-serve FastAPI web app with a team of 5, enabling enterprise teams to search across security groups by CIDR and rule, replacing slow manual lookups across the cloud network environment.",
        "Implemented PostgreSQL query optimization using GiST indexes to search 1.5M+ security groups and rules in under a second, delivering near-instant self-serve results at scale.",
      ],
    },
    {
      org: "Tesla",
      role: "Software Engineering Intern",
      location: "Fremont, CA",
      date: "Jan. 2026 – May 2026",
      bullets: [
        "Created, led, and deployed an AI agent platform (Python, FastAPI, LangGraph, MongoDB, WebSockets) that automates data retrieval and workflow execution across internal microservices via 12+ tool interfaces, adopted by billing, support, and application teams.",
        "Engineered asynchronous, event-driven workflows across 10+ distributed .NET microservices to orchestrate energy lease transfers and propagate account data to production, serving Tesla's entire U.S. energy customer base.",
        "Led a cross-team effort to ship account-based authentication across the microservice fleet, integrating Cerberus with on-behalf-of identity propagation and account passthrough for secure, scoped tool execution.",
        "Profiled and tuned service latency with distributed tracing, APM, and load testing against production SLAs; deployed and managed services across Kubernetes pods with Jenkins CI/CD pipelines.",
      ],
    },
    {
      org: "Spectrum",
      role: "Software Engineering Intern",
      location: "St. Louis, MO",
      date: "May 2025 – Aug. 2025",
      bullets: [
        "Built a Python coupling analysis tool with custom search algorithms and AST parsing to map nested Java class dependencies, reducing refactoring errors and saving 2–4 days of manual validation per development cycle.",
        "Developed backend controller logic and fulfillment workflow integrations to trigger automated email notifications on status changes, enabling faster cross-team collaboration and response times.",
      ],
    },
  ],
  projects: [
    {
      org: "Tandem – Canvas for Humans & Agents",
      role: "Go, TypeScript, WebSockets, MCP",
      date: "May 2026 – Present",
      bullets: [
        "Built and shipped a real-time collaborative canvas (tandemcanvas.com) where humans and AI agents co-edit shared maps, docs, sheets, and roadmaps; engineered a Go WebSocket hub for low-latency multi-client sync and a Node MCP server exposing the canvas as agent-callable tools, backed by Postgres and deployed on GCP via Docker and GitHub Actions.",
      ],
    },
    {
      org: "ANDR – Robotics Agent Framework",
      role: "C++, Python, ROS 2, LangGraph",
      date: "Feb. 2026 – Present",
      bullets: [
        "Built an open-source ROS 2 framework where an LLM controls a robot through strictly decoupled layers; wrote a C++ tool-manager that dynamically discovers and dispatches skill calls to independent action servers, a C++ behavior-tree brain, and a Python ReAct agent, with Gazebo simulation and a FastAPI/WebSocket UI.",
      ],
    },
  ],
  leadership: [
    {
      org: "Google Developer Group – WashU",
      role: "Core Team Lead",
      location: "St. Louis, MO",
      date: "Aug. 2025 – Present",
      bullets: [
        "Led a team of 8 students through a semester-long project, mentoring on system design and engineering practices while organizing workshops and tech events for the broader WashU CS community.",
      ],
    },
  ],
  skills: [
    { label: "Languages", items: "Java, Python, C++, C, C#, Go, SQL (Postgres), JavaScript, TypeScript, HTML/CSS" },
    { label: "Frameworks", items: "Node.js, .NET, React.js, Phaser.js, Express.js, Gin, FastAPI, ROS2, OpenCV, Unity" },
    { label: "Technologies", items: "Docker, Kubernetes, Jenkins, Supabase, Firebase, Vultr, MongoDB, PostgreSQL, UDP/TCP, Git, Linux, OAuth" },
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
        description="Resume of Jaxon Poentis: Software Engineering Intern at Capital One (2026) and Tesla (2026), previously Spectrum. CS + Math at Washington University in St. Louis, expected 2027."
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

        <div className="mb-16">
          <SectionLabel>Leadership</SectionLabel>
          {resume.leadership.map((entry) => (
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
