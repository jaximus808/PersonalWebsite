import Head from "next/head";

// Canonical origin of the deployed site — used for canonical URLs, Open Graph
// tags, structured data, and the sitemap. No trailing slash.
export const SITE_URL = "https://www.jaxonp.com";

export const PERSON_NAME = "Jaxon Poentis";

// One-line professional identity, reused as the default meta description.
// Search engines and AI agents lean heavily on this text, so it names the
// profession and the employers explicitly.
export const DEFAULT_DESCRIPTION =
  "Jaxon Poentis is a software engineer from Oʻahu, Hawaiʻi studying CS + Math at Washington University in St. Louis. Software engineering intern at Capital One (2026) and previously Tesla, Spectrum, and Flashcardify.ai — focused on distributed systems, backend infrastructure, AI agents, and robotics.";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/headshot.jpg`;

export const SOCIAL_PROFILES = [
  "https://www.linkedin.com/in/jaxon-poentis",
  "https://github.com/jaximus808",
  "https://www.youtube.com/@jaxonpoentis",
  "https://x.com/soljaxonp",
];

// Structured data for the homepage: a ProfilePage whose main entity is the
// Person. This is the machine-readable record of who Jaxon is and where he
// has worked — the piece search engines and AI agents use to answer
// "who is Jaxon Poentis?" without scraping LinkedIn.
export const PERSON_JSONLD = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: {
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: PERSON_NAME,
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    jobTitle: "Software Engineer",
    description:
      "Software engineer studying CS + Math at Washington University in St. Louis (expected 2027). Software Engineering Intern at Capital One (summer 2026: cloud resilience, security tooling, and agent skills). Previously Software Engineering Intern at Tesla (2026: distributed systems, energy backend infrastructure, and AI agents), Spectrum (2025: cloud backend controllers), and Flashcardify.ai (2024). Founding engineer at Health XR, software engineer at WashU IT Devstac, project lead of WashU Robotics, and teaching assistant for System Software and Data Structures & Algorithms.",
    worksFor: {
      "@type": "Organization",
      name: "Capital One",
      description: "Software Engineer Intern, June 2026 – August 2026",
    },
    alumniOf: [
      {
        "@type": "CollegeOrUniversity",
        name: "Washington University in St. Louis",
        description:
          "B.S. Computer Science + Math and Entrepreneurship, 2023 – expected 2027",
      },
      {
        "@type": "Organization",
        name: "Tesla",
        description:
          "Software Engineering Intern, January 2026 – May 2026 — distributed systems, energy backend infrastructure, AI agents (Fremont, CA)",
      },
      {
        "@type": "Organization",
        name: "Spectrum",
        description:
          "Software Engineering Intern, May 2025 – August 2025 — Service Delivery cloud backend (St. Louis, MO)",
      },
      {
        "@type": "Organization",
        name: "Flashcardify.ai",
        description:
          "Software Engineering Intern, September 2024 – January 2025 — backend infrastructure with Node.js and Supabase",
      },
    ],
    knowsAbout: [
      "Distributed Systems",
      "Backend Infrastructure",
      "AI Agents",
      "Model Context Protocol (MCP)",
      "Robotics",
      "Cloud Computing",
      "Go",
      "C++",
      "Python",
      "TypeScript",
      "Java",
    ],
    birthPlace: {
      "@type": "Place",
      name: "Oʻahu, Hawaiʻi",
    },
    sameAs: SOCIAL_PROFILES,
  },
};

type SeoProps = {
  title: string;
  description?: string;
  /** Path of this page starting with "/", e.g. "/projects". Used for the canonical URL. */
  path: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  children?: React.ReactNode;
};

// Shared <Head> block: title, description, canonical, Open Graph and Twitter
// cards. Page-specific extras (e.g. JSON-LD scripts) go in `children`.
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  children,
}: SeoProps) {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <link rel="icon" href="/favicon.ico" />

      <meta property="og:site_name" content={PERSON_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {children}
    </Head>
  );
}
