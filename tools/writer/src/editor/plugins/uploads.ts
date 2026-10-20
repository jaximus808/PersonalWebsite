// Uploading pasted and dropped media. While files upload, a placeholder
// (a decoration, never part of the document) holds their place, so an
// autosave mid-upload never writes a blob: URL into the draft. When the
// uploads finish, the real block goes where the placeholder ended up.

import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, type EditorState, type Selection } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { insertPoint } from "@tiptap/pm/transform";

import { NODE } from "../../shared/types";
import type { EnvGetter } from "../env";
import { galleryColumnsFor, sortMediaFiles } from "../media";

type Meta = { add: { id: string; pos: number; previews: string[]; label: string } } | { remove: { id: string } };

export const uploadsKey = new PluginKey<DecorationSet>("writerUploads");

export function createUploadPlaceholderPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: uploadsKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        let next = set.map(tr.mapping, tr.doc);
        const meta = tr.getMeta(uploadsKey) as Meta | undefined;
        if (meta && "add" in meta) {
          const { id, pos, previews, label } = meta.add;
          const widget = Decoration.widget(pos, () => renderPlaceholder(previews, label), { id, side: -1 });
          next = next.add(tr.doc, [widget]);
        } else if (meta && "remove" in meta) {
          next = next.remove(next.find(undefined, undefined, (spec) => spec.id === meta.remove.id));
        }
        return next;
      },
    },
    props: {
      decorations(state) {
        return uploadsKey.getState(state);
      },
    },
  });
}

function renderPlaceholder(previews: string[], label: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "wr-upload-placeholder";
  root.setAttribute("contenteditable", "false");
  root.setAttribute("role", "status");
  root.setAttribute("aria-label", label);

  const grid = document.createElement("div");
  grid.className = previews.length > 1 ? "wr-upload-placeholder__grid" : "wr-upload-placeholder__single";
  for (const url of previews.slice(0, 6)) {
    const tile = document.createElement("div");
    tile.className = "wr-upload-placeholder__tile";
    if (url) tile.style.backgroundImage = `url("${url}")`;
    grid.appendChild(tile);
  }
  root.appendChild(grid);

  const caption = document.createElement("div");
  caption.className = "wr-upload-placeholder__label";
  caption.textContent = label;
  root.appendChild(caption);

  const bar = document.createElement("div");
  bar.className = "wr-progress";
  root.appendChild(bar);
  return root;
}

function findPlaceholder(state: EditorState, id: string): number | null {
  const set = uploadsKey.getState(state);
  const found = set?.find(undefined, undefined, (spec) => spec.id === id) ?? [];
  return found.length ? found[0].from : null;
}

let uploadCounter = 0;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Upload media files and insert them at `pos` (or the selection): one image
 * becomes a figure, several become a gallery, each video its own block.
 * Returns false when none of the files are media (so a caller can let the
 * default handling run).
 */
export function insertMediaFiles(view: EditorView, getEnv: EnvGetter, files: File[], pos?: number): boolean {
  const env = getEnv();
  const { images, videos, rejected } = sortMediaFiles(files);
  for (const { file, reason } of rejected) env.notify(`${file.name} wasn't added: ${reason}.`, "error");
  if (!images.length && !videos.length) return rejected.length > 0;

  const { state } = view;
  const schema = state.schema;
  const target = pos ?? placementFor(state);
  const at = insertPoint(state.doc, target, schema.nodes[NODE.figure]) ?? target;

  const id = `upload-${(uploadCounter += 1)}`;
  const previews = images.map((file) => URL.createObjectURL(file));
  const parts = [images.length ? plural(images.length, "image") : "", videos.length ? plural(videos.length, "video") : ""];
  const label = `Uploading ${parts.filter(Boolean).join(" and ")}…`;
  view.dispatch(state.tr.setMeta(uploadsKey, { add: { id, pos: at, previews: videos.length && !images.length ? [""] : previews, label } }));

  void (async () => {
    const uploadAll = (batch: File[]) => Promise.allSettled(batch.map((file) => env.upload(file)));
    const [imageResults, videoResults] = await Promise.all([uploadAll(images), uploadAll(videos)]);
    previews.forEach((url) => URL.revokeObjectURL(url));

    const failures: string[] = [];
    const srcs = (results: PromiseSettledResult<{ src: string }>[], batch: File[]) =>
      results.flatMap((result, i) => {
        if (result.status === "fulfilled") return [result.value.src];
        failures.push(batch[i].name);
        return [];
      });
    const imageSrcs = srcs(imageResults, images);
    const videoSrcs = srcs(videoResults, videos);
    if (failures.length) getEnv().notify(`Couldn't upload ${failures.join(", ")}.`, "error");

    if (view.isDestroyed) return;
    const placeAt = findPlaceholder(view.state, id);
    const tr = view.state.tr.setMeta(uploadsKey, { remove: { id } });
    if (placeAt === null) {
      // The text around the placeholder was deleted; don't resurrect it.
      view.dispatch(tr);
      return;
    }

    const nodes: PMNode[] = [];
    if (imageSrcs.length === 1) {
      nodes.push(schema.nodes[NODE.figure].create({ src: imageSrcs[0] }));
    } else if (imageSrcs.length > 1) {
      nodes.push(schema.nodes[NODE.gallery].create({ images: imageSrcs, columns: galleryColumnsFor(imageSrcs.length) }));
    }
    for (const src of videoSrcs) nodes.push(schema.nodes[NODE.video].create({ src }));
    if (nodes.length) tr.insert(placeAt, nodes);
    view.dispatch(tr);
  })();
  return true;
}

const FLOW_CONTAINERS = new Set<string>([NODE.doc, NODE.callout]);

/**
 * Where a block goes when inserted at the cursor: before an empty paragraph
 * (so the cursor stays below it, ready to keep writing), otherwise after the
 * nearest block that sits in the page or a callout (not inside a list item
 * or table cell, where media can't be exported).
 */
export function placementFor(state: { selection: Selection }): number {
  if (state.selection instanceof NodeSelection) return state.selection.to;
  const { $from } = state.selection;
  if ($from.depth === 0) return $from.pos;
  const inFlow = FLOW_CONTAINERS.has($from.node($from.depth - 1).type.name);
  if (inFlow && $from.parent.isTextblock && $from.parent.content.size === 0) return $from.before();
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (FLOW_CONTAINERS.has($from.node(depth - 1).type.name)) return $from.after(depth);
  }
  return $from.after(1);
}

/**
 * Where dropped files go: before or after the block under the pointer
 * (whichever half it's over), at the level of the page or a callout.
 */
export function dropPlacement(view: EditorView, event: DragEvent): number | null {
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!coords) return null;
  const $pos = view.state.doc.resolve(coords.pos);
  let depth = $pos.depth;
  while (depth > 0 && !FLOW_CONTAINERS.has($pos.node(depth - 1).type.name)) depth -= 1;
  if (depth === 0) {
    // Between two top-level blocks already.
    return coords.pos;
  }
  const before = $pos.before(depth);
  const after = $pos.after(depth);
  const dom = view.nodeDOM(before);
  if (dom instanceof HTMLElement) {
    const box = dom.getBoundingClientRect();
    return event.clientY < box.top + box.height / 2 ? before : after;
  }
  return after;
}
