import { describe, expect, it } from "vitest";
import type { Node as PMNode } from "@tiptap/pm/model";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";

import { insertBlockNode, insertTable } from "../blocks";
import { placementFor } from "../plugins/uploads";
import { editorSchema } from "./schema";

const schema = editorSchema();
const para = (text = "") => schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);
const figure = () => schema.nodes.figure.create({ src: "assets/a.png" });

function state(nodes: PMNode[], cursor: number) {
  const doc = schema.nodes.doc.create(null, nodes);
  return EditorState.create({ schema, doc, selection: TextSelection.create(doc, cursor) });
}

const names = (doc: PMNode) => {
  const out: string[] = [];
  doc.forEach((node) => out.push(node.type.name));
  return out;
};

describe("insertBlockNode", () => {
  it("replaces the empty line the cursor is on and selects the block", () => {
    const s = state([para("before"), para(), para("after")], 9);
    const tr = s.tr;
    insertBlockNode(tr, figure(), true);
    expect(names(tr.doc)).toEqual(["paragraph", "figure", "paragraph"]);
    expect(tr.selection).toBeInstanceOf(NodeSelection);
    expect((tr.selection as NodeSelection).node.type.name).toBe("figure");
  });

  it("goes after a line that has text", () => {
    const s = state([para("hello"), para("next")], 3);
    const tr = s.tr;
    insertBlockNode(tr, figure(), true);
    expect(names(tr.doc)).toEqual(["paragraph", "figure", "paragraph"]);
    expect(tr.doc.child(0).textContent).toBe("hello");
  });

  it("puts the cursor in a new line after a divider", () => {
    const s = state([para()], 1);
    const tr = s.tr;
    insertBlockNode(tr, schema.nodes.divider.create(), false);
    expect(names(tr.doc)).toEqual(["divider", "paragraph"]);
    expect(tr.selection.$from.parent.type.name).toBe("paragraph");
  });

  it("inserts after a list rather than inside it", () => {
    const list = schema.nodes.bulletList.create(null, [schema.nodes.listItem.create(null, [para("item")])]);
    const s = state([list, para("after")], 4);
    expect(placementFor(s)).toBe(list.nodeSize);
    const tr = s.tr;
    insertBlockNode(tr, figure(), true);
    expect(names(tr.doc)).toEqual(["bulletList", "figure", "paragraph"]);
  });

  it("stays inside a callout", () => {
    const callout = schema.nodes.callout.create(null, [para("note"), para()]);
    // Cursor in the callout's empty second paragraph: 1 (callout open) + 6 (first p) + 1.
    const s = state([callout], 8);
    const tr = s.tr;
    insertBlockNode(tr, figure(), true);
    const inner: string[] = [];
    tr.doc.child(0).forEach((node) => inner.push(node.type.name));
    expect(inner).toEqual(["paragraph", "figure"]);
  });
});

describe("insertTable", () => {
  // Regression: TipTap's insertTable put the caret at `from + 1`, past the end
  // of the document when the table replaced the last empty line, and threw.
  it("replaces the last empty line and puts the caret in the first header cell", () => {
    const s = state([para("before"), para()], 9);
    const tr = s.tr;
    expect(insertTable(tr, 3, 3)).toBe(true);
    expect(names(tr.doc)).toEqual(["paragraph", "table", "paragraph"]);
    const table = tr.doc.child(1);
    expect(table.childCount).toBe(3);
    expect(table.child(0).child(0).type.name).toBe("tableHeader");
    expect(table.child(1).child(0).type.name).toBe("tableCell");
    expect(tr.selection.$from.parent.type.name).toBe("paragraph");
    expect(tr.selection.$from.node(-1).type.name).toBe("tableHeader");
    expect(tr.selection.$from.index(-2)).toBe(0); // first cell of the row
  });

  it("goes after a line that has text", () => {
    const s = state([para("hello")], 3);
    const tr = s.tr;
    insertTable(tr, 2, 2);
    expect(names(tr.doc)).toEqual(["paragraph", "table", "paragraph"]);
    expect(tr.doc.child(1).childCount).toBe(2);
  });
});
