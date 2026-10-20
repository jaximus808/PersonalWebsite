// Everything the slash menu can insert, in menu order. Each item acts on the
// current selection after the "/query" text has been removed.

import type { ComponentType } from "react";
import type { Editor } from "@tiptap/react";

import {
  IconAnatomy,
  IconCallout,
  IconChecklist,
  IconCodeBlock,
  IconDivider,
  IconGallery,
  IconImage,
  IconList,
  IconListOrdered,
  IconMdx,
  IconPullQuote,
  IconQuote,
  IconTable,
  IconText,
  IconVideo,
} from "../icons";
import { insertTableAt } from "../blocks";
import { RAW_MDX } from "../nodes/CodeBlock";

export type BlockGroup = "Text" | "Media" | "Blocks";

export interface BlockItem {
  id: string;
  title: string;
  hint: string;
  group: BlockGroup;
  keywords: string[];
  icon: ComponentType<{ size?: number }>;
  /** The markdown shortcut that does the same, shown faintly on the right. */
  markdown?: string;
  /** A short glyph instead of an icon (headings). */
  glyph?: string;
  run(editor: Editor): void;
}

export const BLOCK_ITEMS: BlockItem[] = [
  {
    id: "text",
    title: "Text",
    hint: "A plain paragraph",
    group: "Text",
    keywords: ["paragraph", "p", "plain", "body"],
    icon: IconText,
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  ...([2, 3, 4] as const).map(
    (level): BlockItem => ({
      id: `h${level}`,
      title: `Heading ${level}`,
      hint: level === 2 ? "A section" : level === 3 ? "A subsection" : "A small heading",
      group: "Text",
      keywords: [`h${level}`, "heading", "title", "section"],
      icon: IconText,
      glyph: `H${level}`,
      markdown: "#".repeat(level),
      run: (editor) => editor.chain().focus().setHeading({ level }).run(),
    }),
  ),
  {
    id: "bullets",
    title: "Bulleted list",
    hint: "A simple list",
    group: "Text",
    keywords: ["ul", "bullet", "unordered", "list", "points"],
    icon: IconList,
    markdown: "-",
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "numbers",
    title: "Numbered list",
    hint: "Steps in order",
    group: "Text",
    keywords: ["ol", "ordered", "numbered", "steps", "list"],
    icon: IconListOrdered,
    markdown: "1.",
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "tasks",
    title: "Checklist",
    hint: "Items to tick off",
    group: "Text",
    keywords: ["todo", "task", "checkbox", "check", "list"],
    icon: IconChecklist,
    markdown: "[ ]",
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "quote",
    title: "Quote",
    hint: "A quoted passage",
    group: "Text",
    keywords: ["blockquote", "citation"],
    icon: IconQuote,
    markdown: ">",
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code",
    title: "Code",
    hint: "A highlighted code block",
    group: "Text",
    keywords: ["codeblock", "snippet", "pre", "fence", "program"],
    icon: IconCodeBlock,
    markdown: "```",
    run: (editor) => editor.chain().focus().setCodeBlock().run(),
  },
  {
    id: "image",
    title: "Image",
    hint: "Upload, drop or link one image",
    group: "Media",
    keywords: ["picture", "photo", "img", "screenshot", "figure"],
    icon: IconImage,
    run: (editor) => editor.chain().focus().insertFigure().run(),
  },
  {
    id: "gallery",
    title: "Gallery",
    hint: "Images side by side",
    group: "Media",
    keywords: ["images", "photos", "grid", "pictures", "album"],
    icon: IconGallery,
    run: (editor) => editor.chain().focus().insertGallery().run(),
  },
  {
    id: "video",
    title: "Video",
    hint: "YouTube or a video file",
    group: "Media",
    keywords: ["youtube", "movie", "clip", "mp4", "embed"],
    icon: IconVideo,
    run: (editor) => editor.chain().focus().insertVideo().run(),
  },
  {
    id: "anatomy",
    title: "Anatomy figure",
    hint: "Describe a visual; Claude builds it",
    group: "Blocks",
    keywords: ["diagram", "illustration", "isometric", "figure", "drawing", "visual", "explainer", "interactive"],
    icon: IconAnatomy,
    run: (editor) => editor.chain().focus().insertAnatomy().run(),
  },
  {
    id: "callout",
    title: "Callout",
    hint: "An aside or a note",
    group: "Blocks",
    keywords: ["aside", "note", "tip", "warning", "info", "update"],
    icon: IconCallout,
    run: (editor) => editor.chain().focus().setCallout().run(),
  },
  {
    id: "pullquote",
    title: "Pull quote",
    hint: "Lift one line out of the text",
    group: "Blocks",
    keywords: ["pullquote", "highlight", "emphasis", "big quote"],
    icon: IconPullQuote,
    run: (editor) => editor.chain().focus().setPullQuote().run(),
  },
  {
    id: "divider",
    title: "Divider",
    hint: "A quiet section break",
    group: "Blocks",
    keywords: ["hr", "rule", "separator", "break", "line"],
    icon: IconDivider,
    markdown: "---",
    run: (editor) => editor.chain().focus().insertDivider().run(),
  },
  {
    id: "table",
    title: "Table",
    hint: "Rows and columns",
    group: "Blocks",
    keywords: ["grid", "rows", "columns", "spreadsheet"],
    icon: IconTable,
    run: (editor) => insertTableAt(editor, 3, 3),
  },
  {
    id: "mdx",
    title: "Raw MDX",
    hint: "A component written as-is",
    group: "Blocks",
    keywords: ["jsx", "component", "embed", "html", "custom"],
    icon: IconMdx,
    run: (editor) => editor.chain().focus().setCodeBlock({ language: RAW_MDX }).run(),
  },
];

export const BLOCK_GROUPS: BlockGroup[] = ["Text", "Media", "Blocks"];

