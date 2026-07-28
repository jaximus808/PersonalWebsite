import Header from "../components/header";
import Seo from "../components/Seo";

// Crawlable text summary of the resume — the PDF iframe below is invisible to
// most crawlers and AI agents, so the employment history also lives here as
// real HTML.
const roles = [
  {
    org: "Capital One",
    role: "Software Engineer Intern",
    dates: "06/2026 — 08/2026",
    summary: "Cloud resilience, security tooling, GIST-indexed search, and agent skills.",
  },
  {
    org: "Tesla",
    role: "Software Engineering Intern",
    dates: "01/2026 — 05/2026",
    summary: "Distributed systems, energy backend infrastructure, and AI agents (Fremont, CA).",
  },
  {
    org: "Spectrum",
    role: "Software Engineering Intern",
    dates: "05/2025 — 08/2025",
    summary: "Service Delivery team — cloud backend controllers (St. Louis, MO).",
  },
  {
    org: "WashU IT — Devstac",
    role: "Software Engineer",
    dates: "04/2025 — Present",
    summary: "Full-stack software for internal and external clients.",
  },
  {
    org: "Washington University in St. Louis",
    role: "B.S. CS + Math, and Entrepreneurship",
    dates: "08/2023 — Expected 05/2027",
    summary: "System Software & Data Structures TA; WashU Robotics project lead.",
  },
];

export default function PDFPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#121212]">
      <Seo
        title="Resume — Jaxon Poentis · Software Engineer"
        description="Resume of Jaxon Poentis: Software Engineering Intern at Capital One (2026) and Tesla (2026), previously Spectrum. CS + Math at Washington University in St. Louis, expected 2027."
        path="/resume"
      />
      <Header />

      <section className="mx-auto w-full max-w-4xl px-6 pt-8 text-white">
        <h1 className="font-cormorant font-light text-4xl md:text-5xl">
          Jaxon Poentis — Resume
        </h1>
        <p className="mt-3 text-white/70 font-light leading-relaxed">
          Software engineer focused on distributed systems, backend
          infrastructure, AI agents, and robotics. Currently a Software
          Engineer Intern at Capital One; previously Tesla and Spectrum.{" "}
          <a
            className="underline text-blue-300"
            href="/Jaxon_Poentis_main_resume.pdf"
          >
            Download the PDF
          </a>
          .
        </p>
        <ul className="mt-5 space-y-2">
          {roles.map((r) => (
            <li key={`${r.org}-${r.dates}`} className="text-sm md:text-base font-light">
              <span className="text-white">{r.org}</span>
              <span className="text-blue-300"> · {r.role}</span>
              <span className="text-white/50"> · {r.dates}</span>
              <span className="text-white/65"> — {r.summary}</span>
            </li>
          ))}
        </ul>
      </section>

      <iframe
        title="Jaxon Poentis resume PDF"
        className="mt-6 w-full flex-grow min-h-[70vh]"
        src="./Jaxon_Poentis_main_resume.pdf"
      />
    </div>
  );
}
