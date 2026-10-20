// Inline content (text, marks, code, links, hard breaks) -> MDX.
//
// ProseMirror stores inline content flat: a run of text nodes, each with a set
// of marks. Markdown needs it nested, with delimiters that only work in some
// positions. So this goes in three steps:
//
//   1. build a tree: open and close marks greedily so a mark that spans several
//      runs is written once (**bold [link](x) still bold**);
//   2. move whitespace and hard breaks off the edges of every mark, because
//      `** bold**` is not bold;
//   3. print, choosing for each mark between its markdown delimiter and an
//      inline JSX element (<strong>, <em>, <del>) when CommonMark's flanking
//      rules would stop the delimiter from working in that spot
//      (e.g. **"quoted"**mid-word, or _italic_ inside a word).

import type { JSONContent } from "@tiptap/core";

type MarkSpec = { type: "bold" | "italic" | "strike" } | { type: "link"; href: string };

type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "break" }
  | { kind: "mark"; mark: MarkSpec; children: InlineNode[] };

/** How a character behaves next to an emphasis delimiter (CommonMark 6.2). */
type CharClass = "space" | "punct" | "other";

export interface InlineOptions {
  /** Inside a GFM table cell: hard breaks become <br />, pipes are escaped. */
  table?: boolean;
  /** Inside a link's text (set while rendering one). */
  link?: boolean;
}

/** Marks outer-first: a link wraps its formatting, bold wraps italic. */
const MARK_ORDER = ["link", "bold", "italic", "strike"] as const;

const DELIMITERS = {
  bold: { md: "**", jsx: "strong" },
  italic: { md: "_", jsx: "em" },
  strike: { md: "~~", jsx: "del" },
} as const;

export function inlineToMdx(nodes: JSONContent[], options: InlineOptions = {}): string {
  const tree = hoistEdges(buildTree(nodes));
  const out = render(tree, "space", "space", options);
  return options.table ? out.replace(/\|/g, "\\|") : out;
}

// ---------------------------------------------------------------------------
// 1. Tree

function marksOf(node: JSONContent): { marks: MarkSpec[]; code: boolean } {
  const marks: MarkSpec[] = [];
  let code = false;
  for (const mark of node.marks ?? []) {
    switch (mark?.type) {
      case "bold":
      case "italic":
      case "strike":
        if (!marks.some((m) => m.type === mark.type)) marks.push({ type: mark.type });
        break;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href.trim() : "";
        if (href && !marks.some((m) => m.type === "link")) marks.push({ type: "link", href });
        break;
      }
      case "code":
        code = true;
        break;
      // Anything else (underline, highlight, …) has no place on the site: keep
      // the text, drop the styling.
    }
  }
  marks.sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type));
  return { marks, code };
}

function sameMark(a: MarkSpec, b: MarkSpec): boolean {
  if (a.type !== b.type) return false;
  return a.type !== "link" || a.href === (b as { href: string }).href;
}

function buildTree(nodes: JSONContent[]): InlineNode[] {
  const root: InlineNode[] = [];
  const open: Extract<InlineNode, { kind: "mark" }>[] = [];
  const container = () => (open.length ? open[open.length - 1]!.children : root);

  for (const node of nodes) {
    let leaf: InlineNode;
    let wanted: MarkSpec[];
    if (node.type === "text") {
      const value = typeof node.text === "string" ? node.text : "";
      if (!value) continue;
      const { marks, code } = marksOf(node);
      leaf = code ? { kind: "code", text: value } : { kind: "text", text: value };
      wanted = marks;
    } else if (node.type === "hardBreak") {
      // A break never splits a mark: it sits inside whatever is open, and
      // hoistEdges moves it out if it ends up on an edge.
      leaf = { kind: "break" };
      wanted = open.map((m) => m.mark);
    } else {
      // Inline atoms the site can't show (mentions, emoji nodes, …): keep any
      // text they carry so nothing silently disappears.
      const fallback = typeof node.text === "string" ? node.text : "";
      if (!fallback) continue;
      leaf = { kind: "text", text: fallback };
      wanted = marksOf(node).marks;
    }

    // Keep the longest prefix of open marks that are still wanted; close the
    // rest; open what's missing (in canonical order) inside what's kept.
    let keep = 0;
    while (keep < open.length && wanted.some((m) => sameMark(m, open[keep]!.mark))) keep++;
    open.length = keep;
    for (const mark of wanted) {
      if (open.some((o) => sameMark(o.mark, mark))) continue;
      const node: Extract<InlineNode, { kind: "mark" }> = { kind: "mark", mark, children: [] };
      container().push(node);
      open.push(node);
    }
    container().push(leaf);
  }
  return root;
}

// ---------------------------------------------------------------------------
// 2. Whitespace off the edges

