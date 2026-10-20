// Compiles the exported MDX body in the browser, the way the site does at
// build time: @mdx-js/mdx with remark-gfm, plus syntax highlighting with the
// same highlight.js classes rehype-highlight produces (lowlight is the engine
// under both), so prose.css colours the preview's code like the site's.

import { evaluate } from "@mdx-js/mdx";
import type { Element, ElementContent, Root, RootContent } from "hast";
import { common, createLowlight } from "lowlight";
import type { ComponentType } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";

const lowlight = createLowlight(common);

function textContent(node: ElementContent | RootContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return (node.children as ElementContent[]).map(textContent).join("");
  return "";
}

function languageOf(code: Element): string | null {
  const className: unknown = code.properties?.className;
  const classes = Array.isArray(className)
    ? className.map(String)
    : typeof className === "string"
      ? className.split(" ")
      : [];
  for (const name of classes) {
    if (name.startsWith("language-")) return name.slice("language-".length);
  }
  return null;
}

/** A tiny rehype-highlight: highlight <pre><code class="language-x"> blocks. */
function rehypeLowlight() {
  return (tree: Root) => {
    const visit = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (child.tagName === "pre") {
          const code = child.children.find(
            (inner): inner is Element => inner.type === "element" && inner.tagName === "code",
          );
          const language = code ? languageOf(code) : null;
          if (code && language && lowlight.registered(language)) {
            try {
              const result = lowlight.highlight(language, textContent(code));
              code.children = result.children as ElementContent[];
              const existing = Array.isArray(code.properties.className) ? code.properties.className : [];
              code.properties.className = [...existing.map(String), "hljs"];
            } catch {
              // Leave the block plain; a highlighting bug shouldn't hide the code.
            }
          }
          continue;
        }
        visit(child);
      }
    };
    visit(tree);
  };
}

export type CompiledMdx = ComponentType<{ components?: Record<string, unknown> }>;

export async function compileMdx(body: string): Promise<CompiledMdx> {
  const module = await evaluate(body, {
    ...(runtime as unknown as { Fragment: unknown; jsx: unknown; jsxs: unknown }),
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeLowlight],
  } as Parameters<typeof evaluate>[1]);
  return module.default as unknown as CompiledMdx;
}

/** Capitalised JSX names the body uses, so unknown embeds get a placeholder. */
export function jsxNames(body: string): string[] {
  const names = new Set<string>();
  for (const match of body.matchAll(/<([A-Z][\w]*)[\s/>]/g)) names.add(match[1]);
  return [...names];
}

/** "1:4: Unexpected character…" from a VFileMessage-ish error. */
export function describeCompileError(error: unknown): string {
  if (error && typeof error === "object") {
    const { reason, line, column, message } = error as {
      reason?: string;
      line?: number;
      column?: number;
      message?: string;
    };
    const where = typeof line === "number" ? `Line ${line}${typeof column === "number" ? `:${column}` : ""}: ` : "";
    return `${where}${reason ?? message ?? String(error)}`;
  }
  return String(error);
}
