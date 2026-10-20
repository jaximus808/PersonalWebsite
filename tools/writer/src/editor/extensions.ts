// The editor's schema and behaviour, in one list. Node and mark names come
// from the contract (src/shared/types.ts); the MDX layer depends on them.

import { Extension, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Typography } from "@tiptap/extension-typography";
import type { Node as PMNode } from "@tiptap/pm/model";

import { NODE } from "../shared/types";
import type { EnvGetter } from "./env";
import { Anatomy } from "./nodes/Anatomy";
import { Callout } from "./nodes/Callout";
import { CodeBlock } from "./nodes/CodeBlock";
import { Divider } from "./nodes/Divider";
import { Figure } from "./nodes/Figure";
import { Gallery } from "./nodes/Gallery";
import { PullQuote } from "./nodes/PullQuote";
import { Video } from "./nodes/Video";
import { createAnatomyIdPlugin } from "./plugins/anatomyIds";
import { WriterKeymap } from "./plugins/keymap";
import { createPasteExtension } from "./plugins/paste";
import { createUploadPlaceholderPlugin } from "./plugins/uploads";
import { SlashCommand } from "./slash/extension";

const ACCENT = "#a3cbff";

/**
 * Placeholder text by node type only. The extension calls this while it
 * decorates a *new* state but only hands over `editor`, whose state is still
 * the previous one, so resolving `pos` there reads the wrong document (and
 * throws when the document just grew, e.g. inserting a table at the end).
 * Wording that depends on where the paragraph sits (list item, quote,
 * callout, table cell) is chosen in editor.css from the live DOM instead.
 */
function placeholderFor({ node, editor }: { node: PMNode; editor: { isEmpty: boolean } }): string {
  switch (node.type.name) {
    case NODE.heading:
      return `Heading ${node.attrs.level as number}`;
    case NODE.paragraph:
      return editor.isEmpty ? "Start writing, or press / for blocks" : "Press / for blocks";
    default:
      return "";
  }
}

// Table cells hold one line of text: GFM tables can't hold lists or images.
const SingleLineCell = TableCell.extend({ content: "paragraph" });
const SingleLineHeader = TableHeader.extend({ content: "paragraph" });

/** Anatomy ids and upload placeholders, which need ProseMirror plugins. */
const WriterPlugins = Extension.create({
  name: "writerPlugins",
  addProseMirrorPlugins() {
    const seen = this.editor.storage.anatomy?.seen ?? new Set<string>();
    return [createAnatomyIdPlugin(seen), createUploadPlaceholderPlugin()];
  },
});

export function buildExtensions(getEnv: EnvGetter): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      // Replaced by the divider node and the highlighted code block below.
      horizontalRule: false,
      codeBlock: false,
      // No underline in the contract: the site has no way to write it.
      underline: false,
      link: {
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        enableClickSelection: true,
        defaultProtocol: "https",
        HTMLAttributes: { target: null, rel: null, class: null },
      },
      dropcursor: { color: ACCENT, width: 2, class: "wr-dropcursor" },
    }),
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: true,
      placeholder: placeholderFor,
    }),
    // House style is plain punctuation (no curly quotes or em dashes appear
    // anywhere in content/), and in technical prose "->", "!=", "1/2" and
    // "2x3" usually mean themselves. Only unambiguous symbols convert.
    Typography.configure({
      emDash: false,
      ellipsis: false,
      openDoubleQuote: false,
      closeDoubleQuote: false,
      openSingleQuote: false,
      closeSingleQuote: false,
      leftArrow: false,
      rightArrow: false,
      copyright: false,
      registeredTrademark: false,
      servicemark: false,
      oneHalf: false,
      oneQuarter: false,
      threeQuarters: false,
      notEqual: false,
      laquo: false,
      raquo: false,
      multiplication: false,
      superscriptTwo: false,
      superscriptThree: false,
    }),
    CharacterCount,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false, renderWrapper: true, allowTableNodeSelection: true }),
    TableRow,
    SingleLineHeader,
    SingleLineCell,
    CodeBlock,
    Figure,
    Gallery,
    Video,
    Callout,
    PullQuote,
    Divider,
    Anatomy,
    WriterKeymap,
    SlashCommand,
    createPasteExtension(getEnv),
    WriterPlugins,
  ];
}
