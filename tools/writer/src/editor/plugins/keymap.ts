// Keyboard behaviour on top of StarterKit's: Cmd+K for links, moving blocks
// with Cmd+Shift+Up/Down, "# " as a heading (the page owns the h1, so it
// means h2 here), and typing onto a selected media block starts a new line
// below it instead of replacing the block.

import { Extension, textblockTypeInputRule } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

import { NODE } from "../../shared/types";
import { movableBlockPos, moveBlockAt } from "../blocks";

declare module "@tiptap/core" {
  interface Storage {
    writerUi: WriterUiStorage;
  }
}

export interface WriterUiStorage {
  /** Set by the bubble toolbar: opens the link field for the selection. */
  openLink: (() => boolean) | null;
}

/** Atom blocks that typing should step past rather than replace. */
const STEP_PAST = new Set<string>([NODE.figure, NODE.gallery, NODE.video, NODE.anatomy, NODE.divider]);

export const WriterKeymap = Extension.create<Record<string, never>, WriterUiStorage>({
  name: "writerUi",

  addStorage() {
    return { openLink: null };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-k": () => this.storage.openLink?.() ?? false,
      "Mod-Shift-ArrowUp": ({ editor }) => {
        const pos = movableBlockPos(editor);
        return pos === null ? false : moveBlockAt(editor, pos, -1);
      },
      "Mod-Shift-ArrowDown": ({ editor }) => {
        const pos = movableBlockPos(editor);
        return pos === null ? false : moveBlockAt(editor, pos, 1);
      },
    };
  },

  addInputRules() {
    const heading = this.editor.schema.nodes[NODE.heading];
    if (!heading) return [];
    return [textblockTypeInputRule({ find: /^#\s$/, type: heading, getAttributes: { level: 2 } })];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("writerStepPast"),
        props: {
          handleTextInput(view, _from, _to, text) {
            const { selection, schema } = view.state;
            if (!(selection instanceof NodeSelection) || !STEP_PAST.has(selection.node.type.name)) return false;
            const after = selection.to;
            const paragraph = schema.nodes[NODE.paragraph].create(null, schema.text(text));
            const tr = view.state.tr.insert(after, paragraph);
            tr.setSelection(TextSelection.create(tr.doc, after + 1 + text.length));
            view.dispatch(tr.scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});
