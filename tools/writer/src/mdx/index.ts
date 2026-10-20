// Public surface of the MDX layer. Pure functions only (no DOM, no fs), so the
// browser, the dev-server API and scripts/build-draft.ts all share them.
// STUB: the mdx agent replaces the bodies; the signatures are the contract.

import type { DraftDoc, DraftMeta, FigureRequest, Kind } from "../shared/types";

/** A whole site file: YAML frontmatter + body. */
export function draftToMdx(meta: DraftMeta, doc: DraftDoc): string {
  void meta;
  void doc;
  throw new Error("draftToMdx: not implemented");
}

/** Just the body (no frontmatter). */
export function docToMdxBody(doc: DraftDoc, ctx: { kind: Kind; slug: string }): string {
  void doc;
  void ctx;
  throw new Error("docToMdxBody: not implemented");
}

/**
 * Parse a site .mdx file back into a draft. `assets` lists every site path
 * the document references under /<kind>/<slug>/ (they were rewritten to
 * "assets/<file>"), so the caller can copy those files into the draft.
 */
export function mdxToDraft(
  source: string,
  opts: { kind: Kind; slug: string; now: string },
): { meta: DraftMeta; doc: DraftDoc; assets: string[] } {
  void source;
  void opts;
  throw new Error("mdxToDraft: not implemented");
}

/** Every anatomy node in the doc, in order (built is left false). */
export function figureRequests(doc: DraftDoc): FigureRequest[] {
  void doc;
  throw new Error("figureRequests: not implemented");
}

/** Every draft-relative asset ("assets/<file>") the doc and meta reference. */
export function referencedAssets(meta: DraftMeta, doc: DraftDoc): string[] {
  void meta;
  void doc;
  throw new Error("referencedAssets: not implemented");
}

/** Words in the doc's prose, for the status bar and the drafts list. */
export function wordCount(doc: DraftDoc): number {
  void doc;
  throw new Error("wordCount: not implemented");
}

/** Problems that would stop a clean build, in plain words. */
export function lint(meta: DraftMeta, doc: DraftDoc): { level: "error" | "warn"; message: string }[] {
  void meta;
  void doc;
  throw new Error("lint: not implemented");
}
