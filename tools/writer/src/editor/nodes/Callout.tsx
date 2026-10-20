// callout: an aside with an optional title and rich content. Becomes
// <Callout title="…">…</Callout> (components/content/Accents.tsx).

import { useRef } from "react";
import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

import { NODE, type CalloutAttrs } from "../../shared/types";
import { dataAttr, text } from "./attrs";
import { AttrInput, cx, focusBeforeNode, type FieldHandle } from "./ui";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wrap the selected blocks in a callout, or insert an empty one. */
      setCallout: (attrs?: Partial<CalloutAttrs>) => ReturnType;
      /** Lift the selection out of its callout. */
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = TiptapNode.create({
  name: NODE.callout,
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return { title: dataAttr("title", "", text) };
  },

  parseHTML() {
    return [{ tag: 'aside[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes({ "data-type": "callout" }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter on an empty last line leaves the callout, like leaving a list.
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from, empty } = selection;
        if (!empty || $from.parent.type.name !== NODE.paragraph || $from.parent.content.size > 0) return false;
        const depth = $from.depth - 1;
        if (depth < 1) return false;
        const callout = $from.node(depth);
        if (callout.type.name !== this.name) return false;
        if (callout.childCount < 2 || $from.index(depth) !== callout.childCount - 1) return false;

        return editor.commands.command(({ tr, dispatch }) => {
          if (!dispatch) return true;
          const paragraphStart = $from.before();
          const calloutEnd = $from.after(depth);
          // Remove the empty paragraph, then open a fresh one after the callout.
          tr.delete(paragraphStart, $from.after());
          const insertAt = tr.mapping.map(calloutEnd);
          tr.insert(insertAt, editor.schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, insertAt + 1));
          tr.scrollIntoView();
          return true;
        });
      },
      // Backspace at the very start of a callout's first block takes the
      // block out of the callout (and removes the callout if it was the
      // only one), instead of merging into whatever sits above.
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parentOffset > 0) return false;
        const depth = $from.depth - 1;
        if (depth < 1) return false;
        if ($from.node(depth).type.name !== this.name || $from.index(depth) !== 0) return false;
        return editor.commands.lift(this.name);
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView, { contentDOMElementTag: "div" });
  },
});

function CalloutView({ node, updateAttributes, editor, getPos, selected }: ReactNodeViewProps) {
  const attrs = node.attrs as CalloutAttrs;
  const title = useRef<FieldHandle>(null);

  const focusBody = () => {
    const pos = getPos();
    if (pos == null) return;
    // pos + 1 is the start of the first child; + 1 again is inside its text.
    const selection = TextSelection.near(editor.state.doc.resolve(pos + 2));
    editor.chain().focus().setTextSelection(selection.from).run();
  };

  return (
    <NodeViewWrapper as="aside" className={cx("wr-callout", selected && "is-selected", attrs.title && "has-title")}>
      <div className="wr-callout__title" contentEditable={false}>
        <AttrInput
          ref={title}
          className="wr-callout__title-input"
          label="Callout title"
          placeholder="Title (optional)"
          value={attrs.title}
          spellCheck
          onCommit={(value) => updateAttributes({ title: value })}
          onEnter={focusBody}
          onExitDown={focusBody}
          onExitUp={() => focusBeforeNode(editor, getPos)}
          onEscape={focusBody}
        />
      </div>
      <NodeViewContent className="wr-callout__body" />
    </NodeViewWrapper>
  );
}
