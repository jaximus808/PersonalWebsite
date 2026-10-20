// Will the page actually build? Export is proven to produce valid MDX for
// every block the editor has, so this only matters for raw MDX blocks, which
// go onto the page exactly as typed. Three things break the site's build
// there, and all three are caught here, synchronously, so lint (and so the
// Checks panel and build-draft) can say so before anything is written:
//
// 1. Syntax: an unclosed tag or brace. The site's compile fails outright.
// 2. Unknown components: `<TandemBoardDemos />` compiles, then throws
//    "Expected component … to be defined" while the page prerenders.
// 3. Free variables: `{caption}` compiles, then throws a ReferenceError at
//    render time. Only the site's components and `props` are in scope (the
//    site strips import/export lines, so an `export const` defines nothing).
//
// compileMdxBody (async) is the last word: build-draft runs the real
// @mdx-js/mdx compile with the site's options before it writes anything.

import { compile } from "@mdx-js/mdx";
import type { Root } from "mdast";
import remarkGfm from "remark-gfm";

import { parseMdx } from "./import.ts";
import { SITE_COMPONENTS } from "./siteComponents.ts";

export type BodyIssue = { level: "error" | "warn"; message: string };

/** Names an MDX expression can use on the site without defining them. */
const SCOPE = new Set([
  // MDX passes the page's props in; `_components` is its own plumbing.
  "props",
  // ECMAScript globals.
  "undefined", "NaN", "Infinity", "globalThis", "Object", "Function", "Array", "Number", "parseFloat",
  "parseInt", "Boolean", "String", "Symbol", "Date", "Promise", "RegExp", "Error", "AggregateError",
  "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError", "JSON", "Math",
  "Intl", "ArrayBuffer", "SharedArrayBuffer", "DataView", "Atomics", "Uint8Array", "Int8Array",
  "Uint16Array", "Int16Array", "Uint32Array", "Int32Array", "Float32Array", "Float64Array",
  "Uint8ClampedArray", "BigUint64Array", "BigInt64Array", "Map", "BigInt", "Set", "WeakMap", "WeakSet",
  "WeakRef", "FinalizationRegistry", "Proxy", "Reflect", "Iterator", "decodeURI", "decodeURIComponent",
  "encodeURI", "encodeURIComponent", "isFinite", "isNaN",
  // Defined in both Node (the prerender) and browsers.
  "console", "URL", "URLSearchParams", "TextEncoder", "TextDecoder", "structuredClone", "queueMicrotask",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "atob", "btoa", "AbortController",
  "Blob", "Headers", "Request", "Response", "fetch", "crypto", "performance",
]);

// ---------------------------------------------------------------------------
// The sync check lint runs.

type MdNode = { type: string; name?: string | null; children?: MdNode[]; attributes?: MdAttr[]; data?: { estree?: unknown }; value?: unknown };
type MdAttr = { type: string; value?: unknown; data?: { estree?: unknown } };

/**
 * Problems with an exported body, given the raw MDX blocks it contains (their
 * text, in order) so a syntax error can be pinned to the block that has it.
 */
