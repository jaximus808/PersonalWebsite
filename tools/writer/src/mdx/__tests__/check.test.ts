// The build-safety pieces lint and build-draft lean on: the site's component
// list (kept in step with MdxContent.tsx), the site-style compile, the free
// variable scan, and export staying linear on absurd input.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { freeIdentifiers } from "../check";
import { parseMdx } from "../import";
import { compileMdxBody, componentNamesFromMdxContent, docToMdxBody, SITE_COMPONENTS } from "../index";
import { code, doc, t, table, td, th, tr } from "./docTools";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

describe("SITE_COMPONENTS", () => {
  it("matches the component map in components/content/MdxContent.tsx", () => {
    const source = fs.readFileSync(path.join(repoRoot, "components/content/MdxContent.tsx"), "utf8");
    expect([...(componentNamesFromMdxContent(source) ?? [])].sort()).toEqual([...SITE_COMPONENTS].sort());
  });

  it("reads keys in any of the shapes a map entry takes, and ignores comments", () => {
    const source = `
      // Not a key: { Bogus }
      const components = {
        Figure,
        Gallery: Gallery,
        /* Commented, } */
        Video: (props) => <Video {...props} />,
        Embed() { return <div>{label}</div>; },
        a({ href }) { return <a href={href} />; },
        pre: Pre,
      };
      const Other = { Nope };
    `;
    expect(componentNamesFromMdxContent(source)).toEqual(["Figure", "Gallery", "Video", "Embed"]);
    expect(componentNamesFromMdxContent("export default {}")).toBeNull();
  });
});

describe("compileMdxBody", () => {
  it("passes what the site compiles", async () => {
    expect(await compileMdxBody("Hello *there*.\n\n<Figure src=\"/a.jpg\" />\n\n| a |\n| - |\n| b |\n")).toBeNull();
    // The site strips import/export before compiling (next-mdx-remote), so
    // they never fail the compile.
    expect(await compileMdxBody('import X from "y"\n\nexport const z = 1\n\nText.\n')).toBeNull();
  });

  it("reports a failure with its position", async () => {
    expect(await compileMdxBody("Fine.\n\n<Gallery images={[\n")).toMatch(/^line \d+:\d+: Unexpected end of file in expression/);
    expect(await compileMdxBody("<a>\n\n</b>\n")).toMatch(/^line 3:1: Unexpected closing tag `<\/b>`/);
  });
});

describe("freeIdentifiers", () => {
  const free = (expression: string) => {
    const tree = parseMdx(`{${expression}}`) as unknown as { children: { data?: { estree?: unknown } }[] };
    return [...freeIdentifiers(tree.children[0]!.data?.estree)].sort();
  };

  it("finds reads of undeclared names", () => {
    expect(free("a + b.c[d]")).toEqual(["a", "b", "d"]);
    expect(free("({ x, y: z, [k]: 1 })")).toEqual(["k", "x", "z"]);
    expect(free("`${tpl}`")).toEqual(["tpl"]);
  });

  it("ignores declared names, property names, labels and typeof", () => {
    expect(free("((p, { q }, [r], ...s) => p + q + r + s.length)()")).toEqual([]);
    expect(free("(() => { const v = 1; let { w } = { w: 2 }; function f() {} class C {} return v + w + f() + new C(); })()")).toEqual([]);
    expect(free("(() => { try {} catch (e) { return e } })()")).toEqual([]);
    expect(free("typeof maybe === 'undefined'")).toEqual([]);
    expect(free("(() => { outer: for (;;) { break outer; } })()")).toEqual([]);
  });
});

describe("export on absurd input", () => {
  it("fences a code block holding 130,000 backtick runs without overflowing the stack", () => {
    const body = docToMdxBody(doc(code("text", "```\n".repeat(130_000))), { kind: "blog", slug: "x" });
    expect(body.startsWith("````text\n")).toBe(true);
    expect(body.endsWith("\n````\n")).toBe(true);
  });

  it("sizes a table with a huge number of rows", () => {
    const rows = Array.from({ length: 150_000 }, () => tr(td(t("x"))));
    // Built by hand: spreading 150,000 rows into table() would overflow here.
    const grid = { ...table(tr(th(t("h")))), content: [tr(th(t("h"))), ...rows] };
    const body = docToMdxBody(doc(grid), { kind: "blog", slug: "x" });
    expect(body.split("\n")).toHaveLength(150_000 + 2 + 1);
  });
});
