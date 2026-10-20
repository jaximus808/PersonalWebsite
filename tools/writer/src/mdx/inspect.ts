// Read-only views of a draft: its figure requests, the files it uses, its
// length, and what would go wrong if it were built now.

import type { JSONContent } from "@tiptap/core";

import type { DraftDoc, DraftMeta, FigureRequest } from "../shared/types.ts";
import { checkMdxBody } from "./check.ts";
import { docToBody } from "./export.ts";
import { isRawMdx, kids, plainText, stringAttr, walk } from "./nodes.ts";
import { isAssetPath, isFigureId, isRemote } from "./paths.ts";

export function figureRequestsOf(doc: DraftDoc): FigureRequest[] {
  const out: FigureRequest[] = [];
  walk(doc, (node) => {
    if (node.type !== "anatomy") return;
    out.push({
      id: stringAttr(node, "id").trim(),
      title: stringAttr(node, "title"),
      prompt: stringAttr(node, "prompt"),
      caption: stringAttr(node, "caption"),
      size: stringAttr(node, "size") === "hero" ? "hero" : "figure",
      built: false,
    });
    return false;
  });
  return out;
}

/** Every media path in the doc and meta, in document order (cover first). */
function mediaPaths(meta: DraftMeta, doc: DraftDoc): { src: string; where: string }[] {
  const out: { src: string; where: string }[] = [];
  const add = (src: unknown, where: string) => {
    if (typeof src === "string" && src.trim()) out.push({ src: src.trim(), where });
  };
  add(meta.cover, "The cover");
  walk(doc, (node) => {
    switch (node.type) {
      case "figure":
        add(node.attrs?.src, "An image");
        break;
      case "gallery":
        for (const src of Array.isArray(node.attrs?.images) ? node.attrs.images : []) add(src, "A gallery image");
        break;
      case "video":
        add(node.attrs?.src, "A video");
        add(node.attrs?.poster, "A video poster");
        break;
    }
  });
  return out;
}

export function referencedAssetsOf(meta: DraftMeta, doc: DraftDoc): string[] {
  return [...new Set(mediaPaths(meta, doc).map((m) => m.src).filter(isAssetPath))];
}

/** Prose words: everything readers read, except code. */
export function wordCountOf(doc: DraftDoc): number {
  let count = 0;
  const words = (value: string) => value.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  walk(doc, (node) => {
    if (node.type === "codeBlock") return false;
    if (node.type === "paragraph" || node.type === "heading") {
      count += words(plainText(node));
      return false;
    }
    if (node.type === "figure" || node.type === "gallery" || node.type === "anatomy") count += words(stringAttr(node, "caption"));
    if (node.type === "pullQuote") {
      count += words(plainText(node));
      return false;
    }
  });
  return count;
}

export type LintIssue = { level: "error" | "warn"; message: string };

