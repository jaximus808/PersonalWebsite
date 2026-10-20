// The editor's document -> the body of a site .mdx file.
//
// Output rules: blocks separated by one blank line, lists tight, no trailing
// spaces (code is the one place whitespace is kept exactly), and every custom
// block written as the component in components/content/ it stands for.

import type { JSONContent } from "@tiptap/core";

import type { Fit, Ratio } from "../shared/types.ts";
import { inlineLines } from "./inline.ts";
import { attr, isRawMdx, kids, plainText, stringAttr } from "./nodes.ts";
import { diagramSrc, toSitePath, type PathContext } from "./paths.ts";

export function docToBody(doc: JSONContent, ctx: PathContext): string {
  const body = blocks(kids(doc), ctx);
  return body ? `${body}\n` : "";
}

// ---------------------------------------------------------------------------
// Block sequences

type ListFamily = "bullet" | "ordered";

/** Blocks joined by blank lines. */
function blocks(nodes: JSONContent[], ctx: PathContext): string {
  return blockParts(nodes, ctx)
    .map((part) => part.text)
    .join("\n\n");
}

/** Each block's MDX, leaving out blocks that come out empty. */
function blockParts(nodes: JSONContent[], ctx: PathContext): { node: JSONContent; text: string }[] {
  const parts: { node: JSONContent; text: string }[] = [];
  // Two lists of the same kind in a row would merge into one. Alternating the
  // marker (- / *, 1. / 1)) keeps them apart without changing how they look.
  let lastList = null as { family: ListFamily; alt: boolean } | null;
  for (const node of nodes) {
    const family = listFamily(node);
    const alt = !!family && lastList?.family === family && !lastList.alt;
    const text = block(node, ctx, alt);
    if (!text) continue;
    parts.push({ node, text });
    lastList = family ? { family, alt } : null;
  }
  return parts;
}

function listFamily(node: JSONContent): ListFamily | null {
  if (node.type === "bulletList" || node.type === "taskList") return "bullet";
  if (node.type === "orderedList") return "ordered";
  return null;
}

function block(node: JSONContent, ctx: PathContext, altMarker = false): string {
  switch (node.type) {
    case "paragraph":
      return inlineLines(kids(node));
    case "heading":
      return heading(node);
    case "bulletList":
    case "taskList":
    case "orderedList":
      return list(node, ctx, altMarker);
    case "blockquote":
      return prefixLines(blocks(kids(node), ctx), "> ", ">");
    case "codeBlock":
      return codeBlock(node);
    case "table":
      return table(node);
    case "figure":
      return figure(node, ctx);
    case "gallery":
      return gallery(node, ctx);
    case "video":
      return video(node, ctx);
    case "callout":
      return callout(node, ctx);
    case "pullQuote":
      return pullQuote(node);
    case "divider":
    case "horizontalRule":
      return jsx("Divider", [["label", stringAttr(node, "label")]]);
    case "anatomy":
      return anatomy(node, ctx);
    case "image":
      // TipTap's stock image node, in case one slips in through a paste.
      return figure({ ...node, attrs: { src: node.attrs?.src, alt: node.attrs?.alt, caption: node.attrs?.title } }, ctx);
    default:
      throw new Error(`The writer can't export a "${String(node.type)}" block.`);
  }
}

function heading(node: JSONContent): string {
  const level = Math.min(4, Math.max(2, Number(attr(node, "level", 2)) || 2));
  // A heading is one line: breaks become spaces.
  const content = kids(node).map((child) => (child.type === "hardBreak" ? { type: "text", text: " " } : child));
  let text = inlineLines(content);
  if (!text) return ""; // an empty heading would show as a gap on the page; lint warns about it
  // A trailing run of # after a space is read as a closing sequence.
  if (text.endsWith("#") && !text.endsWith("\\#")) text = `${text.slice(0, -1)}\\#`;
  // (inlineLines also escapes a leading "-" or "1." as it would for a
  // paragraph; inside a heading that's unneeded but harmless.)
  return `${"#".repeat(level)} ${text}`;
}

// ---------------------------------------------------------------------------
// Lists

