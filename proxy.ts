import { NextResponse, type NextRequest } from "next/server";

// Old /projects/<Name> URLs whose name differs from today's slug only in case
// (/projects/Tandem -> /projects/tandem). They can't be redirects in
// next.config.js: Vercel matches those case-insensitively, so the rule would
// also catch /projects/tandem and send it to itself. Compared exactly here.
const CASED = new Set<string>(JSON.parse(process.env.LEGACY_CASED_PROJECTS ?? "[]"));

export function proxy(request: NextRequest) {
  let name: string;
  try {
    name = decodeURIComponent(request.nextUrl.pathname.slice("/projects/".length));
  } catch {
    return NextResponse.next(); // malformed escape: let the page 404
  }
  if (!CASED.has(name)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/projects/${name.toLowerCase()}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/projects/:slug",
};
