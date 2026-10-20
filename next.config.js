const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

// Old database-era URLs (/blogs/<mongo id>, /projects/<Project_Name>) point at
// the MDX files that replaced them, via legacyId / legacyName in frontmatter.
//
// A legacy name that differs from its slug only in case (Tandem -> tandem) is
// left to proxy.ts: Vercel matches redirect sources case-insensitively, so a
// /projects/Tandem rule would also catch /projects/tandem and loop forever.
const isCaseOnly = (name, slug) => name !== slug && name.toLowerCase() === slug;

function readContent(section) {
  const dir = path.join(__dirname, "content", section);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => ({
      slug: file.replace(/\.mdx$/, ""),
      data: matter(fs.readFileSync(path.join(dir, file), "utf8")).data,
    }));
}

function legacyRedirects() {
  // Redirect sources are path-to-regexp patterns; keep names literal.
  const literal = (value) =>
    encodeURIComponent(value).replace(/[()*+?:{}]/g, (c) => `\\${c}`);

  const blog = readContent("blog")
    .filter(({ data }) => data.legacyId)
    .map(({ slug, data }) => ({
      source: `/blogs/${literal(data.legacyId)}`,
      destination: `/blog/${slug}`,
      permanent: true,
    }));
  const projects = readContent("projects")
    .filter(
      ({ slug, data }) =>
        data.legacyName &&
        data.legacyName !== slug &&
        !isCaseOnly(data.legacyName, slug),
    )
    .map(({ slug, data }) => ({
      source: `/projects/${literal(data.legacyName)}`,
      destination: `/projects/${slug}`,
      permanent: true,
    }));
  return [...blog, ...projects];
}

/** Legacy project names that differ from their slug only in case. */
function caseOnlyLegacyNames() {
  return readContent("projects")
    .filter(({ slug, data }) => data.legacyName && isCaseOnly(data.legacyName, slug))
    .map(({ data }) => data.legacyName);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // Add this line
  images: {
    // remotePatterns: [
    // {
    // protocol: 'https',
    // hostname: 'drive.google.com',
    // port: '',
    // },
    // ],
    domains:['drive.google.com','cdn.discordapp.com']
  },
  compress:true,
  // The sitemap reads content/ at request time.
  outputFileTracingIncludes: {
    "/sitemap.xml": ["./content/**/*.mdx"],
  },
  // Read by proxy.ts, inlined at build time.
  env: {
    LEGACY_CASED_PROJECTS: JSON.stringify(caseOnlyLegacyNames()),
  },
  async redirects() {
    return legacyRedirects();
  },
  webpack(config, { dev }) {
    if(dev) {
      config.devtool = 'react_devtools_backend_compact'
    }
    return config;
  }
}
module.exports = nextConfig