function isEdgeFiller(node: InlineNode): boolean {
  return node.kind === "break" || (node.kind === "text" && !/\S/.test(node.text));
}

function hoistEdges(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const node of nodes) {
    if (node.kind !== "mark") {
      out.push(node);
      continue;
    }
    const children = hoistEdges(node.children);
    const lead: InlineNode[] = [];
    const trail: InlineNode[] = [];
    while (children.length && isEdgeFiller(children[0]!)) lead.push(children.shift()!);
    while (children.length && isEdgeFiller(children[children.length - 1]!)) trail.unshift(children.pop()!);
    const first = children[0];
    if (first?.kind === "text") {
      const space = /^\s+/.exec(first.text)?.[0];
      if (space) {
        lead.push({ kind: "text", text: space });
        children[0] = { kind: "text", text: first.text.slice(space.length) };
      }
    }
    const last = children[children.length - 1];
    if (last?.kind === "text") {
      const space = /\s+$/.exec(last.text)?.[0];
      if (space) {
        trail.unshift({ kind: "text", text: space });
        children[children.length - 1] = { kind: "text", text: last.text.slice(0, -space.length) };
      }
    }
    out.push(...lead);
    if (children.length) out.push({ ...node, children });
    out.push(...trail);
  }
  // Re-join neighbouring text so escaping sees whole words (snake_case stays
  // unescaped only when both sides of the underscore are in the same string),
  // and neighbouring code, since `a``b` would read as one span "a``b".
  const merged: InlineNode[] = [];
  for (const node of out) {
    const prev = merged[merged.length - 1];
    if (node.kind === "text" && prev?.kind === "text") merged[merged.length - 1] = { kind: "text", text: prev.text + node.text };
    else if (node.kind === "code" && prev?.kind === "code") merged[merged.length - 1] = { kind: "code", text: prev.text + node.text };
    else merged.push(node);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// 3. Printing

function classify(char: string | undefined): CharClass {
  if (char === undefined || /\s/u.test(char)) return "space";
  if (/[\p{P}\p{S}]/u.test(char)) return "punct";
  return "other";
}

// micromark's attention rules (the same ones markdown parsers use for * and _;
// GFM strikethrough uses the `*` variant).
function delimiterWorks(marker: string, before: CharClass, after: CharClass, as: "open" | "close"): boolean {
  const open = after === "other" || (after === "punct" && before !== "other");
  const close = before === "other" || (before === "punct" && after !== "other");
  if (marker !== "_") return as === "open" ? open : close;
  return as === "open" ? open && (before !== "other" || !close) : close && (after !== "other" || !open);
}

function render(nodes: InlineNode[], before: CharClass, after: CharClass, options: InlineOptions): string {
  // Marks are printed last: whatever they choose, their outer characters are
  // punctuation (`*`, `_`, `~`, `[`, `<`, `)`, `>`), so neighbours can be
  // classified before the choice is made.
  const parts = nodes.map((node) => {
    switch (node.kind) {
      case "text":
        return escapeText(node.text);
      case "code":
        return codeSpanIn(node.text, options);
      case "break":
        return options.table ? "<br />" : "\\\n";
      case "mark":
        return null;
    }
  });
  const edgeClass = (index: number, side: "start" | "end"): CharClass => {
    const part = parts[index];
    if (part === null || part === undefined) return "punct";
    return classify(side === "start" ? part[0] : part[part.length - 1]);
  };
  nodes.forEach((node, index) => {
    if (node.kind !== "mark") return;
    // "!" right before a link would make it an image: ![text](src).
    const previous = parts[index - 1];
    if (node.mark.type === "link" && previous?.endsWith("!")) parts[index - 1] = `${previous.slice(0, -1)}\\!`;
    const prev = index === 0 ? before : edgeClass(index - 1, "end");
    const next = index === nodes.length - 1 ? after : edgeClass(index + 1, "start");
    parts[index] = renderMark(node, prev, next, options);
  });
  return parts.join("");
}

function renderMark(
  node: Extract<InlineNode, { kind: "mark" }>,
  prev: CharClass,
  next: CharClass,
  options: InlineOptions,
): string {
  const inner = render(node.children, "punct", "punct", node.mark.type === "link" ? { ...options, link: true } : options);
  if (node.mark.type === "link") return `[${inner}](${linkDestination(node.mark.href)})`;

  const { md, jsx } = DELIMITERS[node.mark.type];
  const first = classify(inner[0]);
  const last = classify(inner[inner.length - 1]);
  const fits = delimiterWorks(md, prev, first, "open") && delimiterWorks(md, last, next, "close");
  return fits ? `${md}${inner}${md}` : `<${jsx}>${inner}</${jsx}>`;
}

/** `[text](dest)`: bare when safe, else the <...> form, which allows spaces and parens. */
export function linkDestination(href: string): string {
  const value = href.replace(/[\r\n]+/g, "");
  if (value && !/[\s()<>\\]/.test(value)) return value;
  return `<${value.replace(/[\\<>]/g, (c) => `\\${c}`)}>`;
}

/**
 * Code in two awkward spots is written as a <code> element with escaped text
 * instead of a backtick span (it renders the same <code>):
 * - in a table cell, a backslash right before a pipe: GFM splits cells before
 *   it reads code spans, and "\\|" there is an escaped backslash and then a
 *   real cell border;
 * - in link text, a "]": "[`a]:b`](x)" at the start of a line reads as a
 *   link reference definition, since code spans don't protect brackets there.
 */
function codeSpanIn(value: string, options: InlineOptions): string {
  const awkward = (options.table && /\\\|/.test(value)) || (options.link && value.includes("]"));
  return awkward ? `<code>${escapeText(value)}</code>` : codeSpan(value);
}

/** A code span whose fence is longer than any backtick run inside it. */
export function codeSpan(raw: string): string {
  const value = raw.replace(/\r?\n/g, " ");
  const runs = new Set((value.match(/`+/g) ?? []).map((run) => run.length));
  let size = 1;
  while (runs.has(size)) size++;
  const fence = "`".repeat(size);
  // One space of padding is stripped from each side when both sides have it,
  // so pad when the content starts/ends with a backtick or with a space.
  const pad = /^[`\s]|[`\s]$/.test(value) && /[^ ]/.test(value) ? " " : "";
  return `${fence}${pad}${value}${pad}${fence}`;
}

const ENTITY = /^&(?:#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{1,31});/;
const WORD = /[\p{L}\p{N}]/u;

/**
 * Escape text so it reads back as the same text: MDX's `{ } <`, markdown's
 * emphasis, code, link and escape characters, and `&` when it would start a
 * character reference. Line-start syntax (# > - 1.) is handled per line by
 * escapeLineStart. `_` inside a word (snake_case) can't emphasize anything, so
 * it's left alone for readability.
 */
export function escapeText(text: string): string {
  // Runs of spaces collapse in the browser anyway; writing one keeps the
  // source tidy (they appear when whitespace is moved off a mark's edge).
  const value = text.replace(/[ \t]*[\r\n][ \t]*/g, " ").replace(/[ \t]{2,}/g, " ");
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    switch (ch) {
      case "\\":
      case "`":
      case "*":
      case "~":
      case "[":
      case "]":
      case "{":
      case "}":
      case "<":
        out += `\\${ch}`;
        break;
      case "_":
        out += WORD.test(value[i - 1] ?? "") && WORD.test(value[i + 1] ?? "") ? "_" : "\\_";
        break;
      case "&":
        out += ENTITY.test(value.slice(i)) ? "\\&" : "&";
        break;
      default:
        out += ch;
    }
  }
  return out;
}

/**
 * Escape what would turn a line into a heading, quote, list, setext underline,
 * table delimiter row or ESM statement. The line must already be trimmed.
 */
export function escapeLineStart(line: string): string {
  if (/^[#>\-+=:|]/.test(line)) return `\\${line}`;
  const ordered = /^(\d{1,9})([.)])/.exec(line);
  if (ordered) return `${ordered[1]}\\${line.slice(ordered[1]!.length)}`;
  // `import x` / `export x` at the start of a line is JavaScript in MDX. A
  // character reference for the first letter keeps it text.
  if (/^(?:import|export)(?:\s|$)/.test(line)) return `&#${line.charCodeAt(0)};${line.slice(1)}`;
  return line;
}

/**
 * A paragraph-like run of inline content as one or more lines: hard breaks
 * split lines, each line is trimmed and made safe at its start. Returns "" for
 * content with no visible text.
 */
export function inlineLines(nodes: JSONContent[], options: InlineOptions = {}): string {
  const raw = inlineToMdx(nodes, options);
  if (options.table) return raw.trim();
  // Only hard breaks put newlines in `raw`, and each one leaves a `\` at the
  // end of its line.
  const lines = raw.split("\n").map((line) => escapeLineStart(line.trim()).replace(/[ \t]+\\$/, "\\"));
  // A break at the very start or end of a paragraph can't be written in
  // markdown (and shows nothing on the page): drop it.
  while (lines.length && (lines[0] === "\\" || lines[0] === "")) lines.shift();
  while (lines.length && lines[lines.length - 1] === "") {
    lines.pop();
    // The line before ended with the break's backslash.
    if (lines.length) lines[lines.length - 1] = lines[lines.length - 1]!.slice(0, -1).trimEnd();
  }
  return lines.join("\n");
}
