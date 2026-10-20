// divider: a quiet section break, optionally labelled. Becomes <Divider />
// or <Divider label="…" /> (components/content/Accents.tsx). Replaces
// StarterKit's horizontal rule, including its `---` shortcut.

import { mergeAttributes, Node as TiptapNode, nodeInputRule } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";

import { NODE, type DividerAttrs } from "../../shared/types";
import { insertBlockNode } from "../blocks";
import { dataAttr, text } from "./attrs";
import { AttrInput, cx, focusAfterNode, focusBeforeNode, selectNode, useFocusWithin } from "./ui";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    divider: {
      insertDivider: (attrs?: Partial<DividerAttrs>) => ReturnType;
    };
  }
}

export const Divider = TiptapNode.create({
  name: NODE.divider,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return { label: dataAttr("label", "", text) };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="divider"]' }, { tag: "hr" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "divider", role: "separator" }, HTMLAttributes)];
  },

  addCommands() {
    return {
      insertDivider:
        (attrs = {}) =>
        ({ tr, dispatch }) => {
          // The cursor moves on below the break, ready to keep writing.
          if (dispatch) insertBlockNode(tr, this.type.create(attrs), false);
          return true;
        },
    };
  },

  addInputRules() {
    // Same triggers as the horizontal rule it replaces: ---, —-, ___ , *** .
    return [nodeInputRule({ find: /^(?:---|—-|___\s|\*\*\*\s)$/, type: this.type })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DividerView);
  },
});

function DividerView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const attrs = node.attrs as DividerAttrs;
  const focus = useFocusWithin();
  const editing = selected || focus.inside;
  const labelled = !!attrs.label;
  return (
    <NodeViewWrapper
      className={cx("wr-divider", labelled && "has-label", editing && "is-editing", selected && "is-selected")}
      role="separator"
      aria-label={attrs.label || undefined}
      {...focus.handlers}
    >
      <span className="wr-divider__line" aria-hidden="true" />
      <span className="wr-divider__label" contentEditable={false}>
        <AttrInput
          className="wr-divider__input"
          label="Divider label"
          placeholder="Label (optional)"
          value={attrs.label}
          autoSize
          onCommit={(value) => updateAttributes({ label: value })}
          onEnter={() => focusAfterNode(editor, getPos)}
          onEscape={() => selectNode(editor, getPos)}
          onExitDown={() => focusAfterNode(editor, getPos)}
          onExitUp={() => focusBeforeNode(editor, getPos)}
        />
      </span>
      <span className="wr-divider__line" aria-hidden="true" />
    </NodeViewWrapper>
  );
}