export interface LintOptions {
  /**
   * Components the site registers (components/content/MdxContent.tsx).
   * Defaults to SITE_COMPONENTS; build-draft passes the live list from the
   * repo it builds into.
   */
  siteComponents?: readonly string[];
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function fileName(src: string): string {
  const clean = src.split(/[?#]/)[0]!;
  return clean.slice(clean.lastIndexOf("/") + 1) || src;
}

function quote(value: string, max = 40): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return `"${flat.length > max ? `${flat.slice(0, max - 1)}…` : flat}"`;
}

/** A date the site will show as that same day ("2026-02-30" is not one). */
function isRealDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // YAML reads a bare date as UTC midnight and rolls impossible days over
  // (2026-02-30 becomes March 2), so the day must survive the round trip.
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function lintDraft(meta: DraftMeta, doc: DraftDoc, options: LintOptions = {}): LintIssue[] {
  const issues: LintIssue[] = [];
  const error = (message: string) => issues.push({ level: "error", message });
  const warn = (message: string) => issues.push({ level: "warn", message });
  const project = meta.kind === "projects";

  // --- frontmatter ---------------------------------------------------------
  if (!meta.title?.trim()) error("Add a title.");
  if (!meta.date?.trim()) error("Add a date.");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date.trim())) {
    error(`The date ${quote(meta.date)} should look like 2026-03-17.`);
  } else if (!isRealDay(meta.date.trim())) {
    error(`The date ${quote(meta.date)} isn't a real day.`);
  }
  if (project && !meta.summary?.trim()) error("Projects need a summary (one or two sentences for the cards).");
  if (project) {
    (meta.links ?? []).forEach((link, index) => {
      const label = link?.label?.trim();
      const href = link?.href?.trim();
      if (!label && !href) return; // an empty row is ignored on export
      if (!label) error(`Link ${index + 1} needs a label.`);
      if (!href || !/^https?:\/\//i.test(href)) error(`Link ${label ? quote(label) : index + 1} needs an http(s) address.`);
    });
    const youtube = meta.youtube?.trim();
    if (youtube && !YOUTUBE_ID.test(youtube)) warn(`The YouTube field should be the video id (11 characters), not ${quote(youtube)}.`);
  }
  if (!meta.cover?.trim()) warn(project ? "No cover image: the project card will have no picture." : "No cover image: the post will have no thumbnail.");

  // --- media -----------------------------------------------------------------
  for (const { src, where } of mediaPaths(meta, doc)) {
    if (isRemote(src)) warn(`${where} (${fileName(src)}) is linked from another site; it'll be downloaded at build time.`);
  }

  // --- blocks ----------------------------------------------------------------
  const ids = new Map<string, number>();
  let previousLevel = 1;
  walk(doc, (node) => {
    switch (node.type) {
      case "heading": {
        const level = Number(node.attrs?.level) || 2;
        const title = plainText(node).trim();
        if (!title) warn("There's an empty heading.");
        else if (level > previousLevel + 1) warn(`The heading ${quote(title)} skips a level (H${previousLevel} to H${level}).`);
        previousLevel = level;
        return false;
      }
      case "figure": {
        const src = stringAttr(node, "src").trim();
        if (!src) error("An image block has no image yet.");
        else if (!stringAttr(node, "alt").trim() && !stringAttr(node, "caption").trim()) {
          warn(`The image ${fileName(src)} has no alt text or caption.`);
        }
        return false;
      }
      case "gallery": {
        const images = (Array.isArray(node.attrs?.images) ? node.attrs.images : []).filter(
          (src: unknown) => typeof src === "string" && src.trim(),
        );
        if (images.length < 2) error(`A gallery needs at least two images (it has ${images.length}); use an image block for one.`);
        else if (!stringAttr(node, "caption").trim()) warn("A gallery has no caption (gallery images have no alt text).");
        return false;
      }
      case "video": {
        const youtube = stringAttr(node, "youtube").trim();
        if (!youtube && !stringAttr(node, "src").trim()) error("A video block has no video yet.");
        else if (youtube && !YOUTUBE_ID.test(youtube)) warn(`The video's YouTube id ${quote(youtube)} doesn't look like an id (11 characters).`);
        return false;
      }
      case "anatomy": {
        const id = stringAttr(node, "id").trim();
        const label = stringAttr(node, "title").trim() || id;
        if (!id) error(`The figure ${quote(label || "untitled")} has no id.`);
        else if (!isFigureId(id)) error(`The figure id ${quote(id)} should be lowercase words joined by hyphens.`);
        else ids.set(id, (ids.get(id) ?? 0) + 1);
        if (!stringAttr(node, "prompt").trim() && !stringAttr(node, "title").trim()) {
          warn(`The figure ${id || "without an id"} doesn't say what it should show yet.`);
        }
        return false;
      }
      case "codeBlock":
        return false;
    }
    // Link marks with no address.
    if (node.type === "text" && node.marks?.some((m) => m.type === "link" && !String(m.attrs?.href ?? "").trim())) {
      warn(`The link on ${quote(node.text ?? "")} has no address.`);
    }
  });
  for (const [id, count] of ids) if (count > 1) error(`Two figures share the id "${id}"; each needs its own.`);

  // --- does it export, and will the page build? --------------------------------
  let body: string | null = null;
  try {
    body = docToBody(doc, { kind: meta.kind, slug: meta.slug });
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
  }
  if (body !== null) issues.push(...checkBodyCached(body, rawMdxTexts(doc), options.siteComponents));
  if (!kids(doc).some((node) => !isEmptyBlock(node))) warn("The draft has no writing yet.");
  return issues;
}

/** The text of every raw MDX block, in document order (nested ones too). */
function rawMdxTexts(doc: DraftDoc): string[] {
  const out: string[] = [];
  walk(doc, (node) => {
    if (node.type !== "codeBlock") return;
    if (isRawMdx(node)) {
      out.push(kids(node).map((child) => (child.type === "hardBreak" ? "\n" : child.text ?? "")).join(""));
    }
    return false;
  });
  return out;
}

// The Checks panel lints on every edit; parsing the whole body again when
// only the frontmatter changed would be wasted work on a long post.
let lastCheck: { key: string; issues: LintIssue[] } | null = null;

function checkBodyCached(body: string, raw: string[], components: readonly string[] | undefined): LintIssue[] {
  if (!raw.length) return [];
  const key = `${components?.join(",") ?? ""}\u0000${body}`;
  if (lastCheck?.key !== key) lastCheck = { key, issues: checkMdxBody(body, raw, components) };
  return lastCheck.issues;
}

function isEmptyBlock(node: JSONContent): boolean {
  if (isRawMdx(node)) return false;
  if (node.type === "paragraph" || node.type === "heading") return !plainText(node).trim();
  return false;
}