export function checkMdxBody(body: string, rawBlocks: string[], components: readonly string[] = SITE_COMPONENTS): BodyIssue[] {
  if (!rawBlocks.length) return [];
  let tree: Root;
  try {
    tree = parseMdx(body);
  } catch (err) {
    return [{ level: "error", message: syntaxMessage(err, rawBlocks) }];
  }

  const issues: BodyIssue[] = [];
  const known = new Set(components);
  const unknownComponents = new Set<string>();
  const freeNames = new Set<string>();
  let esm = false;

  const checkName = (name: string | null | undefined) => {
    if (!name) return; // <>…</> fragment
    // Lowercase names are HTML elements. `<Foo.Bar>` and `<foo.bar>` both
    // look up their first part in scope.
    const root = name.split(".")[0]!;
    if (!name.includes(".") && !/^[A-Z]/.test(name)) return;
    if (!known.has(root)) unknownComponents.add(name);
  };
  const checkEstree = (estree: unknown) => {
    if (!estree) return;
    for (const name of freeIdentifiers(estree, checkName)) {
      if (!SCOPE.has(name) && !known.has(name)) freeNames.add(name);
    }
  };

  const visit = (node: MdNode) => {
    switch (node.type) {
      case "mdxjsEsm":
        esm = true;
        return; // stripped by the site; nothing inside it runs
      case "mdxJsxFlowElement":
      case "mdxJsxTextElement":
        checkName(node.name);
        for (const attribute of node.attributes ?? []) {
          if (attribute.type === "mdxJsxExpressionAttribute") checkEstree(attribute.data?.estree);
          else if (attribute.value && typeof attribute.value === "object") {
            checkEstree((attribute.value as { data?: { estree?: unknown } }).data?.estree);
          }
        }
        break;
      case "mdxFlowExpression":
      case "mdxTextExpression":
        checkEstree(node.data?.estree);
        break;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree as unknown as MdNode);

  const available = [...components].sort().join(", ");
  for (const name of unknownComponents) {
    issues.push({
      level: "error",
      message: `<${name}> in a raw MDX block isn't one of the site's components (${available}). Check the spelling, or register it in components/content/MdxContent.tsx first.`,
    });
  }
  for (const name of freeNames) {
    issues.push({
      level: "error",
      message: `{${name}} in a raw MDX block isn't defined on the page, so it would fail to render. Only the site's components and props are in scope; write the value in directly.`,
    });
  }
  if (esm) {
    issues.push({
      level: "warn",
      message: "A raw MDX block has an import or export line. The site removes those, so they won't do anything there.",
    });
  }
  return issues;
}

/** Point a parse error at the raw block that has it, when one does on its own. */
function syntaxMessage(err: unknown, rawBlocks: string[]): string {
  for (const block of rawBlocks) {
    try {
      parseMdx(block);
    } catch (inner) {
      const { reason, line, column } = describe(inner);
      const where = line ? ` (line ${line}${column ? `:${column}` : ""} of the block)` : "";
      return `The raw MDX block starting ${snippet(block)} doesn't compile: ${reason}${where}.`;
    }
  }
  // Each block parses alone; together they don't (say, an opening tag in
  // one block and its closing tag in another, with a blank line between).
  const { reason, line, column } = describe(err);
  const where = line ? ` (line ${line}${column ? `:${column}` : ""} of the page's MDX; see the MDX tab)` : "";
  return `The page doesn't compile: ${reason}${where}.`;
}

function describe(err: unknown): { reason: string; line?: number; column?: number } {
  const e = err as { reason?: unknown; message?: unknown; line?: unknown; column?: unknown } | null;
  const reason = String(e?.reason ?? e?.message ?? err).replace(/\.$/, "");
  return {
    reason,
    line: typeof e?.line === "number" ? e.line : undefined,
    column: typeof e?.column === "number" ? e.column : undefined,
  };
}

function snippet(block: string): string {
  const first = block.trim().split("\n")[0] ?? "";
  return `"${first.length > 40 ? `${first.slice(0, 39)}…` : first}"`;
}

// ---------------------------------------------------------------------------
// Free identifiers in an expression's ESTree.

type EsNode = { type: string; [key: string]: unknown };

const isNode = (value: unknown): value is EsNode =>
  !!value && typeof value === "object" && typeof (value as { type?: unknown }).type === "string";

/**
 * Identifiers an expression reads but never declares. Scoping is deliberately
 * loose: a name declared anywhere in the expression (a parameter, a `const`,
 * a function name) counts as declared everywhere in it. That can miss a real
 * mistake but never flags working code, which is the side to err on for a
 * check that stops a build. JSX names inside the expression go to `onJsx`.
 */
export function freeIdentifiers(estree: unknown, onJsx: (name: string) => void = () => {}): Set<string> {
  const declared = new Set<string>();
  const used = new Set<string>();

  const bind = (pattern: unknown): void => {
    if (!isNode(pattern)) return;
    switch (pattern.type) {
      case "Identifier":
        declared.add(pattern.name as string);
        break;
      case "ObjectPattern":
        for (const property of (pattern.properties as EsNode[]) ?? []) {
          bind(property.type === "RestElement" ? property.argument : property.value);
        }
        break;
      case "ArrayPattern":
        for (const element of (pattern.elements as unknown[]) ?? []) bind(element);
        break;
      case "AssignmentPattern":
        bind(pattern.left);
        break;
      case "RestElement":
        bind(pattern.argument);
        break;
    }
  };

  const jsxName = (node: unknown): string | null => {
    if (!isNode(node)) return null;
    if (node.type === "JSXIdentifier") return node.name as string;
    if (node.type === "JSXMemberExpression") {
      const object = jsxName(node.object);
      const property = jsxName(node.property);
      return object && property ? `${object}.${property}` : null;
    }
    return null; // JSXNamespacedName: an attribute-style name, never a component
  };

  const walk = (node: unknown, parent: EsNode | null, key: string): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child, parent, key);
      return;
    }
    if (!isNode(node)) return;

    switch (node.type) {
      case "Identifier": {
        if (parent && !isReference(parent, key)) return;
        used.add(node.name as string);
        return;
      }
      case "VariableDeclarator":
        bind(node.id);
        break;
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        if (node.id) bind(node.id);
        for (const param of (node.params as unknown[]) ?? []) bind(param);
        break;
      case "ClassDeclaration":
      case "ClassExpression":
        if (node.id) bind(node.id);
        break;
      case "CatchClause":
        bind(node.param);
        break;
      case "UnaryExpression":
        // `typeof x` is safe whether or not x exists.
        if (node.operator === "typeof" && isNode(node.argument) && node.argument.type === "Identifier") return;
        break;
      case "JSXOpeningElement": {
        const name = jsxName(node.name);
        if (name) onJsx(name);
        break;
      }
      case "JSXIdentifier":
      case "JSXMemberExpression":
      case "JSXNamespacedName":
        return; // names are handled on the opening element; attributes aren't variables
    }
    for (const [childKey, child] of Object.entries(node)) {
      if (childKey === "type" || childKey === "loc" || childKey === "range" || childKey === "comments") continue;
      if (child && typeof child === "object") walk(child, node, childKey);
    }
  };

  walk(estree, null, "");
  for (const name of declared) used.delete(name);
  return used;
}

