// Block-level operations shared by the slash menu, the block handle menu and
// the keyboard: inserting a block at the cursor, moving, duplicating,
// deleting and converting blocks.

import type { Editor } from "@tiptap/react";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, Selection, TextSelection, type Transaction } from "@tiptap/pm/state";

import { NODE } from "../shared/types";
import { nextFigureId } from "./plugins/anatomyIds";
import { placementFor } from "./plugins/uploads";

/**
 * Insert a block node at the cursor. An empty paragraph is replaced; anything
 * else gets the block after it. With `select`, the new block is selected
 * (media blocks show their toolbar); otherwise the cursor moves to the text
 * block after it, created if needed.
 */
export function insertBlockNode(tr: Transaction, node: PMNode, select: boolean): number {
  const { $from } = tr.selection;
  const replaceEmpty =
    !(tr.selection instanceof NodeSelection) &&
    $from.depth > 0 &&
    $from.parent.isTextblock &&
    $from.parent.type.name === NODE.paragraph &&
    $from.parent.content.size === 0 &&
    $from.node($from.depth - 1).canReplaceWith($from.index($from.depth - 1), $from.index($from.depth - 1) + 1, node.type);

  let pos: number;
  if (replaceEmpty) {
    pos = $from.before();
    tr.replaceWith(pos, $from.after(), node);
  } else {
    pos = placementFor(tr);
    tr.insert(pos, node);
  }

  if (select && NodeSelection.isSelectable(node)) {
    tr.setSelection(NodeSelection.create(tr.doc, pos));
  } else {
    const after = pos + node.nodeSize;
    const next = tr.doc.resolve(after).nodeAfter;
    if (!next || !next.isTextblock) tr.insert(after, tr.doc.type.schema.nodes[NODE.paragraph].create());
    tr.setSelection(TextSelection.create(tr.doc, after + 1));
  }
  tr.scrollIntoView();
  return pos;
}

/**
 * Insert an empty table (first row as the header) with the caret in its first
 * cell. TipTap's own insertTable puts the caret at `from + 1`, which is past
 * the end of the document when the table replaces the last empty paragraph,
 * and throws there; this goes through insertBlockNode like every other block.
 */
export function insertTableAt(editor: Editor, rows = 3, cols = 3): boolean {
  const tr = editor.state.tr;
  if (!insertTable(tr, rows, cols)) return false;
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}

/** The transaction half of insertTableAt: header row plus body rows, caret in the first cell. */
export function insertTable(tr: Transaction, rows = 3, cols = 3): boolean {
  const { schema } = tr.doc.type;
  const table = schema.nodes[NODE.table];
  const row = schema.nodes[NODE.tableRow];
  const header = schema.nodes[NODE.tableHeader];
  const cell = schema.nodes[NODE.tableCell];
  if (!table || !row || !header || !cell) return false;

  const fill = (type: typeof cell) => Array.from({ length: cols }, () => type.createAndFill()!);
  const node = table.create(null, [
    row.create(null, fill(header)),
    ...Array.from({ length: Math.max(1, rows - 1) }, () => row.create(null, fill(cell))),
  ]);

  const pos = insertBlockNode(tr, node, false);
  // table > row > cell > paragraph: the first cell's text starts four in.
  tr.setSelection(TextSelection.create(tr.doc, pos + 4));
  return true;
}

/** A fresh copy of a node: anatomy requests inside get new ids. */
export function copyWithFreshIds(node: PMNode, seen: Set<string>): PMNode {
  if (node.type.name === NODE.anatomy) {
    const id = nextFigureId(seen);
    seen.add(id);
    return node.type.create({ ...node.attrs, id }, node.content, node.marks);
  }
  if (node.isLeaf || node.isTextblock || node.content.size === 0) return node;
  const children: PMNode[] = [];
  let changed = false;
  node.content.forEach((child) => {
    const next = copyWithFreshIds(child, seen);
    if (next !== child) changed = true;
    children.push(next);
  });
  return changed ? node.copy(Fragment.from(children)) : node;
}

function anatomySeen(editor: Editor): Set<string> {
  return editor.storage.anatomy?.seen ?? new Set<string>();
}

export function duplicateBlockAt(editor: Editor, pos: number): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return false;
  const copy = copyWithFreshIds(node, anatomySeen(editor));
  const after = pos + node.nodeSize;
  const tr = editor.state.tr.insert(after, copy);
  tr.setSelection(Selection.near(tr.doc.resolve(after + 1)));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
}

export function deleteBlockAt(editor: Editor, pos: number): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return false;
  const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size)), -1));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return true;
}

/** Swap the block at `pos` with its previous (-1) or next (+1) sibling. */
export function moveBlockAt(editor: Editor, pos: number, dir: -1 | 1): boolean {
  const { doc } = editor.state;
  const node = doc.nodeAt(pos);
  if (!node) return false;
  const $pos = doc.resolve(pos);
  const index = $pos.index();
  const parent = $pos.parent;
  const siblingIndex = index + dir;
  if (siblingIndex < 0 || siblingIndex >= parent.childCount) return false;
  const sibling = parent.child(siblingIndex);

  const { selection } = editor.state;
  const end = pos + node.nodeSize;
  const inside = selection.from >= pos && selection.to <= end;

  const tr = editor.state.tr.delete(pos, end);
  const newPos = dir === -1 ? pos - sibling.nodeSize : pos + sibling.nodeSize;
  tr.insert(newPos, node);

  if (selection instanceof NodeSelection && selection.from === pos) {
    tr.setSelection(NodeSelection.create(tr.doc, newPos));
  } else if (inside && selection instanceof TextSelection) {
    tr.setSelection(
      TextSelection.create(tr.doc, newPos + (selection.anchor - pos), newPos + (selection.head - pos)),
    );
  } else {
    tr.setSelection(NodeSelection.isSelectable(node) ? NodeSelection.create(tr.doc, newPos) : Selection.near(tr.doc.resolve(newPos + 1)));
  }
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * The block a keyboard move acts on: the selected block, or the list item /
 * block (in the page or a callout) holding the cursor.
 */
export function movableBlockPos(editor: Editor): number | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection) return selection.from;
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    const parent = $from.node(depth - 1).type.name;
    if (name === NODE.listItem || name === NODE.taskItem) return $from.before(depth);
    if (parent === NODE.doc || parent === NODE.callout) return $from.before(depth);
  }
  return null;
}

export type TurnInto = "paragraph" | "h2" | "h3" | "h4" | "quote" | "code" | "pullQuote" | "callout";

/** Convert the text block at `pos`. */
export function turnTextBlockInto(editor: Editor, pos: number, kind: TurnInto): boolean {
  const node = editor.state.doc.nodeAt(pos);
  if (!node?.isTextblock) return false;
  const chain = editor.chain().focus().setTextSelection(pos + 1 + node.content.size);
  switch (kind) {
    case "paragraph":
      return chain.setParagraph().run();
    case "h2":
    case "h3":
    case "h4":
      return chain.setNode(NODE.heading, { level: Number(kind.slice(1)) }).run();
    case "quote":
      return chain.setParagraph().wrapIn(NODE.blockquote).run();
    case "code":
      return chain.setNode(NODE.codeBlock).run();
    case "pullQuote":
      return chain.setNode(NODE.pullQuote).run();
    case "callout":
      return chain.setParagraph().wrapIn(NODE.callout).run();
  }
}
