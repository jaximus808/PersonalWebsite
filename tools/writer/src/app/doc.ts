// Read-only walks over the editor's JSON: the outline, the images a cover
// can be picked from, and guarded calls into the MDX layer so a bug there
// shows up as a message in a panel instead of a blank app.

import type { JSONContent } from "@tiptap/core";

import {
  draftToMdx,
  docToMdxBody,
  figureRequests,
  lint,
  referencedAssets,
  wordCount,
} from "../mdx";
import {
  NODE,
  type DraftDoc,
  type DraftMeta,
  type FigureRequest,
  type GalleryAttrs,
  type Kind,
  type VideoAttrs,
} from "../shared/types";

export type Problem = { level: "error" | "warn"; message: string };

export type OutlineItem = {
  /** Position among all headings in the doc, in document order. */
  index: number;
  level: 2 | 3 | 4;
  text: string;
};

/** Depth-first, in document order: the order ProseMirror's descendants() uses. */
export function walk(node: JSONContent | undefined, visit: (node: JSONContent) => void): void {
  if (!node) return;
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

export function textOf(node: JSONContent): string {
  if (node.type === NODE.text) return node.text ?? "";
  if (node.type === NODE.hardBreak) return " ";
  return (node.content ?? []).map(textOf).join("");
}

export function outline(doc: DraftDoc): OutlineItem[] {
  const items: OutlineItem[] = [];
  walk(doc, (node) => {
    if (node.type !== NODE.heading) return;
    const raw = Number(node.attrs?.level ?? 2);
    const level = (raw <= 2 ? 2 : raw >= 4 ? 4 : 3) as 2 | 3 | 4;
    items.push({ index: items.length, level, text: textOf(node).trim() });
  });
  return items;
}

/** Every image path in the doc (figures, galleries, video posters), deduped. */
export function docImages(doc: DraftDoc): string[] {
  const seen = new Set<string>();
  walk(doc, (node) => {
    if (node.type === NODE.figure && typeof node.attrs?.src === "string") seen.add(node.attrs.src);
    if (node.type === NODE.gallery) {
      const images = (node.attrs as Partial<GalleryAttrs> | undefined)?.images ?? [];
      images.forEach((src) => typeof src === "string" && seen.add(src));
    }
    if (node.type === NODE.video) {
      const poster = (node.attrs as Partial<VideoAttrs> | undefined)?.poster;
      if (poster) seen.add(poster);
    }
  });
  return [...seen].filter((src) => src.trim().length > 0);
}

/** The ProseMirror-free fallback, used only if the MDX layer's count throws. */
function roughWordCount(doc: DraftDoc): number {
  let words = 0;
  walk(doc, (node) => {
    if (node.type === NODE.text && node.text) {
      words += node.text.split(/\s+/).filter(Boolean).length;
    }
  });
  return words;
}

export function safeWordCount(doc: DraftDoc): number {
  try {
    return wordCount(doc);
  } catch {
    return roughWordCount(doc);
  }
}

export function safeFigureRequests(doc: DraftDoc): FigureRequest[] {
  try {
    return figureRequests(doc);
  } catch {
    return [];
  }
}

export function safeLint(meta: DraftMeta, doc: DraftDoc): Problem[] {
  try {
    return lint(meta, doc);
  } catch (error) {
    return [{ level: "error", message: `Checks couldn't run: ${(error as Error).message}` }];
  }
}

export function safeReferencedAssets(meta: DraftMeta, doc: DraftDoc): string[] {
  try {
    return referencedAssets(meta, doc);
  } catch {
    return [];
  }
}

export type ExportResult = { ok: true; mdx: string } | { ok: false; error: string };

export function safeDraftToMdx(meta: DraftMeta, doc: DraftDoc): ExportResult {
  try {
    return { ok: true, mdx: draftToMdx(meta, doc) };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export function safeMdxBody(doc: DraftDoc, ctx: { kind: Kind; slug: string }): ExportResult {
  try {
    return { ok: true, mdx: docToMdxBody(doc, ctx) };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** One empty paragraph: what a brand-new draft's doc looks like. */
export function emptyDoc(): DraftDoc {
  return { type: NODE.doc, content: [{ type: NODE.paragraph }] };
}

/** A doc the editor can mount, whatever the server or storage handed back. */
export function normalizeDoc(doc: unknown): DraftDoc {
  if (doc && typeof doc === "object" && (doc as JSONContent).type === NODE.doc) {
    const content = (doc as JSONContent).content;
    if (Array.isArray(content) && content.length > 0) return doc as DraftDoc;
  }
  return emptyDoc();
}
