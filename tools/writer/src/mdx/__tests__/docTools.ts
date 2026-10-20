// Test helpers on the doc side: build TipTap JSON tersely, read a doc as the
// same "runs" render.ts reads a page as, and canonicalize a doc so two docs
// that export to the same page compare equal.

import type { JSONContent } from "@tiptap/core";

import { RAW_MDX_LANGUAGE } from "../nodes";
import { toRuns } from "./render";

type Mark = NonNullable<JSONContent["marks"]>[number];

export const B: Mark = { type: "bold" };
export const I: Mark = { type: "italic" };
export const S: Mark = { type: "strike" };
export const C: Mark = { type: "code" };
export const L = (href: string): Mark => ({ type: "link", attrs: { href } });

export const t = (text: string, ...marks: Mark[]): JSONContent => (marks.length ? { type: "text", text, marks } : { type: "text", text });
export const br: JSONContent = { type: "hardBreak" };
export const p = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
export const h = (level: 2 | 3 | 4, ...content: JSONContent[]): JSONContent => ({ type: "heading", attrs: { level }, content });
export const li = (...content: JSONContent[]): JSONContent => ({ type: "listItem", content });
export const ul = (...items: JSONContent[]): JSONContent => ({ type: "bulletList", content: items });
export const ol = (start: number, ...items: JSONContent[]): JSONContent => ({ type: "orderedList", attrs: { start }, content: items });
export const task = (checked: boolean, ...content: JSONContent[]): JSONContent => ({ type: "taskItem", attrs: { checked }, content });
export const tasks = (...items: JSONContent[]): JSONContent => ({ type: "taskList", content: items });
export const quote = (...content: JSONContent[]): JSONContent => ({ type: "blockquote", content });
export const code = (language: string | null, value: string): JSONContent => ({
  type: "codeBlock",
  attrs: { language },
  ...(value ? { content: [t(value)] } : {}),
});
export const raw = (value: string) => code(RAW_MDX_LANGUAGE, value);
const cell = (type: string, content: JSONContent[]) => ({ type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content });
export const th = (...content: JSONContent[]) => cell("tableHeader", content);
export const td = (...content: JSONContent[]) => cell("tableCell", content);
export const tr = (...cells: JSONContent[]): JSONContent => ({ type: "tableRow", content: cells });
export const table = (...rows: JSONContent[]): JSONContent => ({ type: "table", content: rows });
export const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

/** The doc's text and formatting, in the same shape as runsOfRender. */
export function runsOfDoc(root: JSONContent): string[] {
  const chars: { ch: string; marks: string }[] = [];
  const push = (value: string, marks: string) => {
    for (const ch of value) chars.push({ ch, marks: /\s/.test(ch) ? "" : marks });
  };
  const markKey = (marks: Mark[] | undefined) =>
    (marks ?? [])
      .filter((m) => ["bold", "italic", "strike", "code", "link"].includes(m.type))
      .map((m) => (m.type === "link" ? `link:${m.attrs?.href}` : m.type))
      .sort()
      .join(",");
  const walk = (node: JSONContent) => {
    switch (node.type) {
      case "text":
        push(node.text ?? "", markKey(node.marks));
        return;
      case "hardBreak":
        push(" ", "");
        return;
      case "codeBlock":
        push(" ¶ ", "");
        if (node.attrs?.language !== RAW_MDX_LANGUAGE) push((node.content ?? []).map((n) => n.text ?? "").join(""), "");
        push(" ¶ ", "");
        return;
      case "figure":
      case "gallery":
      case "video":
      case "divider":
      case "anatomy":
        push(" ¶ ", "");
        return;
      case "tableHeader":
      case "tableCell":
        // A cell is one line on the page: paragraphs are joined by <br />.
        push(" ¶ ", "");
        (node.content ?? []).forEach((child, i) => {
          if (i) push(" ", "");
          (child.content ?? []).forEach(walk);
        });
        push(" ¶ ", "");
        return;
    }
    push(" ¶ ", "");
    (node.content ?? []).forEach(walk);
    push(" ¶ ", "");
  };
  walk(root);
  return toRuns(chars);
}

/**
 * A doc reduced to what export can preserve: inline content as runs, default
 * attrs filled in, empty paragraphs and list items dropped (export drops them
 * too), table cell sizing ignored.
 */
export function canonical(node: JSONContent): unknown {
  const kids = (node.content ?? []).map(canonical).filter((child) => child !== null);
  switch (node.type) {
    case "paragraph":
    case "heading":
    case "pullQuote": {
      const runs = runsOfDoc({ type: "doc", content: node.content ?? [] }).map((r) => r.replace(/¶/g, "").trim()).filter(Boolean);
      // Export leaves out blocks with no visible text.
      if (!runs.length) return null;
      return { type: node.type, attrs: node.type === "heading" ? { level: node.attrs?.level } : node.attrs ?? {}, runs };
    }
    case "listItem":
    case "taskItem":
      return kids.length ? { type: node.type, attrs: node.type === "taskItem" ? { checked: !!node.attrs?.checked } : {}, content: kids } : null;
    case "orderedList":
      return kids.length ? { type: node.type, start: node.attrs?.start ?? 1, content: kids } : null;
    case "bulletList":
    case "taskList":
      return kids.length ? { type: node.type, content: kids } : null;
    case "codeBlock":
      return { type: node.type, language: node.attrs?.language ?? null, text: (node.content ?? []).map((n) => n.text ?? "").join("") };
    case "tableHeader":
    case "tableCell": {
      // A cell is one line on the page: its paragraphs read as one, split by breaks.
      const inline = (node.content ?? []).flatMap((child, i) => [...(i ? [{ type: "hardBreak" }] : []), ...(child.content ?? [])]);
      return { type: node.type, runs: runsOfDoc({ type: "doc", content: [{ type: "paragraph", content: inline }] }).map((r) => r.replace(/¶/g, "").trim()).filter(Boolean) };
    }
    case "figure":
      return { type: node.type, attrs: { caption: "", alt: "", ratio: "standard", fit: "contain", ...node.attrs } };
    case "gallery":
      return { type: node.type, attrs: { caption: "", columns: null, ...node.attrs } };
    case "video":
      return { type: node.type, attrs: { youtube: null, src: null, poster: null, loop: false, caption: "", title: "", ...node.attrs } };
    case "divider":
      return { type: node.type, attrs: { label: "", ...node.attrs } };
    case "anatomy":
      // The prompt is a note to Claude; it isn't part of the page.
      return { type: node.type, attrs: { ...node.attrs, prompt: "" } };
    default:
      return { type: node.type, ...(node.attrs ? { attrs: node.attrs } : {}), content: kids };
  }
}
