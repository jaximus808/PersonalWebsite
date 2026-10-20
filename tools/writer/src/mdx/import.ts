// A site .mdx file -> a draft (meta + TipTap JSON), the inverse of export.ts.
//
// Everything the editor has a block for maps onto that block. Anything it
// can't represent faithfully (an embed like <TandemBoardDemo />, a component
// with props the editor has no field for, inline JSX, footnotes, ESM) becomes
// a raw-MDX code block holding the original source, which export writes back
// untouched. Nothing is dropped; at worst it's shown as source.

import type { JSONContent } from "@tiptap/core";
import type { Nodes, PhrasingContent, Root, RootContent } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";

import type { DraftMeta, Fit, Kind, Ratio } from "../shared/types.ts";
import { yamlToFrontmatter } from "./frontmatter.ts";
import { RAW_MDX_LANGUAGE, paragraph, text, type DraftMetaWithExtra } from "./nodes.ts";
import { diagramId, fromSitePath } from "./paths.ts";

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter, ["yaml"]).use(remarkGfm);

/** Parse an MDX body (no frontmatter handling beyond skipping it) to mdast. */
export function parseMdx(source: string): Root {
  return parser.parse(source) as Root;
}

export interface ImportResult {
  meta: DraftMeta;
  doc: JSONContent;
  assets: string[];
}

