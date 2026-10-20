import { describe, expect, it } from "vitest";
import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";

import { copyWithFreshIds } from "../blocks";
import { anatomyIds, createAnatomyIdPlugin, nextFigureId } from "../plugins/anatomyIds";
import { editorSchema } from "./schema";

const schema = editorSchema();

const anatomy = (id: string, title = "") => schema.nodes.anatomy.create({ id, title });
const para = (text: string) => schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined);

function stateWith(nodes: PMNode[], seen = new Set<string>()) {
  const doc = schema.nodes.doc.create(null, nodes);
  for (const id of anatomyIds(doc)) seen.add(id);
  return { state: EditorState.create({ schema, doc, plugins: [createAnatomyIdPlugin(seen)] }), seen };
}

describe("nextFigureId", () => {
  it("starts at fig-1", () => {
    expect(nextFigureId([])).toBe("fig-1");
  });

  it("goes one past the highest number, ignoring custom ids", () => {
    expect(nextFigureId(["fig-1", "fig-7", "teleop-loop"])).toBe("fig-8");
  });

  it("never reuses an id that was seen, even with gaps", () => {
    expect(nextFigureId(["fig-2"])).toBe("fig-3");
  });
});

describe("anatomy id plugin", () => {
  it("gives a pasted copy a new id and leaves the original alone", () => {
    const original = anatomy("fig-1", "Original");
    const { state } = stateWith([para("a"), original, para("b")]);
    // Paste a copy (a new node object with the same id) at the end.
    const copy = schema.nodeFromJSON(original.toJSON());
    const result = state.applyTransaction(state.tr.insert(state.doc.content.size, copy));
    const ids = anatomyIds(result.state.doc);
    expect(ids).toEqual(["fig-1", "fig-2"]);
    // The original is the very same node object it was before.
    expect(result.state.doc.child(1)).toBe(original);
  });

  it("keeps the original even when the copy lands before it", () => {
    const original = anatomy("fig-1", "Original");
    const { state } = stateWith([para("a"), original]);
    const copy = schema.nodeFromJSON(original.toJSON());
    const result = state.applyTransaction(state.tr.insert(0, copy));
    expect(anatomyIds(result.state.doc)).toEqual(["fig-2", "fig-1"]);
    expect(result.state.doc.child(2)).toBe(original);
  });

  it("treats the same node object twice as a copy", () => {
    const shared = anatomy("fig-1");
    const callout = schema.nodes.callout.create(null, [shared]);
    const { state } = stateWith([callout]);
    const result = state.applyTransaction(state.tr.insert(state.doc.content.size, callout));
    expect(anatomyIds(result.state.doc)).toEqual(["fig-1", "fig-2"]);
  });

  it("assigns ids to requests that arrive without one", () => {
    const { state } = stateWith([para("")]);
    const result = state.applyTransaction(state.tr.insert(0, anatomy("")));
    expect(anatomyIds(result.state.doc)).toEqual(["fig-1"]);
  });

  it("replaces ids that aren't slug-like", () => {
    const { state } = stateWith([para("")]);
    const result = state.applyTransaction(state.tr.insert(0, anatomy("Fig 1!")));
    expect(anatomyIds(result.state.doc)).toEqual(["fig-1"]);
  });

  it("does not hand a deleted request's id to a new one", () => {
    const { state, seen } = stateWith([anatomy("fig-1"), para("")]);
    const deleted = state.applyTransaction(state.tr.delete(0, 1)).state;
    expect(anatomyIds(deleted.doc)).toEqual([]);
    const result = deleted.applyTransaction(deleted.tr.insert(0, anatomy("")));
    expect(anatomyIds(result.state.doc)).toEqual(["fig-2"]);
    expect(seen.has("fig-1")).toBe(true);
  });

  it("leaves duplicates that were already there for lint to report", () => {
    const { state } = stateWith([anatomy("fig-1"), anatomy("fig-1"), para("")]);
    const result = state.applyTransaction(state.tr.insertText("typing", state.doc.content.size - 1));
    expect(anatomyIds(result.state.doc)).toEqual(["fig-1", "fig-1"]);
  });

  it("keeps the id when a request is moved (cut and pasted as one step)", () => {
    const original = anatomy("fig-1");
    const { state } = stateWith([original, para("a"), para("b")]);
    const end = state.doc.content.size;
    const tr = state.tr.insert(end, original).delete(0, 1);
    const result = state.applyTransaction(tr);
    expect(anatomyIds(result.state.doc)).toEqual(["fig-1"]);
  });

  it("is a no-op for ordinary typing", () => {
    const { state } = stateWith([anatomy("fig-1"), para("x")]);
    const result = state.applyTransaction(state.tr.insertText("y", 3));
    expect(result.transactions).toHaveLength(1);
  });

  it("pastes through a slice too", () => {
    const original = anatomy("fig-3");
    const { state } = stateWith([original, para("")]);
    const slice = new Slice(Fragment.from(schema.nodeFromJSON(original.toJSON())), 0, 0);
    const result = state.applyTransaction(state.tr.replace(state.doc.content.size, state.doc.content.size, slice));
    expect(anatomyIds(result.state.doc)).toEqual(["fig-3", "fig-4"]);
  });
});

describe("copyWithFreshIds", () => {
  it("renumbers every anatomy request inside a copied block", () => {
    const seen = new Set(["fig-1", "fig-2"]);
    const callout = schema.nodes.callout.create(null, [anatomy("fig-1"), para("x"), anatomy("fig-2")]);
    const copy = copyWithFreshIds(callout, seen);
    expect(anatomyIds(schema.nodes.doc.create(null, [copy]))).toEqual(["fig-3", "fig-4"]);
    expect(copy.child(1)).toBe(callout.child(1));
  });
});
