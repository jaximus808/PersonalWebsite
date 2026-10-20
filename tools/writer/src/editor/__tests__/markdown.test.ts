import { describe, expect, it } from "vitest";

import { escapeLooseMdx, looksLikeMarkdown, markdownToSlice } from "../markdown";
import { normalizePastedHeadings } from "../plugins/paste";
import { editorSchema } from "./schema";

describe("looksLikeMarkdown", () => {
  it("accepts typical markdown", () => {
    expect(looksLikeMarkdown("## Setup\n\nInstall it first.")).toBe(true);
    expect(looksLikeMarkdown("- one\n- two\n- three")).toBe(true);
    expect(looksLikeMarkdown("Some text with **bold** and a [link](https://x.com)\nand a second line")).toBe(true);
    expect(looksLikeMarkdown("Intro\n\n```ts\nconst a = 1;\n```")).toBe(true);
    expect(looksLikeMarkdown("| a | b |\n| --- | --- |\n| 1 | 2 |")).toBe(true);
    expect(looksLikeMarkdown("- [ ] todo\n- [x] done")).toBe(true);
  });

  it("leaves single lines and plain prose alone", () => {
    expect(looksLikeMarkdown("## Just one line")).toBe(false);
    expect(looksLikeMarkdown("First paragraph.\n\nSecond paragraph.")).toBe(false);
    expect(looksLikeMarkdown("- just one bullet\nand prose")).toBe(false);
  });

  it("leaves source code alone even with # comments", () => {
    const python = "# compute the mean\nvalues = [1, 2, 3]\nmean = sum(values) / len(values)\nprint(mean)";
    expect(looksLikeMarkdown(python)).toBe(false);
    const js = "// helper\nfunction add(a, b) {\n  return a + b;\n}";
    expect(looksLikeMarkdown(js)).toBe(false);
  });
});

describe("escapeLooseMdx", () => {
  it("escapes braces and stray angle brackets in prose", () => {
    expect(escapeLooseMdx("if a < b use {name}")).toBe("if a &lt; b use \\{name\\}");
  });

  it("leaves code, inline code and components untouched", () => {
    const source = "Use `a < {b}` here\n\n```js\nif (a < b) { go(); }\n```\n\n<Figure src=\"/x.png\" />";
    expect(escapeLooseMdx(source)).toBe(source);
  });

  it("doesn't double-escape", () => {
    expect(escapeLooseMdx("already \\{escaped\\}")).toBe("already \\{escaped\\}");
  });
});

describe("normalizePastedHeadings", () => {
  it("maps h1 to h2 and h5/h6 to h4", () => {
    expect(normalizePastedHeadings('<h1 class="x">A</h1><h5>B</h5><h6>C</h6><h3>D</h3>')).toBe(
      '<h2 class="x">A</h2><h4>B</h4><h4>C</h4><h3>D</h3>',
    );
  });
});

describe("markdownToSlice (through the MDX layer)", () => {
  const schema = editorSchema();
  const ctx = { kind: "blog" as const, slug: "test-post" };
  const types = (text: string) => {
    const slice = markdownToSlice(text, ctx, schema);
    const out: string[] = [];
    slice?.content.forEach((node) => out.push(node.type.name));
    return slice ? out : null;
  };

  it("turns markdown into real blocks", () => {
    expect(types("## Setup\n\nInstall it.\n\n- one\n- two\n\n```bash\nnpm i\n```")).toEqual([
      "heading",
      "paragraph",
      "bulletList",
      "codeBlock",
    ]);
  });

  it("parses loose prose on the second attempt", () => {
    expect(types("## Compare\n\nWhen a < b, use {x} instead.")).toEqual(["heading", "paragraph"]);
  });

  it("returns a slice that is valid in the schema", () => {
    const slice = markdownToSlice("> quoted\n\n1. first\n2. second", ctx, schema);
    expect(slice).not.toBeNull();
    slice!.content.forEach((node) => expect(() => node.check()).not.toThrow());
  });
});
