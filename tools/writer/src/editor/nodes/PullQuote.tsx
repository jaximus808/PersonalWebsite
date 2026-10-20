// pullQuote: one line lifted out of the text, in Cormorant. Becomes
// <PullQuote cite="…">…</PullQuote> (components/content/Accents.tsx).

import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

import { NODE, type PullQuoteAttrs } from "../../shared/types";
import { dataAttr, text } from "./attrs";
import { AttrInput, cx, focusAfterNode } from "./ui";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pullQuote: {
      /** Turn the current text block into a pull quote. */
      setPullQuote: (attrs?: Partial<PullQuoteAttrs>) => ReturnType;
    };
  }
}

export const PullQuote = TiptapNode.create({
  name: NODE.pullQuote,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return { cite: dataAttr("cite", "", text) };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="pull-quote"]', contentElement: "[data-pull-quote-text]", priority: 60 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes({ "data-type": "pull-quote" }, HTMLAttributes),
      ["div", { "data-pull-quote-text": "" }, 0],
    ];
  },

  addCommands() {
    return {
      setPullQuote:
        (attrs = {}) =>
        ({ commands }) =>
          commands.setNode(this.name, attrs),
    };
  },

  addKeyboardShortcuts() {
    const inPullQuote = () => this.editor.state.selection.$from.parent.type.name === this.name;
    return {
      // A pull quote is one line: Enter moves on to a new paragraph below
      // (Shift+Enter still breaks the line).
      Enter: ({ editor }) => {
        if (!inPullQuote()) return false;
        const { $from } = editor.state.selection;
        const after = $from.after();
        return editor
          .chain()
          .command(({ tr }) => {
            tr.insert(after, editor.schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.create(tr.doc, after + 1));
            tr.scrollIntoView();
            return true;
          })
          .run();
      },
      // Backspace at the start turns it back into a paragraph.
      Backspace: ({ editor }) => {
        const { empty, $from } = editor.state.selection;
        if (!inPullQuote() || !empty || $from.parentOffset > 0) return false;
        return editor.commands.setNode(NODE.paragraph);
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PullQuoteView, { contentDOMElementTag: "div" });
  },
});

function PullQuoteView({ node, updateAttributes, editor, getPos, selected }: ReactNodeViewProps) {
  const attrs = node.attrs as PullQuoteAttrs;
  const isEmpty = node.content.size === 0;
  return (
    <NodeViewWrapper as="figure" className={cx("wr-pullquote", selected && "is-selected", isEmpty && "is-empty")}>
      <div className="wr-pullquote__text-wrap">
        {isEmpty ? (
          <span className="wr-pullquote__placeholder" contentEditable={false} aria-hidden="true">
            A line worth lifting out
          </span>
        ) : null}
        <NodeViewContent className="wr-pullquote__text" />
      </div>
      <figcaption className="wr-pullquote__cite" contentEditable={false}>
        <AttrInput
          className="wr-pullquote__cite-input"
          label="Pull quote attribution"
          placeholder="Attribution (optional)"
          value={attrs.cite}
          autoSize
          onCommit={(value) => updateAttributes({ cite: value })}
          onEnter={() => focusAfterNode(editor, getPos)}
          onExitDown={() => focusAfterNode(editor, getPos)}
          onExitUp={() => {
            const pos = getPos();
            if (pos != null) editor.chain().focus().setTextSelection(pos + node.nodeSize - 1).run();
          }}
        />
      </figcaption>
    </NodeViewWrapper>
  );
}