export function importMdx(input: string, opts: { kind: Kind; slug: string; now: string }): ImportResult {
  const ctx = { kind: opts.kind, slug: opts.slug };
  // Raw blocks are sliced out of the source, so settle line endings first.
  const source = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  let tree: Root;
  try {
    tree = parseMdx(source);
  } catch (err) {
    // micromark's messages carry a line:column; keep them.
    throw new Error(`The MDX doesn't parse: ${err instanceof Error ? err.message : String(err)}`);
  }

  const children = tree.children.slice();
  let yaml = "";
  if (children[0]?.type === "yaml") yaml = (children.shift() as { value: string }).value;
  const front = yamlToFrontmatter(yaml, ctx);

  const converter = new Converter(source, ctx, tree);
  const content = converter.blocks(children);
  const meta: DraftMetaWithExtra = {
    kind: opts.kind,
    slug: opts.slug,
    ...front.meta,
    createdAt: opts.now,
    updatedAt: opts.now,
  };
  if (Object.keys(front.extra).length) meta.extra = front.extra;

  return {
    meta,
    doc: { type: "doc", content: content.length ? content : [paragraph()] },
    assets: unique([...front.assets, ...converter.assets]),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

// ---------------------------------------------------------------------------

type Mark = NonNullable<JSONContent["marks"]>[number];

/** mdx JSX nodes, typed loosely (their types come from mdast-util-mdx-jsx). */
interface JsxNode {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name: string | null;
  attributes: JsxAttributeNode[];
  children: Nodes[];
  position?: Nodes["position"];
}
type JsxAttributeNode =
  | { type: "mdxJsxAttribute"; name: string; value: null | string | { type: "mdxJsxAttributeValueExpression"; value: string; data?: { estree?: unknown } } }
  | { type: "mdxJsxExpressionAttribute"; value: string };

/** An attribute's value, when it's something the writer can store. */
type AttrValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "strings"; value: string[] }
  | { kind: "other" };

const RATIOS: Ratio[] = ["standard", "wide", "square", "tall"];
const FITS: Fit[] = ["contain", "cover"];

class Converter {
  readonly assets: string[] = [];
  private readonly definitions = new Map<string, string>();

  constructor(
    private readonly source: string,
    private readonly ctx: { kind: Kind; slug: string },
    tree: Root,
  ) {
    const collect = (node: Nodes) => {
      if (node.type === "definition") this.definitions.set(node.identifier, node.url);
      if ("children" in node) (node.children as Nodes[]).forEach(collect);
    };
    collect(tree);
  }

  // ----- blocks -------------------------------------------------------------

  blocks(nodes: RootContent[] | Nodes[]): JSONContent[] {
    const out: JSONContent[] = [];
    for (const node of nodes as Nodes[]) {
      const converted = this.block(node);
      if (converted) out.push(converted);
    }
    return out;
  }

  private block(node: Nodes): JSONContent | null {
    switch (node.type) {
      case "paragraph":
        return this.paragraph(node);
      case "heading": {
        const content = this.inline(node.children);
        if (!content) return this.raw(node);
        return { type: "heading", attrs: { level: Math.min(4, Math.max(2, node.depth)) }, ...(content.length ? { content } : {}) };
      }
      case "thematicBreak":
        return { type: "divider", attrs: { label: "" } };
      case "blockquote":
        return { type: "blockquote", content: this.nonEmpty(this.blocks(node.children)) };
      case "list":
        return this.list(node) ?? this.raw(node);
      case "code":
        return {
          type: "codeBlock",
          // A fence labelled with the passthrough language would turn into
          // page content in the editor; it was written as a sample, so it
          // stays one.
          attrs: { language: node.lang === RAW_MDX_LANGUAGE ? "mdx" : node.lang || null },
          ...(node.value ? { content: [text(node.value)] } : {}),
        };
      case "table":
        return this.table(node) ?? this.raw(node);
      case "definition":
      case "yaml":
        return null; // definitions are folded into their links
      default:
        if (node.type === ("mdxJsxFlowElement" as Nodes["type"])) return this.component(node as unknown as JsxNode) ?? this.raw(node);
        return this.raw(node);
    }
  }

  private nonEmpty(content: JSONContent[]): JSONContent[] {
    return content.length ? content : [paragraph()];
  }

  /** The node's original source, kept verbatim in a raw-MDX code block. */
  private raw(node: Nodes): JSONContent | null {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return null;
    // Inside a list or quote, continuation lines carry the container's
    // indentation or "> ". Strip whatever precedes the node on its first line
    // from the others, so export can put the right prefix back.
    const lineStart = this.source.lastIndexOf("\n", start - 1) + 1;
    const prefix = this.source.slice(lineStart, start);
    const lines = this.source.slice(start, end).split("\n");
    const loose = prefix.replace(/[ \t]+$/, "");
    const body = lines
      .map((line, index) => {
        if (index === 0 || !prefix) return line;
        if (line.startsWith(prefix)) return line.slice(prefix.length);
        if (loose && line.startsWith(loose)) return line.slice(loose.length); // blank line inside a quote: ">"
        if (!/\S/.test(prefix)) return line.replace(new RegExp(`^ {0,${prefix.length}}`), "");
        return line;
      })
      .join("\n")
      .replace(/\s+$/, "");
    if (!body) return null;
    return { type: "codeBlock", attrs: { language: RAW_MDX_LANGUAGE }, content: [text(body)] };
  }

  private paragraph(node: Extract<Nodes, { type: "paragraph" }>): JSONContent | null {
    const meaningful = node.children.filter((child) => !(child.type === "text" && !child.value.trim()));
    // A markdown image alone on its line: the site renders it as a Figure
    // with the alt text as caption (see components/content/MdxContent.tsx).
    if (meaningful.length === 1 && meaningful[0]!.type === "image") {
      const image = meaningful[0]!;
      const alt = image.alt ?? "";
      return {
        type: "figure",
        attrs: { src: this.src(image.url), caption: alt, alt, ratio: "standard", fit: "contain" },
      };
    }
    // <PullQuote>text</PullQuote> written on one line parses as inline JSX.
    if (meaningful.length === 1 && (meaningful[0]!.type as string) === "mdxJsxTextElement") {
      const element = meaningful[0] as unknown as JsxNode;
      if (element.name === "PullQuote") return this.pullQuote(element, element.children as PhrasingContent[]) ?? this.raw(node);
    }
    const content = this.inline(node.children);
    if (!content) return this.raw(node);
    return content.length ? paragraph(content) : null;
  }

  private list(node: Extract<Nodes, { type: "list" }>): JSONContent | null {
    const checks = node.children.map((item) => item.checked);
    const task = checks.every((c) => c === true || c === false);
    if (!task && checks.some((c) => c === true || c === false)) return null; // a half-checklist: keep as source
    if (task && node.ordered) return null;

    const items = node.children.map((item) => {
      const content = this.blocks(item.children);
      // TipTap list items start with a paragraph.
      if (content[0]?.type !== "paragraph") content.unshift(paragraph());
      return task
        ? { type: "taskItem", attrs: { checked: item.checked === true }, content }
        : { type: "listItem", content };
    });
    if (task) return { type: "taskList", content: items };
    if (node.ordered) return { type: "orderedList", attrs: { start: node.start ?? 1 }, content: items };
    return { type: "bulletList", content: items };
  }

  private table(node: Extract<Nodes, { type: "table" }>): JSONContent | null {
    const width = node.children.reduce((max, row) => Math.max(max, row.children.length), node.align?.length ?? 0);
    const rows: JSONContent[] = [];
    for (const [index, row] of node.children.entries()) {
      const cells: JSONContent[] = [];
      for (let i = 0; i < width; i++) {
        const cell = row.children[i];
        const content = cell ? this.inline(cell.children) : [];
        if (!content) return null;
        cells.push({
          type: index === 0 ? "tableHeader" : "tableCell",
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          // Several paragraphs in a cell were written with <br /> between
          // them; they come back as one paragraph with line breaks, which
          // looks the same.
          content: [paragraph(content)],
        });
      }
      rows.push({ type: "tableRow", content: cells });
    }
    return { type: "table", content: rows };
  }

  // ----- components --------------------------------------------------------

  private component(node: JsxNode): JSONContent | null {
    const attrs = this.attributes(node);
    if (!attrs) return null;
    const hasChildren = node.children.length > 0;
    const only = (...names: string[]) => [...attrs.keys()].every((name) => names.includes(name));
    const str = (name: string): string | null => {
      const value = attrs.get(name);
      if (value === undefined) return "";
      return value.kind === "string" ? value.value : null;
    };

    switch (node.name) {
      case "Figure": {
        const src = str("src"), caption = str("caption"), alt = str("alt"), ratio = str("ratio"), fit = str("fit");
        if (hasChildren || !only("src", "caption", "alt", "ratio", "fit") || !src || caption === null || alt === null) return null;
        if (ratio === null || fit === null || (ratio && !RATIOS.includes(ratio as Ratio)) || (fit && !FITS.includes(fit as Fit))) return null;
        return { type: "figure", attrs: { src: this.src(src), caption, alt, ratio: ratio || "standard", fit: fit || "contain" } };
      }
      case "Gallery": {
        const images = attrs.get("images");
        const caption = str("caption");
        const columns = attrs.get("columns");
        if (hasChildren || !only("images", "caption", "columns") || images?.kind !== "strings" || caption === null) return null;
        if (columns && !(columns.kind === "number" && (columns.value === 2 || columns.value === 3))) return null;
        return {
          type: "gallery",
          attrs: { images: images.value.map((src) => this.src(src)), caption, columns: columns ? (columns as { value: 2 | 3 }).value : null },
        };
      }
      case "Video": {
        const youtube = str("youtube"), src = str("src"), poster = str("poster"), title = str("title"), caption = str("caption");
        const loop = attrs.get("loop");
        if (hasChildren || !only("youtube", "src", "poster", "loop", "title", "caption")) return null;
        if (youtube === null || src === null || poster === null || title === null || caption === null) return null;
        if (loop && loop.kind !== "boolean") return null;
        if (!youtube && !src) return null;
        return {
          type: "video",
          attrs: {
            youtube: youtube || null,
            src: src ? this.src(src) : null,
            poster: poster ? this.src(poster) : null,
            loop: loop?.kind === "boolean" ? loop.value : false,
            caption,
            title,
          },
        };
      }
      case "Callout": {
        const title = str("title");
        if (!only("title") || title === null) return null;
        return { type: "callout", attrs: { title }, content: this.nonEmpty(this.blocks(node.children)) };
      }
      case "PullQuote": {
        const children = node.children;
        if (children.length === 0) return this.pullQuote(node, []);
        if (children.length === 1 && children[0]!.type === "paragraph") return this.pullQuote(node, children[0]!.children);
        return null;
      }
      case "Divider": {
        const label = str("label");
        if (hasChildren || !only("label") || label === null) return null;
        return { type: "divider", attrs: { label } };
      }
      case "Diagram": {
        const src = str("src"), title = str("title"), caption = str("caption"), size = str("size");
        if (hasChildren || !only("src", "title", "caption", "size") || !src || title === null || caption === null) return null;
        const id = diagramId(src, this.ctx);
        if (!id || (size !== "" && size !== "figure" && size !== "hero")) return null;
        // An explicit size="figure" is the default, so it isn't written back.
        return { type: "anatomy", attrs: { id, title, prompt: "", caption, size: size || "figure" } };
      }
      default:
        return null;
    }
  }

  private pullQuote(node: JsxNode, children: PhrasingContent[]): JSONContent | null {
    const attrs = this.attributes(node);
    const cite = attrs?.get("cite");
    if (!attrs || [...attrs.keys()].some((name) => name !== "cite") || (cite && cite.kind !== "string")) return null;
    const content = this.inline(children);
    if (!content) return null;
    return { type: "pullQuote", attrs: { cite: cite?.kind === "string" ? cite.value : "" }, ...(content.length ? { content } : {}) };
  }

  /** Attribute name -> value, or null when there's a {...spread}. */
  private attributes(node: JsxNode): Map<string, AttrValue> | null {
    const out = new Map<string, AttrValue>();
    for (const attribute of node.attributes) {
      if (attribute.type !== "mdxJsxAttribute") return null;
      const { value } = attribute;
      if (value === null) out.set(attribute.name, { kind: "boolean", value: true });
      else if (typeof value === "string") out.set(attribute.name, { kind: "string", value });
      else out.set(attribute.name, literal(value.data?.estree));
    }
    return out;
  }

  private src(value: string): string {
    const { src, asset } = fromSitePath(value, this.ctx);
    if (asset) this.assets.push(asset);
    return src;
  }

  // ----- inline -------------------------------------------------------------

  /** Phrasing content -> TipTap inline nodes, or null if something can't be represented. */
  private inline(nodes: PhrasingContent[] | Nodes[], marks: Mark[] = []): JSONContent[] | null {
    const out: JSONContent[] = [];
    for (const node of nodes as Nodes[]) {
      const converted = this.phrasing(node, marks);
      if (!converted) return null;
      out.push(...converted);
    }
    return out;
  }

  private phrasing(node: Nodes, marks: Mark[]): JSONContent[] | null {
    const withMark = (children: Nodes[], mark: Mark) =>
      this.inline(children, marks.some((m) => m.type === mark.type) ? marks : [...marks, mark]);

    switch (node.type) {
      case "text": {
        // A soft line break inside a paragraph shows as a space.
        const value = node.value.replace(/[ \t]*\r?\n[ \t]*/g, " ");
        return value ? [text(value, marks)] : [];
      }
      case "strong":
        return withMark(node.children, { type: "bold" });
      case "emphasis":
        return withMark(node.children, { type: "italic" });
      case "delete":
        return withMark(node.children, { type: "strike" });
      case "inlineCode":
        return node.value ? [text(node.value, [...marks, { type: "code" }])] : [];
      case "break":
        return [{ type: "hardBreak" }];
      case "link":
        return withMark(node.children, { type: "link", attrs: { href: node.url } });
      case "linkReference": {
        const href = this.definitions.get(node.identifier);
        return href === undefined ? null : withMark(node.children, { type: "link", attrs: { href } });
      }
      default: {
        if ((node.type as string) !== "mdxJsxTextElement") return null;
        // Inline HTML-ish JSX the exporter itself writes when a markdown
        // delimiter wouldn't work in place.
        const element = node as unknown as JsxNode;
        if (element.attributes.length) return null;
        switch (element.name) {
          case "strong":
          case "b":
            return withMark(element.children, { type: "bold" });
          case "em":
          case "i":
            return withMark(element.children, { type: "italic" });
          case "del":
          case "s":
            return withMark(element.children, { type: "strike" });
          case "br":
            return element.children.length ? null : [{ type: "hardBreak" }];
          case "code": {
            // Written for code in spots a backtick span can't go (see inline.ts).
            if (!element.children.every((child) => child.type === "text")) return null;
            const value = element.children.map((child) => (child as { value: string }).value).join("");
            return value ? [text(value, [...marks, { type: "code" }])] : [];
          }
          default:
            return null;
        }
      }
    }
  }
}

/** Evaluate the few expression shapes props use: literals and arrays of strings. */
function literal(estree: unknown): AttrValue {
  type Expr = { type: string; value?: unknown; elements?: (Expr | null)[]; expressions?: unknown[]; quasis?: { value: { cooked?: string | null } }[] };
  const program = estree as { body?: { type: string; expression?: Expr }[] } | undefined;
  const statement = program?.body?.length === 1 ? program.body[0] : undefined;
  const expr = statement?.type === "ExpressionStatement" ? statement.expression : undefined;
  if (!expr) return { kind: "other" };
  const scalar = (e: Expr | null): AttrValue => {
    if (!e) return { kind: "other" };
    if (e.type === "Literal") {
      if (typeof e.value === "string") return { kind: "string", value: e.value };
      if (typeof e.value === "number") return { kind: "number", value: e.value };
      if (typeof e.value === "boolean") return { kind: "boolean", value: e.value };
    }
    if (e.type === "TemplateLiteral" && !e.expressions?.length && e.quasis?.length === 1) {
      const cooked = e.quasis[0]!.value.cooked;
      if (typeof cooked === "string") return { kind: "string", value: cooked };
    }
    return { kind: "other" };
  };
  if (expr.type === "ArrayExpression") {
    const values = (expr.elements ?? []).map(scalar);
    return values.every((v) => v.kind === "string")
      ? { kind: "strings", value: values.map((v) => (v as { value: string }).value) }
      : { kind: "other" };
  }
  return scalar(expr);
}

