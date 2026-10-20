// Paste and drop. Media files upload and become figures, galleries or
// videos; a YouTube link on an empty line becomes a video; an image link on
// an empty line becomes a figure; markdown text becomes real blocks.
// Cmd/Ctrl+Shift+V always pastes plain text.

import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

import { NODE } from "../../shared/types";
import type { EnvGetter } from "../env";
import { looksLikeMarkdown, markdownToSlice } from "../markdown";
import { isImageUrl, isVideoUrl, normalizeHref, parseYouTubeId, sortMediaFiles } from "../media";
import { dropPlacement, insertMediaFiles } from "./uploads";

export const pasteKey = new PluginKey("writerPaste");

/** Files on the clipboard (screenshots, images copied from a browser or Finder). */
function clipboardFiles(data: DataTransfer): File[] {
  const files = Array.from(data.files ?? []);
  if (files.length) return files;
  return Array.from(data.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => !!file);
}

/** VS Code puts the source language on the clipboard. */
function vscodeMode(data: DataTransfer): string | null {
  const raw = data.getData("vscode-editor-data");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { mode?: unknown };
    return typeof parsed.mode === "string" ? parsed.mode : null;
  } catch {
    return null;
  }
}

/**
 * Pasted HTML headings mapped onto the levels a post can use: the page owns
 * the h1, and the site styles stop at h4.
 */
export function normalizePastedHeadings(html: string): string {
  return html
    .replace(/<(\/?)h1(?=[\s>])/gi, "<$1h2")
    .replace(/<(\/?)h[56](?=[\s>])/gi, "<$1h4");
}

function inEmptyTextblock(view: EditorView): boolean {
  const { selection } = view.state;
  const { $from } = selection;
  return selection.empty && $from.depth > 0 && $from.parent.isTextblock && $from.parent.content.size === 0;
}

/** Swap the empty line the cursor is on for a block, and select it. */
function replaceEmptyLine(view: EditorView, node: PMNode): boolean {
  const { $from } = view.state.selection;
  const start = $from.before();
  const parent = $from.node($from.depth - 1);
  const index = $from.index($from.depth - 1);
  if (!parent.canReplaceWith(index, index + 1, node.type)) return false;
  const tr = view.state.tr.replaceWith(start, $from.after(), node);
  tr.setSelection(NodeSelection.create(tr.doc, start));
  view.dispatch(tr.scrollIntoView().setMeta("uiEvent", "paste"));
  return true;
}

export function createPasteExtension(getEnv: EnvGetter) {
  return Extension.create({
    name: "writerPaste",
    // Ahead of Link's paste-on-selection and CodeBlock's VS Code paste, which
    // still run whenever this declines.
    priority: 160,

    addProseMirrorPlugins() {
      let plainUntil = 0;

      return [
        new Plugin({
          key: pasteKey,
          props: {
            handleKeyDown(_view, event) {
              if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "v") {
                plainUntil = Date.now() + 1000;
              }
              return false;
            },

            transformPastedHTML: normalizePastedHeadings,

            handlePaste(view, event) {
              const data = event.clipboardData;
              if (!data) return false;
              const { state } = view;
              const { $from } = state.selection;
              if ($from.parent.type.spec.code) return false;

              const files = clipboardFiles(data);
              if (files.length) {
                const { images, videos } = sortMediaFiles(files);
                if (images.length || videos.length) return insertMediaFiles(view, getEnv, files);
              }

              if (Date.now() < plainUntil) return false;

              const text = data.getData("text/plain");
              const html = data.getData("text/html");
              const single = text.trim();
              const schema = state.schema;

              if (single && !/\s/.test(single) && inEmptyTextblock(view)) {
                const youtube = /youtu/i.test(single) ? parseYouTubeId(single) : null;
                if (youtube) {
                  return replaceEmptyLine(view, schema.nodes[NODE.video].create({ youtube }));
                }
                if (isImageUrl(single)) {
                  const src = single.startsWith("/") ? single : normalizeHref(single);
                  return replaceEmptyLine(view, schema.nodes[NODE.figure].create({ src }));
                }
                if (isVideoUrl(single)) {
                  const src = single.startsWith("/") ? single : normalizeHref(single);
                  return replaceEmptyLine(view, schema.nodes[NODE.video].create({ src }));
                }
              }

              const mode = vscodeMode(data);
              const markdownSource =
                mode !== null ? mode === "markdown" || mode === "mdx" : !html && looksLikeMarkdown(text);
              if (!markdownSource) return false;

              const env = getEnv();
              const slice = markdownToSlice(text, { kind: env.kind, slug: env.slug }, schema);
              if (!slice) return false;
              view.dispatch(
                state.tr.replaceSelection(slice).scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"),
              );
              return true;
            },

            handleDrop(view, event, _slice, moved) {
              if (moved) return false;
              // Blocks with their own drop zones (figure, gallery, video)
              // handle drops on themselves; stop ProseMirror inserting too.
              const target = event.target instanceof Element ? event.target : null;
              if (target?.closest("[data-wr-dropzone]")) return true;

              const files = Array.from(event.dataTransfer?.files ?? []);
              if (!files.length) return false;
              const pos = dropPlacement(view, event);
              insertMediaFiles(view, getEnv, files, pos ?? undefined);
              return true;
            },
          },
        }),
      ];
    },
  });
}
