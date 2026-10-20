// Pasting markdown: decide whether plain text is markdown worth converting,
// and turn it into editor nodes through the MDX layer's parser (the same one
// that imports site files), so a pasted README lands as real headings, lists,
// code blocks and figures instead of a wall of asterisks.

import { Fragment, Slice, type Schema } from "@tiptap/pm/model";

import { mdxToDraft } from "../mdx";
import { NODE, type Kind } from "../shared/types";
import { RAW_MDX } from "./nodes/CodeBlock";

const BLOCK_SIGNALS: [RegExp, number][] = [
  [/^#{1,6}\s+\S/, 2], // heading
  [/^\s{0,3}(?:```|~~~)/, 2], // code fence
  [/^\s*[-*+]\s+\[[ xX]\]\s/, 2], // task item
  [/^\s*\|.*\|\s*$/, 1], // table row
  [/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/, 2], // table separator
  [/^\s*[-*+]\s+\S/, 1], // bullet
  [/^\s*\d{1,3}[.)]\s+\S/, 1], // numbered
  [/^\s*>\s?/, 1], // quote
  [/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, 1], // rule
  [/^\s*<[A-Z][\w.]*[\s/>]/, 2], // MDX component
  [/^\s*!\[[^\]\n]*\]\([^)\s]+\)\s*$/, 2], // image on its own line
];

const INLINE_SIGNALS: RegExp[] = [
  /\*\*[^*\n]+\*\*/, // bold
  /\[[^\]\n]+\]\([^)\s]+\)/, // link
  /`[^`\n]+`/, // inline code
  /(?:^|\s)_[^_\n]+_(?:\s|$)/, // italic
  /~~[^~\n]+~~/, // strike
];

// Lines that read as source code rather than prose. A Python or shell paste
// is full of "# comment" lines that would otherwise look like headings.
const CODE_LINE =
  /(?:[;{}]\s*$)|(?:^\s*(?:def|class|import|from|const|let|var|function|fn|pub|impl|struct|enum|return|if|elif|for|while|#include|#!|package|use|export)\b[^\n]*[:({=;])|(?:^\s{4,}(?![-*+]\s|\d{1,3}[.)]\s)\S)|(?:^\s*[\w.[\]]+\s*[-+*/%]?=(?!=)\s*\S)|(?:^\s*[\w.]+\([^)]*\)\s*$)/;

/**
 * True when a multi-line plain-text paste carries enough markdown structure
 * to be worth converting. Single lines are left to the default paste (inline
 * marks already convert through TipTap's paste rules), and anything that looks
 * like source code is left alone.
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!/\r?\n/.test(text.trim())) return false;
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (nonEmpty.length < 2) return false;

  // Count code-looking lines outside fences; fenced code is markdown.
  let inFence = false;
  let codeLines = 0;
  let proseLines = 0;
  let score = 0;
  for (const line of lines) {
    if (/^\s{0,3}(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      score += 1;
      continue;
    }
    if (inFence || !line.trim()) continue;
    proseLines += 1;
    if (CODE_LINE.test(line)) codeLines += 1;
    for (const [pattern, weight] of BLOCK_SIGNALS) {
      if (pattern.test(line)) {
        score += weight;
        break;
      }
    }
  }
  if (proseLines > 0 && codeLines / proseLines >= 0.3) return false;

  for (const pattern of INLINE_SIGNALS) {
    if (pattern.test(text)) score += 1;
  }
  return score >= 2;
}

/**
 * Make loose markdown valid MDX: outside code, `{` and `}` start expressions
 * and `<` starts JSX, so prose like "a < b" or "use {name}" fails to parse.
 * Escapes those, leaving fenced code, inline code and capitalised components
 * (<Figure …>) untouched. Used as a second attempt when the raw text fails.
 */
export function escapeLooseMdx(text: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1] ?? null;
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) {
        fence = null;
      }
      out.push(line);
      continue;
    }
    if (marker) {
      fence = marker;
      out.push(line);
      continue;
    }
    out.push(escapeOutsideInlineCode(line));
  }
  return out.join("\n");
}

function escapeOutsideInlineCode(line: string): string {
  const parts: string[] = [];
  const code = /(`+)[^`]*?\1/g;
  let last = 0;
  for (let match = code.exec(line); match; match = code.exec(line)) {
    parts.push(escapeText(line.slice(last, match.index)), match[0]);
    last = match.index + match[0].length;
  }
  parts.push(escapeText(line.slice(last)));
  return parts.join("");
}

function escapeText(text: string): string {
  return text
    .replace(/(?<!\\)[{}]/g, (brace) => `\\${brace}`)
    .replace(/<(?!\/?[A-Z][\w.]*[\s/>])/g, "&lt;");
}

function rawMdxBlocks(fragment: Fragment): number {
  let count = 0;
  fragment.descendants((node) => {
    if (node.type.name === NODE.codeBlock && node.attrs.language === RAW_MDX) count += 1;
    return !node.isTextblock;
  });
  return count;
}

function parseToFragment(source: string, ctx: { kind: Kind; slug: string }, schema: Schema): Fragment | null {
  try {
    const { doc } = mdxToDraft(source, { kind: ctx.kind, slug: ctx.slug, now: new Date().toISOString() });
    const content = doc.content ?? [];
    if (content.length === 0) return null;
    const fragment = Fragment.fromArray(content.map((json) => schema.nodeFromJSON(json)));
    fragment.forEach((node) => node.check());
    return fragment;
  } catch {
    return null;
  }
}

/**
 * Convert markdown to a slice ready for `tr.replaceSelection`, or null when it
 * can't be parsed (the caller then falls back to a plain paste). The text is
 * tried as written and with loose characters escaped; the escaped reading
 * wins when the raw one fails or turns prose like "use {x}" into raw MDX.
 */
export function markdownToSlice(text: string, ctx: { kind: Kind; slug: string }, schema: Schema): Slice | null {
  let best = parseToFragment(text, ctx, schema);
  const escaped = escapeLooseMdx(text);
  if (escaped !== text && (!best || rawMdxBlocks(best) > 0)) {
    const second = parseToFragment(escaped, ctx, schema);
    if (second && (!best || rawMdxBlocks(second) < rawMdxBlocks(best))) best = second;
  }
  return best ? Slice.maxOpen(best) : null;
}
