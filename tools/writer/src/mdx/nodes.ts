// Small helpers for reading the editor's TipTap JSON without trusting it too
// much: the doc comes from disk or from the editor mid-edit, so every field is
// treated as optional.

import type { JSONContent } from "@tiptap/core";

import type { DraftMeta } from "../shared/types.ts";

/**
 * The language a code block carries when it holds raw MDX: an embed like
 * `<TandemBoardDemo />`, a component with props the editor has no field for,
 * or anything Jaxon wants on the page exactly as typed (the editor's "Raw MDX"
 * block). Export writes its text back verbatim instead of fencing it.
 *
 * The value is one nobody types as a fence: TipTap's ``` input rule only
 * takes letters, so typing ```mdx makes an "mdx" code *sample* (shown as
 * code on the page), never a passthrough. Importing a site file keeps an
 * ```mdx fence a sample the same way.
 */
export const RAW_MDX_LANGUAGE = "raw-mdx";

/** Frontmatter keys the writer has no field for (legacyId, legacyName, …). */
export type MetaExtra = Record<string, unknown>;

/**
 * DraftMeta as the MDX layer reads and writes it: `extra` carries frontmatter
 * keys the writer doesn't model, so importing a site file and building it
 * again keeps them (the redirects in next.config.js depend on legacyName).
 */
export type DraftMetaWithExtra = DraftMeta & { extra?: MetaExtra };

export function kids(node: JSONContent | null | undefined): JSONContent[] {
  return Array.isArray(node?.content) ? node.content.filter((child): child is JSONContent => !!child && typeof child === "object") : [];
}

export function attr<T>(node: JSONContent, name: string, fallback: T): T {
  const value = node.attrs?.[name];
  return value === undefined || value === null ? fallback : (value as T);
}

export function stringAttr(node: JSONContent, name: string): string {
  const value = node.attrs?.[name];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function isRawMdx(node: JSONContent): boolean {
  return node.type === "codeBlock" && node.attrs?.language === RAW_MDX_LANGUAGE;
}

/** All text under a node, blocks separated by a space (for counting, linting). */
export function plainText(node: JSONContent): string {
  if (node.type === "text") return typeof node.text === "string" ? node.text : "";
  if (node.type === "hardBreak") return " ";
  return kids(node)
    .map(plainText)
    .join(node.type === "paragraph" || node.type === "heading" ? "" : " ");
}

/** Depth-first walk; `visit` returning false skips that node's children. */
export function walk(
  node: JSONContent | null | undefined,
  visit: (node: JSONContent, parent: JSONContent | null) => boolean | void,
  parent: JSONContent | null = null,
): void {
  if (!node || typeof node !== "object") return;
  if (visit(node, parent) === false) return;
  for (const child of kids(node)) walk(child, visit, node);
}

export const text = (value: string, marks?: JSONContent["marks"]): JSONContent =>
  marks && marks.length ? { type: "text", text: value, marks } : { type: "text", text: value };

export const paragraph = (content: JSONContent[] = []): JSONContent =>
  content.length ? { type: "paragraph", content } : { type: "paragraph" };
