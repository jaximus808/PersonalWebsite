// Loading a saved document safely. TipTap replaces content it can't read
// with an empty document, and the next autosave would then overwrite the
// draft on disk. Instead: check the JSON against the schema first, repair
// what can be repaired (keeping anything unrecognised as a visible JSON code
// block), and refuse to open the editor when nothing sensible can be built.

import type { JSONContent } from "@tiptap/core";
import { DOMParser as PMDOMParser, DOMSerializer, type Node as PMNode, type Schema } from "@tiptap/pm/model";

import { NODE } from "../shared/types";

export type PreparedDoc =
  | { ok: true; doc: JSONContent; repairs: string[] }
  | { ok: false; error: string };

const EMPTY: JSONContent = { type: NODE.doc, content: [{ type: NODE.paragraph }] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** All the text inside a JSON node. */
function textOf(json: JSONContent): string {
  if (typeof json.text === "string") return json.text;
  return (json.content ?? []).map(textOf).join("");
}

/** Replace unknown node types and drop unknown marks, noting each change. */
function repairTypes(json: JSONContent, schema: Schema, repairs: string[], inlineParent = false): JSONContent | null {
  if (!isObject(json) || typeof json.type !== "string") {
    repairs.push("an entry with no type was removed");
    return null;
  }
  if (json.type === "text") {
    const marks = (json.marks ?? []).filter((mark) => {
      if (isObject(mark) && typeof mark.type === "string" && schema.marks[mark.type]) return true;
      repairs.push(`an unknown text style (${isObject(mark) ? String(mark.type) : "?"}) was dropped`);
      return false;
    });
    if (typeof json.text !== "string" || json.text.length === 0) return null;
    return marks.length ? { ...json, marks } : { type: "text", text: json.text };
  }
  const type = schema.nodes[json.type];
  if (!type) {
    if (inlineParent) {
      // Inside a line of text: keep its words.
      repairs.push(`an unknown inline "${json.type}" was kept as text`);
      const words = textOf(json);
      return words ? { type: "text", text: words } : null;
    }
    repairs.push(`an unknown "${json.type}" block was kept as JSON`);
    return {
      type: NODE.codeBlock,
      attrs: { language: "json" },
      content: [{ type: "text", text: JSON.stringify(json, null, 2) }],
    };
  }
  const content = Array.isArray(json.content)
    ? json.content
        .map((child) => repairTypes(child, schema, repairs, type.inlineContent))
        .filter((child): child is JSONContent => child !== null)
    : undefined;
  return content ? { ...json, content } : { ...json };
}

/**
 * Turn saved JSON into something the editor can open without losing it.
 * `parseHTML` is only needed (and only used) for structural repairs, which go
 * through the browser's DOM; tests run without one.
 */
export function prepareInitialDoc(schema: Schema, input: unknown): PreparedDoc {
  if (input === null || input === undefined) return { ok: true, doc: EMPTY, repairs: [] };
  if (!isObject(input) || input.type !== NODE.doc) {
    return { ok: false, error: "The saved document isn't an editor document (its top level isn't a doc)." };
  }

  const repairs: string[] = [];
  const json = input as JSONContent;
  if (!Array.isArray(json.content) || json.content.length === 0) {
    return { ok: true, doc: EMPTY, repairs };
  }

  const typed = repairTypes(json, schema, repairs);
  if (!typed) return { ok: false, error: "The saved document couldn't be read." };
  if (!typed.content?.length) typed.content = EMPTY.content;

  let node: PMNode;
  try {
    node = schema.nodeFromJSON(typed);
  } catch (error) {
    return { ok: false, error: `The saved document couldn't be read: ${(error as Error).message}` };
  }

  try {
    node.check();
    // Always hand the editor the schema's own JSON: it has exactly the
    // shape TipTap will accept (no empty text nodes, every attr present).
    return { ok: true, doc: node.toJSON() as JSONContent, repairs };
  } catch {
    // Content in places the schema doesn't allow (a figure inside a
    // paragraph, an empty table cell). Re-parse through HTML, which fits
    // content into the schema the way a paste would.
    if (typeof document === "undefined") {
      return { ok: false, error: "The saved document has blocks in places they can't go." };
    }
    try {
      const container = document.createElement("div");
      container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(node.content));
      const fixed = PMDOMParser.fromSchema(schema).parse(container);
      fixed.check();
      repairs.push("some blocks were rearranged to fit where they're allowed");
      return { ok: true, doc: fixed.toJSON(), repairs };
    } catch (error) {
      return { ok: false, error: `The saved document couldn't be repaired: ${(error as Error).message}` };
    }
  }
}
