// Wires the "/" menu into the editor with @tiptap/suggestion: "/" at the
// start of a line or after a space opens it, typing filters, arrows move,
// Enter or Tab inserts, Escape closes.

import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";

import { NODE } from "../../shared/types";
import { filterItems } from "./filter";
import { BLOCK_ITEMS, type BlockItem } from "./items";
import { SlashMenu, type SlashMenuHandle, type SlashMenuProps } from "./SlashMenu";

export const slashKey = new PluginKey("writerSlash");

/** Places where the menu makes no sense: code, and table cells (text only). */
const NO_SLASH = new Set<string>([NODE.tableCell, NODE.tableHeader]);

function menuProps(props: SuggestionProps<BlockItem, BlockItem>): SlashMenuProps {
  return { items: props.items, query: props.query, loading: props.loading, command: props.command };
}

function renderSlashMenu(): ReturnType<NonNullable<SuggestionOptions<BlockItem, BlockItem>["render"]>> {
  let renderer: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null;
  let unmount: (() => void) | null = null;

  const close = () => {
    unmount?.();
    unmount = null;
    renderer?.destroy();
    renderer = null;
  };

  return {
    onStart(props) {
      renderer = new ReactRenderer(SlashMenu, {
        props: menuProps(props),
        editor: props.editor,
        className: "wr-floating",
      });
      unmount = props.mount(renderer.element);
    },
    onUpdate(props) {
      renderer?.updateProps(menuProps(props));
    },
    onKeyDown({ event }) {
      if (event.key === "Escape") {
        close();
        return true;
      }
      return renderer?.ref?.onKeyDown(event) ?? false;
    },
    onExit() {
      close();
    },
  };
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<BlockItem, BlockItem>({
        editor: this.editor,
        pluginKey: slashKey,
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        decorationClass: "wr-slash-query",
        initialItems: BLOCK_ITEMS,
        placement: "bottom-start",
        offset: { mainAxis: 8 },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          if ($from.parent.type.spec.code) return false;
          if ($from.marks().some((mark) => mark.type.spec.code)) return false;
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            if (NO_SLASH.has($from.node(depth).type.name)) return false;
          }
          return true;
        },
        items: ({ query }) => filterItems(BLOCK_ITEMS, query),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
        render: renderSlashMenu,
      }),
    ];
  },
});
