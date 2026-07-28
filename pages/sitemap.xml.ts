import { GetServerSideProps } from "next";
import prisma from "../lib/prisma";
import { SITE_URL } from "../components/Seo";

// Serves /sitemap.xml — static routes plus every project and blog post from
// the database, so Google can discover and index all public pages.

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
  let dynamicPaths: string[] = [];
  try {
    const [projects, blogs] = await Promise.all([
      prisma.projects.findMany({ select: { name: true } }),
      prisma.blog.findMany({ select: { id: true } }),
    ]);
    dynamicPaths = [
      ...projects.map((p) => `/projects/${encodeURIComponent(p.name)}`),
      ...blogs.map((b) => `/blogs/${b.id}`),
    ];
  } catch {
    // Database unavailable — still serve the static routes.
  }

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
