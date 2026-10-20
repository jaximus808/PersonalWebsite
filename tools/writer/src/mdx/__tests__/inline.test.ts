// Inline serialization: exact output for the cases worth reading, then a
// seeded property test that throws random text and marks at the exporter and
// checks the page shows exactly that text with exactly those marks.

import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { docToMdxBody, mdxToDraft } from "../index";
import { codeSpan, escapeText, linkDestination } from "../inline";
import { B, C, I, L, S, br, canonical, doc, h, li, p, runsOfDoc, t, table, td, th, tr, ul } from "./docTools";
import { compileBody, render, runsOfRender } from "./render";

const ctx = { kind: "blog" as const, slug: "x" };
const body = (...blocks: JSONContent[]) => docToMdxBody(doc(...blocks), ctx);

describe("escaping", () => {
  it("escapes MDX and markdown syntax in text", () => {
    expect(escapeText("{a} <b> *c* `d` [e] ~f~ \\g")).toBe("\\{a\\} \\<b> \\*c\\* \\`d\\` \\[e\\] \\~f\\~ \\\\g");
  });

  it("leaves snake_case alone but escapes underscores that could emphasize", () => {
    expect(escapeText("snake_case_name")).toBe("snake_case_name");
    expect(escapeText("_lead and trail_")).toBe("\\_lead and trail\\_");
  });

  it("escapes & only where it would start a character reference", () => {
    expect(escapeText("R&D & &amp; &#169; &x")).toBe("R&D & \\&amp; \\&#169; &x");
  });

  it("makes line starts safe", () => {
    expect(body(p(t("# a"), br, t("- b"), br, t("1. c"), br, t("10) d"), br, t("> e"), br, t("import f")))).toBe(
      "\\# a\\\n\\- b\\\n1\\. c\\\n10\\) d\\\n\\> e\\\n&#105;mport f\n",
    );
  });

  it("drops breaks at the edges of a paragraph and spaces before a break", () => {
    expect(body(p(br, t("a  "), br, t("b"), br))).toBe("a\\\nb\n");
  });
});

describe("marks", () => {
  it("writes the plain forms", () => {
    expect(body(p(t("b", B), t(" "), t("i", I), t(" "), t("s", S), t(" "), t("c", C), t(" "), t("l", L("/x"))))).toBe(
      "**b** _i_ ~~s~~ `c` [l](/x)\n",
    );
  });

  it("opens a mark once across runs and nests links inside formatting", () => {
    expect(body(p(t("a ", B), t("b", B, L("/l")), t(" c", B)))).toBe("**a [b](/l) c**\n");
    expect(body(p(t("a ", L("/l")), t("b", L("/l"), B), t(" c", L("/l"))))).toBe("[a **b** c](/l)\n");
  });

  it("moves whitespace off mark edges", () => {
    expect(body(p(t("x"), t(" bold ", B), t("y")))).toBe("x **bold** y\n");
  });

  it("falls back to inline JSX where a delimiter can't work", () => {
    expect(body(p(t("un"), t("believ", I), t("able")))).toBe("un<em>believ</em>able\n");
    expect(body(p(t("x"), t('"q"', B), t("y")))).toBe('x<strong>"q"</strong>y\n');
    expect(body(p(t("a"), t("b", B), t("c")))).toBe("a**b**c\n");
  });

  it("fences code with more backticks than it contains", () => {
    expect(codeSpan("a`b")).toBe("``a`b``");
    expect(codeSpan("``")).toBe("` `` `");
    expect(codeSpan(" x ")).toBe("`  x  `");
    expect(codeSpan(" ")).toBe("` `");
  });

  it("writes awkward link destinations in angle brackets", () => {
    expect(linkDestination("https://x.com/a b")).toBe("<https://x.com/a b>");
    expect(linkDestination("https://x.com/(a)")).toBe("<https://x.com/(a)>");
    expect(linkDestination("https://x.com/<a>")).toBe("<https://x.com/\\<a\\>>");
    expect(linkDestination("https://x.com/a")).toBe("https://x.com/a");
  });
});

