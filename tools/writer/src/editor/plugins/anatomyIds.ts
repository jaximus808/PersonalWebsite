// Every anatomy figure request needs an id that is unique in the draft: it
// names the built file (figures/<id>.html) and the <Diagram src> on export.
// New requests get "fig-1", "fig-2", …; this plugin also repairs ids when a
// request is pasted or duplicated, so two blocks never point at one figure.

import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";

import { NODE } from "../../shared/types";

/** Slug-like, as the contract says: "fig-1", "teleop-loop". */
export const FIGURE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The next free "fig-N": one past the highest N among every id seen this
 * session (including requests since deleted, so a new request never inherits
 * an old request's built figure file).
 */
export function nextFigureId(taken: Iterable<string>): string {
  const used = new Set(taken);
  let max = 0;
  for (const id of used) {
    const match = /^fig-(\d+)$/.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  let n = max + 1;
  while (used.has(`fig-${n}`)) n += 1;
  return `fig-${n}`;
}

/** Ids of every anatomy node in a document, in order. */
export function anatomyIds(doc: PMNode): string[] {
  const ids: string[] = [];
  eachAnatomy(doc, (node) => {
    if (typeof node.attrs.id === "string" && node.attrs.id) ids.push(node.attrs.id);
  });
  return ids;
}

function eachAnatomy(doc: PMNode, visit: (node: PMNode, pos: number) => void) {
  doc.descendants((node, pos) => {
    if (node.type.name === NODE.anatomy) {
      visit(node, pos);
      return false;
    }
    // Anatomy blocks never live inside inline content; skip text quickly.
    return !node.isTextblock;
  });
}

export const anatomyIdsKey = new PluginKey("writerAnatomyIds");

/**
 * Keeps ids unique and valid. `seen` is shared with the editor so ids from
 * the server's figure list count as taken too; the plugin adds every id it
 * sees.
 *
 * Which copy keeps a contested id: a node object that was already in the
 * previous document (ProseMirror reuses unchanged nodes) wins over a new
 * one, so pasting a copy of fig-2 renames the copy, not the original, and
 * a drag-move keeps its id. Duplicates that were already there before the
 * change are left alone; lint reports them instead of the editor quietly
 * detaching a built figure.
 */
export function createAnatomyIdPlugin(seen: Set<string>): Plugin {
  return new Plugin({
    key: anatomyIdsKey,
    view(view) {
      for (const id of anatomyIds(view.state.doc)) seen.add(id);
      return {};
    },
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged)) return null;
      if (transactions.some((tr) => tr.getMeta(anatomyIdsKey))) return null;
      return repairIds(oldState, newState, seen);
    },
  });
}

interface Entry {
  node: PMNode;
  pos: number;
  old: boolean;
}

/** Exported for tests: the transaction that fixes ids, or null if none are needed. */
export function repairIds(oldState: EditorState, newState: EditorState, seen: Set<string>): Transaction | null {
  const previous = new Set<PMNode>();
  eachAnatomy(oldState.doc, (node) => previous.add(node));

  const entries: Entry[] = [];
  const claimed = new Set<PMNode>();
  eachAnatomy(newState.doc, (node, pos) => {
    // The same node object twice (a duplicated callout shares its children)
    // means the second one is a copy.
    const old = previous.has(node) && !claimed.has(node);
    if (old) claimed.add(node);
    entries.push({ node, pos, old });
  });
  if (entries.length === 0) return null;

  const holders = new Map<string, Entry>();
  const rename = new Set<Entry>();
  for (const entry of entries) {
    const id = entry.node.attrs.id;
    if (typeof id !== "string" || !FIGURE_ID.test(id)) {
      rename.add(entry);
      continue;
    }
    const holder = holders.get(id);
    if (!holder) {
      holders.set(id, entry);
    } else if (holder.old && !entry.old) {
      rename.add(entry);
    } else if (!holder.old && entry.old) {
      rename.add(holder);
      holders.set(id, entry);
    } else if (!holder.old && !entry.old) {
      rename.add(entry);
    }
    // Both old: a duplicate that predates this change. Leave it for lint.
  }

  for (const entry of entries) {
    if (!rename.has(entry) && typeof entry.node.attrs.id === "string") seen.add(entry.node.attrs.id);
  }
  if (rename.size === 0) return null;

  const tr = newState.tr;
  for (const entry of entries) {
    if (!rename.has(entry)) continue;
    const id = nextFigureId(seen);
    seen.add(id);
    tr.setNodeMarkup(entry.pos, undefined, { ...entry.node.attrs, id });
  }
  tr.setMeta(anatomyIdsKey, true);
  return tr;
}
