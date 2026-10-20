// Row and column controls, shown above a table while the cursor is in it.
// The first row is always the header (GFM tables need one).

import { useCallback, useMemo } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { PluginKey, type EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

import { NODE } from "../../shared/types";
import {
  IconColDelete,
  IconColLeft,
  IconColRight,
  IconRowAbove,
  IconRowBelow,
  IconRowDelete,
  IconTrash,
} from "../icons";
import { ToolButton, ToolDivider } from "../nodes/ui";

function tablePos(state: EditorState): number | null {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === NODE.table) return $from.before(depth);
  }
  return null;
}

function inHeaderRow(state: EditorState): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === NODE.tableRow) {
      return $from.index(depth - 1) === 0;
    }
  }
  return false;
}

export function TableMenu({ editor }: { editor: Editor }) {
  const pluginKey = useMemo(() => new PluginKey("writerTableMenu"), []);

  const shouldShow = useCallback(
    ({ editor: e, view, state }: { editor: Editor; view: EditorView; state: EditorState }) =>
      e.isEditable && view.hasFocus() && tablePos(state) !== null,
    [],
  );

  const getReferencedVirtualElement = useCallback(() => {
    const pos = tablePos(editor.state);
    if (pos === null) return null;
    const dom = editor.view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) return null;
    return { getBoundingClientRect: () => dom.getBoundingClientRect() };
  }, [editor]);

  const options = useMemo(() => ({ placement: "top-end" as const, offset: 8, flip: { padding: 12 }, shift: { padding: 12 } }), []);
  const run = (command: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => command(editor.chain().focus()).run();
  const header = useEditorState({ editor, selector: ({ editor: e }) => inHeaderRow(e.state) });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={pluginKey}
      updateDelay={0}
      shouldShow={shouldShow}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={options}
      className="wr-bubble wr-table-menu"
    >
      <div className="wr-bubble__row" role="toolbar" aria-label="Table">
        <ToolButton label="Add row above" disabled={header} onClick={() => run((c) => c.addRowBefore())}>
          <IconRowAbove />
        </ToolButton>
        <ToolButton label="Add row below" onClick={() => run((c) => c.addRowAfter())}>
          <IconRowBelow />
        </ToolButton>
        <ToolButton label="Delete row" disabled={header} onClick={() => run((c) => c.deleteRow())}>
          <IconRowDelete />
        </ToolButton>
        <ToolDivider />
        <ToolButton label="Add column left" onClick={() => run((c) => c.addColumnBefore())}>
          <IconColLeft />
        </ToolButton>
        <ToolButton label="Add column right" onClick={() => run((c) => c.addColumnAfter())}>
          <IconColRight />
        </ToolButton>
        <ToolButton label="Delete column" onClick={() => run((c) => c.deleteColumn())}>
          <IconColDelete />
        </ToolButton>
        <ToolDivider />
        <ToolButton label="Delete table" danger onClick={() => run((c) => c.deleteTable())}>
          <IconTrash />
        </ToolButton>
      </div>
    </BubbleMenu>
  );
}
