import { describe, expect, it } from "vitest";

import { MARK, NODE } from "../../shared/types";
import { editorSchema } from "./schema";

describe("editor schema matches the contract", () => {
  const schema = editorSchema();

  it("has every contract node and mark", () => {
    for (const name of Object.values(NODE)) expect(schema.nodes[name], name).toBeDefined();
    for (const name of Object.values(MARK)) expect(schema.marks[name], name).toBeDefined();
  });

  it("has nothing the MDX layer can't write", () => {
    expect(schema.nodes.horizontalRule).toBeUndefined();
    expect(schema.marks.underline).toBeUndefined();
  });

  it("gives custom nodes the contract's attrs and defaults", () => {
    const attrs = (name: string) => schema.nodes[name].create().attrs;
    expect(attrs(NODE.figure)).toEqual({ src: "", caption: "", alt: "", ratio: "standard", fit: "contain" });
    expect(attrs(NODE.gallery)).toEqual({ images: [], caption: "", columns: null });
    expect(attrs(NODE.video)).toEqual({ youtube: null, src: null, poster: null, loop: false, caption: "", title: "" });
    expect(attrs(NODE.divider)).toEqual({ label: "" });
    expect(attrs(NODE.anatomy)).toEqual({ id: "", title: "", prompt: "", caption: "", size: "figure" });
    expect(schema.nodes[NODE.callout].createAndFill()!.attrs).toEqual({ title: "" });
    expect(schema.nodes[NODE.pullQuote].create().attrs).toEqual({ cite: "" });
  });

  it("makes media blocks atoms and callouts/pull quotes editable", () => {
    for (const name of [NODE.figure, NODE.gallery, NODE.video, NODE.divider, NODE.anatomy]) {
      expect(schema.nodes[name].isAtom, name).toBe(true);
      expect(schema.nodes[name].isBlock, name).toBe(true);
    }
    expect(schema.nodes[NODE.callout].spec.content).toBe("block+");
    expect(schema.nodes[NODE.pullQuote].spec.content).toBe("inline*");
  });

  it("allows headings 2–4 only", () => {
    const heading = schema.nodes[NODE.heading];
    expect(heading.create({ level: 2 }).attrs.level).toBe(2);
    // StarterKit keeps the configured levels on the extension; the parse
    // rules only produce h2–h4.
    const tags = (heading.spec.parseDOM ?? []).map((rule) => ("tag" in rule ? rule.tag : ""));
    expect(tags).toEqual(["h2", "h3", "h4"]);
  });

  it("keeps table cells to one paragraph (GFM tables are single-line)", () => {
    expect(schema.nodes[NODE.tableCell].spec.content).toBe("paragraph");
    expect(schema.nodes[NODE.tableHeader].spec.content).toBe("paragraph");
  });

  it("round-trips a document with every block through JSON", () => {
    const json = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            { type: "text", text: "a link", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
          ],
        },
        { type: "figure", attrs: { src: "assets/a.png", caption: "Cap", alt: "", ratio: "wide", fit: "cover" } },
        { type: "gallery", attrs: { images: ["assets/a.png", "assets/b.png"], caption: "", columns: 3 } },
        { type: "video", attrs: { youtube: "ztsJ87zMOS0", src: null, poster: null, loop: false } },
        { type: "callout", attrs: { title: "Note" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] },
        { type: "pullQuote", attrs: { cite: "Me" }, content: [{ type: "text", text: "Lifted" }] },
        { type: "divider", attrs: { label: "Part two" } },
        { type: "anatomy", attrs: { id: "fig-1", title: "Loop", prompt: "Show it", caption: "", size: "hero" } },
        { type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "const x = 1;" }] },
        {
          type: "taskList",
          content: [{ type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Done" }] }] }],
        },
      ],
    };
    const doc = schema.nodeFromJSON(json);
    doc.check();
    const back = doc.toJSON();
    expect(back.content.map((node: { type: string }) => node.type)).toEqual(json.content.map((node) => node.type));
    expect(back.content[2].attrs).toEqual(json.content[2].attrs);
    expect(back.content[8].attrs).toEqual(json.content[8].attrs);
  });
});