/** Whether an Identifier at parent[key] reads a variable (vs. naming a property, label, …). */
function isReference(parent: EsNode, key: string): boolean {
  switch (parent.type) {
    case "MemberExpression":
      return key !== "property" || parent.computed === true;
    case "Property":
    case "PropertyDefinition":
    case "MethodDefinition":
      // `{ a: b }` reads b; `{ a }` reads a (shorthand: key and value are both `a`).
      return key === "value" || (key === "key" && parent.computed === true);
    case "LabeledStatement":
    case "BreakStatement":
    case "ContinueStatement":
      return false;
    case "MetaProperty":
      return false;
    case "ExportSpecifier":
    case "ImportSpecifier":
    case "ImportDefaultSpecifier":
    case "ImportNamespaceSpecifier":
      return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// The real compile, for build-draft.

/**
 * Compile a body the way the site does (lib/content.ts: next-mdx-remote with
 * remark-gfm, which compiles to a function body and strips import/export).
 * Returns null when it compiles, else a one-line reason with its position.
 */
export async function compileMdxBody(body: string): Promise<string | null> {
  try {
    await compile(body, { outputFormat: "function-body", remarkPlugins: [remarkGfm, remarkStripEsm] });
    return null;
  } catch (err) {
    const { reason, line, column } = describe(err);
    return line ? `line ${line}${column ? `:${column}` : ""}: ${reason}` : reason;
  }
}

/** next-mdx-remote's removeImportsExportsPlugin: drop ESM before compiling. */
function remarkStripEsm() {
  return (tree: Root) => {
    tree.children = tree.children.filter((node) => (node.type as string) !== "mdxjsEsm");
  };
}
