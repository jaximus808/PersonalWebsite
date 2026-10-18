const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

// Old database-era URLs (/blogs/<mongo id>, /projects/<Project_Name>) point at
// the MDX files that replaced them, via legacyId / legacyName in frontmatter.
function legacyRedirects() {
  const read = (section) => {
    const dir = path.join(__dirname, "content", section);
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => ({
        slug: file.replace(/\.mdx$/, ""),
        data: matter(fs.readFileSync(path.join(dir, file), "utf8")).data,
      }));
  };
  // Redirect sources are path-to-regexp patterns; keep names literal.
  const literal = (value) =>
    encodeURIComponent(value).replace(/[()*+?:{}]/g, (c) => `\\${c}`);

  const blog = read("blog")
    .filter(({ data }) => data.legacyId)
    .map(({ slug, data }) => ({
      source: `/blogs/${literal(data.legacyId)}`,
      destination: `/blog/${slug}`,
      permanent: true,
    }));
  const projects = read("projects")
    .filter(({ slug, data }) => data.legacyName && data.legacyName !== slug)
    .map(({ slug, data }) => ({
      source: `/projects/${literal(data.legacyName)}`,
      destination: `/projects/${slug}`,
      permanent: true,
    }));
  return [...blog, ...projects];
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
  experimental: {
    // Redirect sources match case-insensitively by default, which would send
    // /projects/tandem back to itself via the legacy /projects/Tandem rule.
    caseSensitiveRoutes: true,
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
