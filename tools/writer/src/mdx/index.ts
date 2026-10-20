// Public surface of the MDX layer. Pure functions only (no DOM, no fs), so the
// browser, the dev-server API and scripts/build-draft.ts all share them.
//
//   export.ts / inline.ts   doc -> MDX body (escaping, delimiters, components)
//   frontmatter.ts          meta <-> YAML in the house style
//   import.ts               site .mdx -> draft
//   inspect.ts              figure requests, assets, word count, lint
//   check.ts                raw MDX: syntax, unknown components, free names;
//                           compileMdxBody, the site's compile, for build-draft
//   siteComponents.ts       the components the site registers
//   paths.ts                assets/<file> <-> /<kind>/<slug>/<file>

import type { DraftDoc, DraftMeta, FigureRequest, Kind } from "../shared/types.ts";
import { docToBody } from "./export.ts";
import { frontmatterToYaml } from "./frontmatter.ts";
import { importMdx } from "./import.ts";
import { figureRequestsOf, lintDraft, referencedAssetsOf, wordCountOf, type LintOptions } from "./inspect.ts";

export { RAW_MDX_LANGUAGE, isRawMdx, type DraftMetaWithExtra, type MetaExtra } from "./nodes.ts";
export { toSitePath, fromSitePath, diagramSrc, isFigureId } from "./paths.ts";
export { SITE_COMPONENTS, componentNamesFromMdxContent } from "./siteComponents.ts";
export { compileMdxBody } from "./check.ts";
export type { LintOptions } from "./inspect.ts";

/** A whole site file: YAML frontmatter + body. */
export function draftToMdx(meta: DraftMeta, doc: DraftDoc): string {
  return frontmatterToYaml(meta) + docToMdxBody(doc, { kind: meta.kind, slug: meta.slug });
}

/** Just the body (no frontmatter). Ends with one newline, or is "" when empty. */
export function docToMdxBody(doc: DraftDoc, ctx: { kind: Kind; slug: string }): string {
  return docToBody(doc, ctx);
}

/**
 * Parse a site .mdx file back into a draft. `assets` lists every site path
 * the document references under /<kind>/<slug>/ (they were rewritten to
 * "assets/<file>"), so the caller can copy those files into the draft.
 * Frontmatter keys the writer has no field for ride along in `meta.extra`.
 */
export function mdxToDraft(
  source: string,
  opts: { kind: Kind; slug: string; now: string },
): { meta: DraftMeta; doc: DraftDoc; assets: string[] } {
  return importMdx(source, opts);
}

/** Every anatomy node in the doc, in order (built is left false). */
export function figureRequests(doc: DraftDoc): FigureRequest[] {
  return figureRequestsOf(doc);
}

/** Every draft-relative asset ("assets/<file>") the doc and meta reference. */
export function referencedAssets(meta: DraftMeta, doc: DraftDoc): string[] {
  return referencedAssetsOf(meta, doc);
}

/** Words in the doc's prose, for the status bar and the drafts list. */
export function wordCount(doc: DraftDoc): number {
  return wordCountOf(doc);
}

/**
 * Problems that would stop a clean build, in plain words. Raw MDX blocks are
 * parsed and checked against the site's components and scope, so a block
 * that would break `npm run build` is an error here, not a surprise there.
 */
export function lint(
  meta: DraftMeta,
  doc: DraftDoc,
  options?: LintOptions,
): { level: "error" | "warn"; message: string }[] {
  return lintDraft(meta, doc, options);
}
