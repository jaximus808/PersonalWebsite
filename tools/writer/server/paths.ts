// Where the writer reads and writes, and the checks that keep every path it
// touches inside those places. Anything that turns user input (a slug, a
// filename, a URL path) into a filesystem path goes through here.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Kind } from "../src/shared/types.ts";

export const KINDS: readonly Kind[] = ["blog", "projects"];

/** Lowercase a-z0-9 words joined by single hyphens, 1–80 characters. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 80;

/** Anatomy figure ids become filenames (figures/<id>.html), so they get the same rule. */
export const FIGURE_ID_PATTERN = SLUG_PATTERN;

/** An error that already knows its HTTP status. The API turns it into `{ error }`. */
export class HttpError extends Error {
  readonly status: number;
  /** Extra response headers, e.g. Allow on a 405. */
  readonly headers: Record<string, string>;

  // Plain fields rather than constructor parameter properties, so this file
  // stays erasable TypeScript (Node's type stripping and Vite's native config
  // loader can run it as is).
  constructor(status: number, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.headers = headers;
  }
}

export function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

export function isSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= SLUG_MAX && SLUG_PATTERN.test(value);
}

export function isFigureId(value: unknown): value is string {
  return typeof value === "string" && value.length <= SLUG_MAX && FIGURE_ID_PATTERN.test(value);
}

export function assertKind(value: unknown): Kind {
  if (!isKind(value)) {
    throw new HttpError(400, `Unknown kind ${JSON.stringify(value)}: use "blog" or "projects".`);
  }
  return value;
}

export function assertSlug(value: unknown): string {
  if (!isSlug(value)) {
    throw new HttpError(
      400,
      `Bad slug ${JSON.stringify(value)}: use lowercase letters, digits and single hyphens (1–${SLUG_MAX} characters).`,
    );
  }
  return value;
}

/**
 * Turn a title into a slug suggestion ("Going to a place new is hard!" →
 * "going-to-a-place-new-is-hard"). Used by the CLI; the app has its own copy.
 */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, SLUG_MAX).replace(/-+$/, "");
}

/**
 * Join `segments` onto `base` and make sure the result is still inside `base`
 * (or is `base` itself). Throws a 400 otherwise, so "../" in any form,
 * absolute paths and encoded tricks all stop here.
 */
export function resolveInside(base: string, ...segments: string[]): string {
  for (const segment of segments) {
    if (segment.includes("\0")) throw new HttpError(400, "Path contains a NUL byte.");
  }
  const root = path.resolve(base);
  const target = path.resolve(root, ...segments);
  if (!isInside(root, target)) {
    throw new HttpError(400, "Path escapes its folder.");
  }
  return target;
}

/** True when `target` is `root` or somewhere below it (both absolute). */
export function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Split a URL-ish relative path ("assets/a b.jpg") into safe segments.
 * Rejects empty paths, ".", "..", dotfiles and backslashes outright rather
 * than normalising them, so a request can only ever name a plain file.
 */
export function safeSegments(relPath: string): string[] {
  if (relPath.includes("\\") || relPath.includes("\0")) {
    throw new HttpError(400, "Bad path.");
  }
  const segments = relPath.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) throw new HttpError(400, "Empty path.");
  for (const segment of segments) {
    if (segment === "." || segment === ".." || segment.startsWith(".")) {
      throw new HttpError(400, "Bad path.");
    }
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Roots

export interface WriterPaths {
  /** The site repo: holds content/ and public/. */
  repoRoot: string;
  /** tools/writer/drafts (or a temp dir in tests). */
  draftsDir: string;
}

const serverDir = path.dirname(fileURLToPath(import.meta.url));

/** tools/writer/server → the repo root three levels up. */
export const DEFAULT_REPO_ROOT = path.resolve(serverDir, "../../..");
export const DEFAULT_DRAFTS_DIR = path.resolve(serverDir, "../drafts");

export function defaultPaths(overrides: Partial<WriterPaths> = {}): WriterPaths {
  return {
    repoRoot: path.resolve(overrides.repoRoot ?? DEFAULT_REPO_ROOT),
    draftsDir: path.resolve(overrides.draftsDir ?? DEFAULT_DRAFTS_DIR),
  };
}

/** A sentence describing what is wrong with the repo root, or null when it looks right. */
export function checkRepoRoot(repoRoot: string): string | null {
  const missing = ["content", "public"].filter((dir) => {
    try {
      return !fs.statSync(path.join(repoRoot, dir)).isDirectory();
    } catch {
      return true;
    }
  });
  if (missing.length === 0) return null;
  return `The writer expected the site repo at ${repoRoot}, but it has no ${missing.join(" or ")}/ folder. Publishing and "Import from site" will not work.`;
}

export function contentFile(repoRoot: string, kind: Kind, slug: string): string {
  return resolveInside(repoRoot, "content", kind, `${slug}.mdx`);
}

export function publicDir(repoRoot: string, kind: Kind, slug: string): string {
  return resolveInside(repoRoot, "public", kind, slug);
}

export function draftDir(draftsDir: string, kind: Kind, slug: string): string {
  return resolveInside(draftsDir, kind, slug);
}

/** Files inside one draft folder. */
export function draftFiles(dir: string) {
  return {
    dir,
    meta: path.join(dir, "meta.json"),
    doc: path.join(dir, "doc.json"),
    mdx: path.join(dir, "draft.mdx"),
    anatomy: path.join(dir, "anatomy.json"),
    assets: path.join(dir, "assets"),
    figures: path.join(dir, "figures"),
  };
}

/** Parse "blog/my-post" (the form the skill and CLI use). */
export function parseDraftRef(ref: string): { kind: Kind; slug: string } {
  const match = /^([a-z]+)\/([^/]+)$/.exec(ref.trim().replace(/^\/+|\/+$/g, ""));
  if (!match) {
    throw new HttpError(400, `Expected <kind>/<slug>, like blog/my-post; got ${JSON.stringify(ref)}.`);
  }
  return { kind: assertKind(match[1]), slug: assertSlug(match[2]) };
}
