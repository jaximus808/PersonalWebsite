// Test harness: compile MDX the way the site does and "render" it into a plain
// tree, with stub components that just record their props. Comparing these
// trees is how the tests decide two MDX sources show the same page.

import { compile, evaluate } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

/** The site's own plugin (lib/content.ts): images alone on a line leave their <p>. */
export function remarkUnwrapImages() {
  type Node = { type: string; value?: string; children?: Node[] };
  return (tree: Node) => {
    const walk = (node: Node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child.type !== "paragraph") {
          walk(child);
          return child;
        }
        const kids = (child.children ?? []).filter((kid) => !(kid.type === "text" && !kid.value?.trim()));
        return kids.length === 1 && kids[0]!.type === "image" ? kids[0]! : child;
      });
    };
    walk(tree);
  };
}

const plugins = { remarkPlugins: [remarkGfm, remarkUnwrapImages] };

/** Strip frontmatter the way gray-matter does before the site compiles a body. */
export function bodyOf(source: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  return match ? source.slice(match[0].length) : source;
}

export async function compileBody(body: string): Promise<string> {
  return String(await compile(body, plugins));
}

// ---------------------------------------------------------------------------

/** A rendered node: an element (HTML tag or component name) or a string. */
export type RNode = string | { name: string; props: Record<string, unknown>; children: RNode[] };

const FRAGMENT = Symbol("Fragment");
type Raw = { type: unknown; props: Record<string, unknown> };
const element = (type: unknown, props: Record<string, unknown>): Raw => ({ type, props });

// Stubs are identified by name; `img` and `hr` render as Figure and Divider on
// the site (components/content/MdxContent.tsx), so the stubs do the same.
function stub(name: string) {
  const fn = () => null;
  Object.defineProperty(fn, "stubName", { value: name });
  return fn;
}
const imgStub = stub("img");
const hrStub = stub("hr");

export async function render(body: string): Promise<RNode[]> {
  const runtime = { Fragment: FRAGMENT, jsx: element, jsxs: element } as unknown as Parameters<typeof evaluate>[1];
  const { default: Content } = await evaluate(body, { ...runtime, ...plugins, development: false });
  const components: Record<string, unknown> = { img: imgStub, hr: hrStub };
  for (const match of body.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) components[match[1]!] = stub(match[1]!);
  const tree = (Content as unknown as (props: unknown) => unknown)({ components });
  return normalize(toRNodes(tree));
}

function toRNodes(value: unknown): RNode[] {
  if (value === null || value === undefined || typeof value === "boolean") return [];
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(toRNodes);
  const { type, props } = value as Raw;
  const { children, ...rest } = props ?? {};
  const kids = toRNodes(children);
  if (type === FRAGMENT) return kids;
  const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  if (type === imgStub) {
    const alt = typeof rest.alt === "string" ? rest.alt : undefined;
    return [{ name: "Figure", props: dropUndefined({ src: rest.src, caption: alt || undefined, alt }), children: [] }];
  }
  if (type === hrStub) return [{ name: "Divider", props: {}, children: [] }];
  const name =
    typeof type === "string" ? type : ((type as { stubName?: string }).stubName ?? (type as { name?: string }).name ?? "?");
  return [{ name, props: clean, children: kids }];
}

function dropUndefined(props: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined));
}

const BLOCK = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "blockquote", "pre", "table", "thead", "tbody", "tr", "td", "th"]);
const isBlock = (node: RNode) => typeof node !== "string" && (BLOCK.has(node.name) || /^[A-Z]/.test(node.name));

/**
 * Normalizations that don't change what a reader sees:
 * - whitespace collapses (HTML does it) and is trimmed next to blocks;
 * - a tight list item's text is the same as a loose item's <p> (<li>x</li>
 *   vs <li><p>x</p></li>), so loose inline runs in an <li> get wrapped in a p.
 */
export function normalize(nodes: RNode[], inBlock = true): RNode[] {
  const out: RNode[] = [];
  for (const node of nodes) {
    if (typeof node === "string") {
      const value = node.replace(/\s+/g, " ");
      const prev = out[out.length - 1];
      if (typeof prev === "string") out[out.length - 1] = prev + value;
      else out.push(value);
      continue;
    }
    let children = normalize(node.children, isBlock(node) || node.name === "li");
    if (node.name === "li") children = wrapLooseInline(children);
    out.push({ ...node, children });
  }
  // Trim strings that touch a block, or the edges of a block's content.
  return out
    .map((node, i) => {
      if (typeof node !== "string") return node;
      let value = node;
      const prev = out[i - 1];
      const next = out[i + 1];
      if ((i === 0 && inBlock) || (prev !== undefined && isBlock(prev))) value = value.replace(/^ /, "");
      if ((i === out.length - 1 && inBlock) || (next !== undefined && isBlock(next))) value = value.replace(/ $/, "");
      return value;
    })
    .filter((node) => node !== "");
}