function list(node: JSONContent, ctx: PathContext, alt: boolean): string {
  const ordered = node.type === "orderedList";
  const task = node.type === "taskList";
  const delimiter = ordered ? (alt ? ")" : ".") : alt ? "*" : "-";
  // Markdown list numbers are at most nine digits.
  const start = ordered ? Math.min(999_999_000, Math.max(0, Math.floor(Number(attr(node, "start", 1)) || 0))) : 0;
  const items: string[] = [];
  for (const item of kids(node)) {
    const marker = ordered ? `${start + items.length}${delimiter}` : delimiter;
    const checkbox = task ? (attr(item, "checked", false) ? "[x] " : "[ ] ") : "";
    const { text, opensWithText } = listItem(item, ctx);
    // An empty item is a stray Enter, not content: an empty <li> (or a lone
    // "[ ]") would just be noise on the page.
    if (!text) continue;
    const indent = " ".repeat(marker.length + 1);
    const lines = text.split("\n");
    // A checkbox only works in front of text. An item whose text is empty but
    // holds a nested list loses its box (markdown can't write one there).
    const first = checkbox && opensWithText ? `${checkbox}${lines[0]}` : lines[0];
    items.push([`${marker} ${first}`, ...lines.slice(1).map((line) => (line ? indent + line : ""))].join("\n"));
  }
  return items.join("\n");
}

function listItem(item: JSONContent, ctx: PathContext): { text: string; opensWithText: boolean } {
  const parts = blockParts(kids(item), ctx);
  const text = parts
    .map((part, index) => {
      if (index === 0) return part.text;
      return (canFollowTightly(parts[index - 1]!.node, part.node, part.text) ? "\n" : "\n\n") + part.text;
    })
    .join("");
  return { text, opensWithText: parts[0]?.node.type === "paragraph" };
}

/**
 * Inside a list item, a nested list or code block can sit right under the
 * item's text (keeping the list tight). Everything else needs a blank line,
 * or it would run into the paragraph above.
 */
function canFollowTightly(prev: JSONContent, next: JSONContent, nextText: string): boolean {
  if (prev.type !== "paragraph") return false;
  // An ordered list can only interrupt a paragraph when it starts at 1.
  if (next.type === "orderedList") return /^1[.)]\s/.test(nextText);
  if (next.type === "bulletList" || next.type === "taskList") return true;
  return next.type === "codeBlock" && !isRawMdx(next);
}

function prefixLines(text: string, prefix: string, emptyPrefix: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => (line ? prefix + line : emptyPrefix))
    .join("\n");
}

// ---------------------------------------------------------------------------
// Code and tables

