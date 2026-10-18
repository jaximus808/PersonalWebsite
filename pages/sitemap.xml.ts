import { GetServerSideProps } from "next";
import { listPosts, listProjects } from "../lib/content";
import { SITE_URL } from "../components/Seo";

// Serves /sitemap.xml — static routes plus every project and blog post in
// content/, so Google can discover and index all public pages.

const STATIC_PATHS = ["/", "/projects", "/blog", "/chess", "/resume", "/contact"];

function buildXml(paths: string[]): string {
  const urls = paths
    .map(
      (path) =>
        `  <url><loc>${SITE_URL}${path === "/" ? "" : path}</loc></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const dynamicPaths = [
    ...listProjects().map((project) => `/projects/${project.slug}`),
    ...listPosts().map((post) => `/blog/${post.slug}`),
  ];

  res.setHeader("Content-Type", "application/xml");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=43200"
  );
  res.write(buildXml([...STATIC_PATHS, ...dynamicPaths]));
  res.end();

  return { props: {} };
};

// Body is written directly in getServerSideProps; nothing to render.
export default function Sitemap() {
  return null;
}