function wrapLooseInline(children: RNode[]): RNode[] {
  const out: RNode[] = [];
  let run: RNode[] = [];
  const flush = () => {
    if (run.some((n) => typeof n !== "string" || n.trim())) out.push({ name: "p", props: {}, children: normalize(run) });
    run = [];
  };
  for (const child of children) {
    // The task checkbox belongs with the item's first line either way.
    if (typeof child === "string" || (!isBlock(child) && child.name !== "input")) run.push(child);
    else if (typeof child !== "string" && child.name === "input") out.push(child);
    else {
      flush();
      out.push(child);
    }
  }
  flush();
  return out;
}

/** Every stub component in the tree, in order, with its props. */
export function componentsIn(nodes: RNode[]): { name: string; props: Record<string, unknown> }[] {
  const out: { name: string; props: Record<string, unknown> }[] = [];
  const walk = (list: RNode[]) => {
    for (const node of list) {
      if (typeof node === "string") continue;
      if (/^[A-Z]/.test(node.name)) out.push({ name: node.name, props: node.props });
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/**
 * Text with its formatting, as runs: one entry per maximal run of characters
 * sharing the same marks, blocks separated by "¶". Marks on whitespace are
 * ignored and whitespace collapses, as in the browser.
 */
export function runsOfRender(nodes: RNode[]): string[] {
  const chars: { ch: string; marks: string }[] = [];
  const push = (value: string, marks: string[]) => {
    for (const ch of value) chars.push({ ch, marks: /\s/.test(ch) ? "" : [...marks].sort().join(",") });
  };
  const MARKS: Record<string, string> = { strong: "bold", em: "italic", del: "strike", code: "code" };
  const walk = (list: RNode[], marks: string[], inPre: boolean) => {
    for (const node of list) {
      if (typeof node === "string") {
        push(node, marks);
        continue;
      }
      if (node.name === "br") {
        push(" ", marks);
        continue;
      }
      if (/^[A-Z]/.test(node.name) && node.name !== "Callout" && node.name !== "PullQuote") {
        push(" ¶ ", []);
        continue;
      }
      const block = BLOCK.has(node.name) || /^[A-Z]/.test(node.name);
      if (block) push(" ¶ ", []);
      let next = marks;
      // micromark percent-encodes hrefs; the browser reads both the same.
      if (node.name === "a") next = [...marks, `link:${decodeURI(String(node.props.href))}`];
      else if (MARKS[node.name] && !(node.name === "code" && inPre)) next = [...marks, MARKS[node.name]!];
      walk(node.children, next, inPre || node.name === "pre");
      if (block) push(" ¶ ", []);
    }
  };
  walk(nodes, [], false);
  return toRuns(chars);
}

export function toRuns(chars: { ch: string; marks: string }[]): string[] {
  // Collapse whitespace and paragraph markers.
  let text = "";
  const marks: string[] = [];
  for (const { ch, marks: m } of chars) {
    const isSpace = /\s/.test(ch);
    if (isSpace && (text === "" || text.endsWith(" ") || text.endsWith("¶"))) continue;
    if (ch === "¶") {
      text = text.replace(/ $/, "");
      marks.length = text.length;
      if (text === "" || text.endsWith("¶")) continue;
    }
    text += isSpace ? " " : ch;
    marks.push(isSpace ? "" : m);
  }
  text = text.replace(/[ ¶]+$/, "");
  const runs: string[] = [];
  let current = "";
  let currentMarks: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const m: string = ch === " " || ch === "¶" ? currentMarks ?? "" : marks[i]!;
    if (m !== currentMarks && current) {
      runs.push(`${currentMarks ? `[${currentMarks}]` : ""}${current}`);
      current = "";
    }
    currentMarks = m;
    current += ch;
  }
  if (current) runs.push(`${currentMarks ? `[${currentMarks}]` : ""}${current}`);
  return runs;
}
