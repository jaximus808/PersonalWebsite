// The contract every part of the writer shares: what a draft is, what the
// editor's document looks like, and what the local API sends and receives.
// See SPEC.md for the full picture.

import type { JSONContent } from "@tiptap/core";

/** Matches the site's content folders: content/blog, content/projects. */
export type Kind = "blog" | "projects";

export type ProjectLink = { label: string; href: string };

/**
 * Frontmatter plus bookkeeping. Image fields hold a draft-relative path
 * ("assets/cover.jpg"), a site path ("/blog/x/cover.jpg"), or an http(s) URL.
 */
export interface DraftMeta {
  kind: Kind;
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  cover?: string;
  /** Projects only (required there). */
  summary?: string;
  /** Projects only: YouTube video id for the page hero. */
  youtube?: string;
  /** Projects only. */
  featured?: boolean;
  /** Projects only. */
  links?: ProjectLink[];
  /** Projects only. */
  hideCover?: boolean;
  /** ISO timestamps, writer bookkeeping only (never exported). */
  createdAt: string;
  updatedAt: string;
}

export type DraftDoc = JSONContent;

export interface DraftFile {
  meta: DraftMeta;
  doc: DraftDoc;
}

export interface DraftSummary {
  kind: Kind;
  slug: string;
  title: string;
  updatedAt: string;
  words: number;
  /** True when content/<kind>/<slug>.mdx already exists on the site. */
  published: boolean;
}

/** One anatomy figure request found in a draft (anatomy.json). */
export interface FigureRequest {
  id: string;
  title: string;
  prompt: string;
  caption: string;
  size: FigureSize;
  /** drafts/<kind>/<slug>/figures/<id>.html exists. */
  built: boolean;
}

export type FigureSize = "figure" | "hero";

// ---------------------------------------------------------------------------
// Editor document schema (TipTap JSON). Node and mark names are fixed; the
// editor, the serializer, the parser and the preview all rely on them.

export const NODE = {
  doc: "doc",
  paragraph: "paragraph",
  text: "text",
  heading: "heading", // attrs.level: 2 | 3 | 4 (the page supplies the h1)
  bulletList: "bulletList",
  orderedList: "orderedList", // attrs.start
  listItem: "listItem",
  taskList: "taskList",
  taskItem: "taskItem", // attrs.checked
  blockquote: "blockquote",
  codeBlock: "codeBlock", // attrs.language: string | null
  hardBreak: "hardBreak",
  table: "table",
  tableRow: "tableRow",
  tableHeader: "tableHeader",
  tableCell: "tableCell",
  figure: "figure",
  gallery: "gallery",
  video: "video",
  callout: "callout",
  pullQuote: "pullQuote",
  divider: "divider",
  anatomy: "anatomy",
} as const;

export const MARK = {
  bold: "bold",
  italic: "italic",
  strike: "strike",
  code: "code",
  link: "link", // attrs.href
} as const;

export type Ratio = "standard" | "wide" | "square" | "tall";
export type Fit = "contain" | "cover";

/** attrs of each custom node (atoms unless noted). */
export interface FigureAttrs {
  src: string;
  caption: string;
  alt: string;
  ratio: Ratio;
  fit: Fit;
}
export interface GalleryAttrs {
  images: string[];
  caption: string;
  columns: 2 | 3 | null;
}
export interface VideoAttrs {
  youtube: string | null;
  src: string | null;
  poster: string | null;
  loop: boolean;
}
/** Not an atom: content "block+". */
export interface CalloutAttrs {
  title: string;
}
/** Not an atom: content "inline*". */
export interface PullQuoteAttrs {
  cite: string;
}
export interface DividerAttrs {
  label: string;
}
export interface AnatomyAttrs {
  /** Stable, unique in the draft, slug-like: "fig-1", "teleop-loop". */
  id: string;
  title: string;
  /** What the figure should show, in the writer's words. */
  prompt: string;
  caption: string;
  size: FigureSize;
}

// ---------------------------------------------------------------------------
// Local API (served by server/api.ts on the Vite dev server).

export interface ApiError {
  error: string;
}

export interface CreateDraftBody {
  kind: Kind;
  slug: string;
  title: string;
}

export interface SaveDraftBody {
  meta: DraftMeta;
  doc: DraftDoc;
}

export interface SaveDraftResult {
  savedAt: string;
  /** The exported MDX, as written to draft.mdx. */
  mdx: string;
}

export interface UploadResult {
  /** Draft-relative path to store in the doc: "assets/<file>". */
  src: string;
  /** URL the browser can load it from: "/drafts/<kind>/<slug>/assets/<file>". */
  url: string;
}

export interface SiteEntry {
  kind: Kind;
  slug: string;
  title: string;
  date: string;
  /** A draft with this kind/slug exists. */
  drafted: boolean;
}

export const WRITER_PORT = 4310;
