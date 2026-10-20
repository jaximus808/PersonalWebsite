// Slugs, draft keys and the three kinds of image path a draft can hold.
// Pure functions, shared by the shell, the panels and the preview.

import type { Kind } from "../shared/types";

/** Lowercase a-z0-9 words joined by single hyphens (SPEC.md "Draft storage"). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 80;

export const KINDS: readonly Kind[] = ["blog", "projects"];

export const KIND_LABEL: Record<Kind, { one: string; many: string }> = {
  blog: { one: "Post", many: "Blog" },
  projects: { one: "Project", many: "Projects" },
};

export function isKind(value: unknown): value is Kind {
  return value === "blog" || value === "projects";
}

/** "My First Robot Arm!" -> "my-first-robot-arm". Never longer than SLUG_MAX. */
export function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents left by NFKD
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "") // "Jaxon's" -> "jaxons", not "jaxon-s"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= SLUG_MAX) return base;
  // Cut at a word boundary so the slug doesn't end mid-word.
  const cut = base.slice(0, SLUG_MAX + 1);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : base.slice(0, SLUG_MAX)).replace(/-+$/, "");
}

/** Why a slug can't be used, in plain words, or null when it's fine. */
export function slugProblem(slug: string): string | null {
  if (slug.length === 0) return "Give it a slug.";
  if (slug.length > SLUG_MAX) return `Keep it under ${SLUG_MAX} characters.`;
  if (/[A-Z]/.test(slug)) return "Lowercase only.";
  if (/\s/.test(slug)) return "No spaces: join words with hyphens.";
  if (/--/.test(slug)) return "One hyphen between words.";
  if (/^-|-$/.test(slug)) return "No hyphen at the start or end.";
  if (!SLUG_PATTERN.test(slug)) return "Letters, numbers and hyphens only.";
  return null;
}

export type DraftRef = { kind: Kind; slug: string };

export function draftKey(ref: DraftRef): string {
  return `${ref.kind}/${ref.slug}`;
}

/** "blog/my-post" -> { kind, slug }, or null for anything malformed. */
export function parseDraftKey(value: string | null | undefined): DraftRef | null {
  if (!value) return null;
  const match = /^([a-z]+)\/(.+)$/.exec(value.trim().replace(/^\/+|\/+$/g, ""));
  if (!match) return null;
  const [, kind, slug] = match;
  if (!isKind(kind) || slugProblem(slug) !== null) return null;
  return { kind, slug };
}

export function sameDraft(a: DraftRef | null, b: DraftRef | null): boolean {
  return !!a && !!b && a.kind === b.kind && a.slug === b.slug;
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function isRemote(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * A path as the doc stores it -> a URL this browser can load.
 *   "assets/x.jpg"       -> /drafts/<kind>/<slug>/assets/x.jpg
 *   "/blog/a/1.jpg"      -> /site/blog/a/1.jpg   (served from the repo's public/)
 *   "https://…"          -> unchanged
 */
export function resolveSrc(src: string, ref: DraftRef): string {
  const value = src.trim();
  if (!value) return "";
  if (isRemote(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (value.startsWith("assets/")) {
    return `/drafts/${ref.kind}/${ref.slug}/${encodePath(value)}`;
  }
  if (value.startsWith("/blog/") || value.startsWith("/projects/")) {
    return `/site${encodePath(value)}`;
  }
  // A bare filename most likely means an uploaded asset; anything else is
  // passed through so a broken path shows as a broken image, not a guess.
  if (!value.startsWith("/") && !value.includes("/")) {
    return `/drafts/${ref.kind}/${ref.slug}/assets/${encodeURIComponent(value)}`;
  }
  return value;
}

/**
 * A path as the exported MDX writes it -> a URL this browser can load. The
 * export rewrites "assets/x" to "/<kind>/<slug>/x" and anatomy figures to
 * "/<kind>/<slug>/figures/<id>.html"; until the draft is built those files
 * only exist in the draft folder, so the preview reads them from there.
 */
export function resolveExportedSrc(src: string, ref: DraftRef, assets?: ReadonlySet<string>): string {
  const value = src.trim();
  const own = `/${ref.kind}/${ref.slug}/`;
  if (value.startsWith(own)) {
    const rest = value.slice(own.length);
    if (rest.startsWith("figures/")) return `/drafts/${ref.kind}/${ref.slug}/${encodePath(rest)}`;
    // With the draft's asset list in hand, a path the doc doesn't own (raw MDX
    // kept from an import, say) is still the published file in public/.
    if (!assets || assets.has(`assets/${rest}`)) {
      return `/drafts/${ref.kind}/${ref.slug}/assets/${encodePath(rest)}`;
    }
  }
  return resolveSrc(value, ref);
}

/** The anatomy id a Diagram src points at: ".../figures/fig-2.html" -> "fig-2". */
export function figureIdFromSrc(src: string): string | null {
  const match = /\/figures\/([^/]+)\.html$/.exec(src.trim());
  return match ? decodeURIComponent(match[1]) : null;
}

/** The URL of a built anatomy figure page in the draft folder. */
export function figureUrl(ref: DraftRef, id: string): string {
  return `/drafts/${ref.kind}/${ref.slug}/figures/${encodeURIComponent(id)}.html`;
}

/** Where the piece will live on the site once built. */
export function sitePath(ref: DraftRef): string {
  return `/${ref.kind}/${ref.slug}`;
}

/**
 * A YouTube id from whatever got pasted: an id, a watch URL, a youtu.be link,
 * a shorts/embed/live URL. Null when it doesn't look like one.
 */
export function youtubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    if (!id) {
      const match = /^\/(?:embed|shorts|live|v)\/([\w-]{11})/.exec(url.pathname);
      id = match ? match[1] : null;
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}

/** True for file names the browser can show as an image. */
export function looksLikeImage(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(path.split(/[?#]/)[0]);
}