describe("blocks with inline content", () => {
  it("escapes a trailing # in headings and drops empty ones", () => {
    expect(body(h(2, t("C#")), h(3), p(t("x")))).toBe("## C\\#\n\nx\n");
  });

  it("escapes pipes in tables, including inside code", () => {
    expect(body(table(tr(th(p(t("a|b")))), tr(td(p(t("c|d", C))))))).toBe("| a\\|b |\n| --- |\n| `c\\|d` |\n");
  });

  it("separates adjacent lists of the same kind", () => {
    expect(body(ul(li(p(t("a")))), ul(li(p(t("b")))), ul(li(p(t("c")))))).toBe("- a\n\n* b\n\n- c\n");
  });

  it("drops empty list items", () => {
    expect(body(ul(li(p(t("a"))), li(p()), li(p(t("b")))))).toBe("- a\n- b\n");
  });
});

describe("the render harness notices differences", () => {
  it("sees formatting and text changes", async () => {
    expect(runsOfRender(await render("a *b*"))).not.toEqual(runsOfRender(await render("a b")));
    expect(await render("a [b](/x)")).not.toEqual(await render("a [b](/y)"));
    expect(await render("- a\n\n- b")).toEqual(await render("- a\n- b"));
  });
});

// ---------------------------------------------------------------------------
// Property test

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Everything that means something somewhere in MDX/markdown. Bare URLs and
// emails are left out on purpose: GFM autolinks them on the site too, so a
// plain-text URL becoming a link is the site's behaviour, not a bug.
const TOKENS = [
  "a", "b", "word", "Snake_case", "x1", "1.", "2)", "#", "##", "-", "+", "*", "**", "_", "__", "~", "~~", "`", "``",
  "[", "]", "](", "{", "}", "<", "</", ">", "&", "&amp;", "&#169;", "\\", "|", "!", "(", ")", '"', "'", ":", "=", "---",
  "é", "🙂", "—", "import ", "export ", " ", " ", " ", "  ", ".", ",",
];
const HREFS = ["https://example.com", "/blog/x", "https://e.com/a b", "#frag", "https://e.com/(p)", "https://e.com/<x>{y}"];
const MARKS = [B, I, S, C];

function randomInline(rand: () => number, allowBreaks: boolean): JSONContent[] {
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]!;
  const nodes: JSONContent[] = [];
  const count = 1 + Math.floor(rand() * 7);
  for (let n = 0; n < count; n++) {
    if (allowBreaks && rand() < 0.08) {
      nodes.push(br);
      continue;
    }
    let value = "";
    const length = 1 + Math.floor(rand() * 6);
    for (let k = 0; k < length; k++) value += pick(TOKENS);
    const marks = MARKS.filter(() => rand() < 0.25);
    if (rand() < 0.2) marks.push(L(pick(HREFS)));
    nodes.push(t(value, ...marks));
  }
  return nodes;
}

// WRITER_FUZZ=20 npx vitest run src/mdx runs twenty times as many cases
// (with a different seed per multiple) when changing the exporter.
const SCALE = Math.max(1, Number(process.env.WRITER_FUZZ) || 1);

describe("random inline content renders exactly", () => {
  const rand = mulberry32(20261019 + (SCALE > 1 ? Date.now() % 1000 : 0));
  const cases: { name: string; block: JSONContent }[] = [];
  const n = (count: number) => count * SCALE;
  for (let i = 0; i < n(250); i++) cases.push({ name: `paragraph ${i}`, block: p(...randomInline(rand, true)) });
  for (let i = 0; i < n(40); i++) cases.push({ name: `heading ${i}`, block: h(2, ...randomInline(rand, false)) });
  for (let i = 0; i < n(40); i++) cases.push({ name: `list item ${i}`, block: ul(li(p(...randomInline(rand, true))), li(p(...randomInline(rand, true)))) });
  for (let i = 0; i < n(40); i++) cases.push({ name: `table cell ${i}`, block: table(tr(th(p(...randomInline(rand, false)))), tr(td(p(...randomInline(rand, true))))) });
  for (let i = 0; i < n(30); i++) cases.push({ name: `pull quote ${i}`, block: { type: "pullQuote", attrs: { cite: "" }, content: randomInline(rand, true) } });

  it.each(cases)("$name", async ({ block }) => {
    const source = doc(block);
    const mdx = docToMdxBody(source, ctx);
    let tree;
    try {
      await compileBody(mdx);
      tree = await render(mdx);
    } catch (err) {
      throw new Error(`${(err as Error).message}\n--- MDX ---\n${mdx}\n--- doc ---\n${JSON.stringify(source)}`);
    }
    // Same text, same formatting on every character.
    expect(runsOfRender(tree), mdx).toEqual(runsOfDoc(source));
    // And it reads back into the same content.
    expect(canonical(mdxToDraft(mdx, { ...ctx, now: "" }).doc), mdx).toEqual(canonical(source));
  });
});
