import { describe, expect, it } from "vitest";

import { prepareInitialDoc } from "../doc";
import { editorSchema } from "./schema";

const schema = editorSchema();

describe("prepareInitialDoc", () => {
  it("opens a valid document unchanged in substance", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        { type: "figure", attrs: { src: "assets/a.png", caption: "", alt: "", ratio: "standard", fit: "contain" } },
      ],
    };
    const prepared = prepareInitialDoc(schema, doc);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.repairs).toEqual([]);
    expect(prepared.doc.content?.map((node) => node.type)).toEqual(["paragraph", "figure"]);
    expect(prepared.doc.content?.[1].attrs?.src).toBe("assets/a.png");
  });

  it("gives an empty or missing document one empty paragraph", () => {
    for (const input of [undefined, null, { type: "doc" }, { type: "doc", content: [] }]) {
      const prepared = prepareInitialDoc(schema, input);
      expect(prepared.ok).toBe(true);
      if (prepared.ok) expect(prepared.doc).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    }
  });

  it("keeps an unknown block as a JSON code block instead of dropping it", () => {
    const unknown = { type: "mysteryEmbed", attrs: { x: 1 } };
    const prepared = prepareInitialDoc(schema, { type: "doc", content: [unknown] });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    const block = prepared.doc.content?.[0];
    expect(block?.type).toBe("codeBlock");
    expect(block?.attrs?.language).toBe("json");
    expect(JSON.parse(block?.content?.[0].text ?? "")).toEqual(unknown);
    expect(prepared.repairs.join()).toMatch(/mysteryEmbed/);
  });

  it("keeps the words of an unknown inline node", () => {
    const prepared = prepareInitialDoc(schema, {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "mention", content: [{ type: "text", text: "@jaxon" }] }] }],
    });
    expect(prepared.ok).toBe(true);
    if (prepared.ok) expect(prepared.doc.content?.[0].content?.[0]).toEqual({ type: "text", text: "@jaxon" });
  });

  it("drops unknown marks and empty text nodes", () => {
    const prepared = prepareInitialDoc(schema, {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "" },
            { type: "text", text: "under", marks: [{ type: "underline" }, { type: "bold" }] },
          ],
        },
      ],
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.doc.content?.[0].content).toEqual([{ type: "text", text: "under", marks: [{ type: "bold" }] }]);
    expect(prepared.repairs.join()).toMatch(/underline/);
  });

  it("refuses something that isn't a document at all", () => {
    expect(prepareInitialDoc(schema, { type: "paragraph" }).ok).toBe(false);
    expect(prepareInitialDoc(schema, "hello").ok).toBe(false);
  });

  it("refuses (rather than empties) a structurally broken document when it can't repair it here", () => {
    // A figure inside a paragraph breaks the schema; without a DOM to re-parse
    // through, the editor must not open (and so can't overwrite the file).
    const prepared = prepareInitialDoc(schema, {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "figure", attrs: { src: "a.png" } }] }],
    });
    expect(prepared.ok).toBe(false);
  });
});