function codeBlock(node: JSONContent): string {
  const code = kids(node)
    .map((child) => (child.type === "text" ? child.text ?? "" : child.type === "hardBreak" ? "\n" : ""))
    .join("");
  if (isRawMdx(node)) return code.trim();
  // A loop, not Math.max(...runs): spreading a huge array overflows the stack.
  let longest = 0;
  for (const run of code.match(/`{3,}/g) ?? []) longest = Math.max(longest, run.length);
  const fence = "`".repeat(Math.max(3, longest + 1));
  // An info string can't hold backticks or spaces; keep the first word.
  const language = stringAttr(node, "language").replace(/[`\s].*$/s, "");
  // The code goes in exactly as typed: a trailing newline shows up as an
  // empty last line, the same as in the editor.
  return `${fence}${language}\n${code ? `${code}\n` : ""}${fence}`;
}

function table(node: JSONContent): string {
  const rows = kids(node).filter((row) => row.type === "tableRow");
  if (!rows.length) return "";
  const grid = rows.map((row) => {
    const cells: string[] = [];
    for (const cell of kids(row)) {
      cells.push(tableCell(cell));
      // Markdown has no colspan: keep the columns lined up with empty cells.
      const span = Math.max(1, Math.floor(Number(attr(cell, "colspan", 1)) || 1));
      for (let i = 1; i < span; i++) cells.push("");
    }
    return cells;
  });
  const width = grid.reduce((max, cells) => Math.max(max, cells.length), 1);
  const line = (cells: string[]) =>
    `|${Array.from({ length: width }, (_, i) => (cells[i] ? ` ${cells[i]} ` : " ")).join("|")}|`;
  const [header, ...body] = grid;
  return [line(header!), `| ${Array(width).fill("---").join(" | ")} |`, ...body.map(line)].join("\n");
}

/** A GFM cell is one line of inline content; paragraphs become <br />s. */
function tableCell(cell: JSONContent): string {
  const lines = kids(cell)
    .map((child) => {
      if (child.type === "paragraph" || child.type === "heading") return inlineLines(kids(child), { table: true });
      const flat = plainText(child).replace(/\s+/g, " ").trim();
      return flat ? inlineLines([{ type: "text", text: flat }], { table: true }) : "";
    })
    .filter(Boolean);
  return lines.join("<br />");
}

// ---------------------------------------------------------------------------
// The site's components

type Attr = [name: string, value: string | number | boolean | string[] | null | undefined];

/**
 * `name="value"` when the value can be written literally, `name={"…"}` (a
 * JSON string, which is valid JavaScript) when it holds a quote, a brace,
 * something that could read as a character reference (MDX decodes `&amp;` in
 * literal values), a line break or a control character. Empty strings, null
 * and false are left out.
 */
export function jsxAttr([name, value]: Attr): string {
  if (value === null || value === undefined || value === false || value === "") return "";
  if (value === true) return ` ${name}`;
  if (typeof value === "number") return ` ${name}={${value}}`;
  if (Array.isArray(value)) return ` ${name}={[${value.map((item) => JSON.stringify(item)).join(", ")}]}`;
  // eslint-disable-next-line no-control-regex
  if (/["{}\u0000-\u001f\u007f\u2028\u2029]|&[#A-Za-z]/.test(value)) return ` ${name}={${JSON.stringify(value)}}`;
  return ` ${name}="${value}"`;
}

function jsx(name: string, attrs: Attr[]): string {
  return `<${name}${attrs.map(jsxAttr).join("")} />`;
}

const RATIOS: Ratio[] = ["standard", "wide", "square", "tall"];
const FITS: Fit[] = ["contain", "cover"];

function figure(node: JSONContent, ctx: PathContext): string {
  const src = stringAttr(node, "src").trim();
  if (!src) return ""; // nothing to show yet (lint reports it)
  const ratio = stringAttr(node, "ratio");
  const fit = stringAttr(node, "fit");
  return jsx("Figure", [
    ["src", toSitePath(src, ctx)],
    ["caption", stringAttr(node, "caption").trim()],
    ["alt", stringAttr(node, "alt").trim()],
    ["ratio", RATIOS.includes(ratio as Ratio) && ratio !== "standard" ? ratio : null],
    ["fit", FITS.includes(fit as Fit) && fit !== "contain" ? fit : null],
  ]);
}

function gallery(node: JSONContent, ctx: PathContext): string {
  const images = (Array.isArray(node.attrs?.images) ? (node.attrs.images as unknown[]) : [])
    .filter((src): src is string => typeof src === "string" && !!src.trim())
    .map((src) => toSitePath(src, ctx));
  if (!images.length) return "";
  const columns = Number(node.attrs?.columns);
  return jsx("Gallery", [
    ["images", images],
    ["caption", stringAttr(node, "caption").trim()],
    ["columns", columns === 2 || columns === 3 ? columns : null],
  ]);
}

function video(node: JSONContent, ctx: PathContext): string {
  const youtube = stringAttr(node, "youtube").trim();
  const src = stringAttr(node, "src").trim();
  const poster = stringAttr(node, "poster").trim();
  if (!youtube && !src) return "";
  return jsx("Video", [
    ["youtube", youtube],
    ["src", src ? toSitePath(src, ctx) : ""],
    ["poster", poster ? toSitePath(poster, ctx) : ""],
    ["title", stringAttr(node, "title").trim()],
    ["caption", stringAttr(node, "caption").trim()],
    ["loop", node.attrs?.loop === true],
  ]);
}

function callout(node: JSONContent, ctx: PathContext): string {
  const title = jsxAttr(["title", stringAttr(node, "title").trim()]);
  const inner = blocks(kids(node), ctx);
  return inner ? `<Callout${title}>\n\n${inner}\n\n</Callout>` : `<Callout${title} />`;
}

/**
 * The text goes on its own line between the tags. Written on one line,
 * `<PullQuote>text</PullQuote>` would be parsed as inline JSX inside a
 * paragraph, putting the component's <figure> inside a <p>.
 */
function pullQuote(node: JSONContent): string {
  const inner = inlineLines(kids(node));
  if (!inner) return "";
  return `<PullQuote${jsxAttr(["cite", stringAttr(node, "cite").trim()])}>\n${inner}\n</PullQuote>`;
}

function anatomy(node: JSONContent, ctx: PathContext): string {
  const id = stringAttr(node, "id").trim();
  return jsx("Diagram", [
    ["src", diagramSrc(id, ctx)],
    ["title", stringAttr(node, "title").trim()],
    ["caption", stringAttr(node, "caption").trim()],
    ["size", stringAttr(node, "size") === "hero" ? "hero" : null],
  ]);
}

