// One document that uses every node and mark the writer has, full of
// characters that mean something in MDX. It must export to MDX that compiles
// with the site's pipeline, renders to the same text, formatting and
// component props, and reads back into the same document.

import { describe, expect, it } from "vitest";

import type { DraftMeta } from "../../shared/types";
import { draftToMdx, figureRequests, mdxToDraft, referencedAssets, wordCount } from "../index";
import { B, C, I, L, S, br, canonical, code, doc, h, li, ol, p, quote, raw, runsOfDoc, t, table, task, tasks, td, th, tr, ul } from "./docTools";
import { bodyOf, compileBody, componentsIn, render, runsOfRender } from "./render";

const meta: DraftMeta = {
  kind: "blog",
  slug: "every-node",
  title: 'Every node: "quotes", {braces} & <angles>',
  date: "2026-10-19",
  cover: "assets/cover.jpg",
  createdAt: "2026-10-19T00:00:00.000Z",
  updatedAt: "2026-10-19T00:00:00.000Z",
};

const fixture = doc(
  h(2, t("Escapes: { } < > * _ ` [ ] # | ~ \\ & &amp; and C#")),
  p(
    t("Text with {braces}, <angle> brackets, <div>, *stars*, _underscores_, snake_case_name, `ticks`, "),
    t("[not](a-link), 2*3=6, a\\b, &amp; &copy; &#169; 100% ~tilde~ ~~strike~~ | pipe, !"),
    t("[image](x.png), <!-- comment -->, {/* expr */}, $5 and a trailing backslash \\"),
  ),
  // Line starts that would turn into other blocks.
  p(
    t("# not a heading"), br,
    t("> not a quote"), br,
    t("- not a list"), br,
    t("+ nope"), br,
    t("* nope"), br,
    t("1. not ordered"), br,
    t("2) nope"), br,
    t("import x from 'y'"), br,
    t("export const z = 1"), br,
    t("==="), br,
    t("---"), br,
    t(":--- | ---"), br,
    t("| a | b |"), br,
    t("    four spaces"), br,
    t("```"), br,
    t("<Figure />"),
  ),
  p(
    t("Marks: "), t("bold", B), t(", "), t("italic", I), t(", "), t("strike", S), t(", "), t("code", C), t(", "),
    t("link", L("https://example.com")), t(", "),
    t("bold "), t("bold-italic", B, I), t(" bold", B), t(" then "),
    t("a link with ", L("https://example.com/a")), t("bold", L("https://example.com/a"), B), t(" inside", L("https://example.com/a")), t(", "),
    t("bold ", B), t("spanning a link", B, L("https://example.com/b")), t(" too", B), t(", "),
    t("all at once", B, I, S, L("https://example.com/c")), t(", "),
    t("bold code", B, C), t("."),
  ),
  p(
    t("Code with backticks "), t("a ``b`` c", C), t(", "), t("`starts", C), t(" and "), t("ends`", C), t(", "),
    t(" spaced ", C), t(", "), t("{x} <y> *z*", C), t("."),
  ),
  p(
    t("Hard places: un"), t("believ", I), t("able, x"), t('"quoted"', B), t("y, foo"), t("_bar_", I), t("baz, "),
    t(" edges ", B), t("and"), t(" edges ", I), t("."), t("strike", S), t("d mid-word, "),
    t("snake_case", I), t(" italic, "), t("2", B), t("x"), t("."),
  ),
  p(
    t("Links: "), t("parens and spaces", L("https://example.com/a (b)/c d")), t(", "),
    t("angles", L("https://example.com/<x>?q={y}")), t(", "),
    t("relative", L("/projects/tandem")), t(", "), t("anchor", L("#section")), t(", "),
    t("email", L("mailto:me@example.com")), t("."),
  ),
  p(t("Line one"), br, t("line two "), br, t(" line three")),
  h(3, t("Third level")),
  h(4, t("Fourth level ends with #")),
  ul(
    li(p(t("one")), ul(li(p(t("one.a"))), li(p(t("one.b")), ol(3, li(p(t("three"))), li(p(t("four"))))))),
    li(p(t("two")), code("js", "const two = 2;\n")),
    li(p(t("three with "), t("bold", B))),
  ),
  // Two lists of the same kind in a row must stay two lists.
  ul(li(p(t("second list")))),
  tasks(task(false, p(t("todo"))), task(true, p(t("done "), t("well", I))), task(false, p(t("parent")), tasks(task(true, p(t("child")))))),
  ol(7, li(p(t("seven"))), li(p(t("eight"))), li(p(t("nine")), p(t("nine, second paragraph"))), li(p(t("ten")))),
  ol(1, li(p(t("again from one")))),
  quote(p(t("Quoted "), t("text", B)), ul(li(p(t("in a quote")))), quote(p(t("nested quote"))), code("sh", "echo hi")),
  code("ts", 'const fence = "```";\nconst obj = { a: <T,>(x: T) => x };\n\n  indented()\n'),
  code(null, "plain {code} <with> `ticks`"),
  code("txt", ""),
  table(
    tr(th(p(t("Name"))), th(p(t("Pipes | in header"))), th(p(t("Notes")))),
    tr(td(p(t("a|b"))), td(p(t("x | y", C))), td(p(t("bold", B), t(" and "), t("link", L("https://example.com/t"))))),
    tr(td(p(t("two"))), td(p(t("paragraphs")), p(t("in a cell"))), td(p())),
    tr(td(p(t("break"), br, t("inside"))), td(p(t("{braces} <angle>"))), td(p(t("_x_ *y*")))),
  ),
  {
    type: "figure",
    attrs: { src: "assets/photo one.jpg", caption: 'He said "hi" & {left}', alt: "Café — naïve 🙂", ratio: "wide", fit: "cover" },
  },
  { type: "figure", attrs: { src: "/blog/other-post/plain.png", caption: "", alt: "", ratio: "standard", fit: "contain" } },
  { type: "figure", attrs: { src: "assets/tall.png", caption: "A tall one", alt: "", ratio: "tall", fit: "contain" } },
  { type: "gallery", attrs: { images: ["assets/a.jpg", "/blog/x/b.jpg", 'assets/c "q".jpg'], caption: "Before & after", columns: 3 } },
  { type: "gallery", attrs: { images: ["assets/d.jpg", "assets/e.jpg"], caption: "", columns: null } },
  { type: "video", attrs: { youtube: "ztsJ87zMOS0", src: null, poster: null, loop: false } },
  { type: "video", attrs: { youtube: null, src: "assets/demo.mp4", poster: "assets/poster.jpg", loop: true } },
  {
    type: "callout",
    attrs: { title: 'Note: "quoted" {title}' },
    content: [p(t("Inside a callout with "), t("bold", B), t(".")), ul(li(p(t("a list")))), code("py", "print('hi')")],
  },
  { type: "callout", attrs: { title: "" }, content: [p(t("Untitled callout."))] },
  { type: "pullQuote", attrs: { cite: "Someone, somewhere" }, content: [t("The artifact is the "), t("shared memory", B), t(" {really}.")] },
  { type: "pullQuote", attrs: { cite: "" }, content: [t("# Starts like a heading")] },
  { type: "divider", attrs: { label: "" } },
  { type: "divider", attrs: { label: "Part two" } },
  { type: "anatomy", attrs: { id: "teleop-loop", title: "Teleop loop", prompt: "Show the loop", caption: "How it flows", size: "hero" } },
  { type: "anatomy", attrs: { id: "fig-2", title: 'A "quoted" title', prompt: "", caption: "", size: "figure" } },
  raw("<Embed answer={42} label=\"raw\" />"),
  p(t("The end.")),
);

describe("fixture: every node and mark", () => {
  const mdx = draftToMdx(meta, fixture);
  const body = bodyOf(mdx);

  it("writes the house frontmatter", () => {
    expect(mdx.startsWith(
      [
        "---",
        'title: "Every node: \\"quotes\\", {braces} & <angles>"',
        "date: 2026-10-19",
        'cover: "/blog/every-node/cover.jpg"',
        "---",
        "## Escapes",
      ].join("\n"),
    )).toBe(true);
  });

  it("is tidy: blank line between blocks, no trailing spaces outside code, one final newline", () => {
    expect(mdx.endsWith("The end.\n")).toBe(true);
    expect(mdx.endsWith("\n\n")).toBe(false);
    expect(body).not.toMatch(/\n\n\n/);
    const outsideCode = body.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1$/gm, "");
    expect(outsideCode).not.toMatch(/[ \t]$/m);
  });

  it("compiles with @mdx-js/mdx + remark-gfm", async () => {
    await expect(compileBody(body)).resolves.toContain("_createMdxContent");
  });

  it("renders the same text and formatting", async () => {
    const tree = await render(body);
    expect(runsOfRender(tree)).toEqual(runsOfDoc(fixture));
  });

  it("renders every component with the right props", async () => {
    const tree = await render(body);
    expect(componentsIn(tree)).toEqual([
      { name: "Figure", props: { src: "/blog/every-node/photo one.jpg", caption: 'He said "hi" & {left}', alt: "Café — naïve 🙂", ratio: "wide", fit: "cover" } },
      { name: "Figure", props: { src: "/blog/other-post/plain.png" } },
      { name: "Figure", props: { src: "/blog/every-node/tall.png", caption: "A tall one", ratio: "tall" } },
      { name: "Gallery", props: { images: ["/blog/every-node/a.jpg", "/blog/x/b.jpg", '/blog/every-node/c "q".jpg'], caption: "Before & after", columns: 3 } },
      { name: "Gallery", props: { images: ["/blog/every-node/d.jpg", "/blog/every-node/e.jpg"] } },
      { name: "Video", props: { youtube: "ztsJ87zMOS0" } },
      { name: "Video", props: { src: "/blog/every-node/demo.mp4", poster: "/blog/every-node/poster.jpg", loop: true } },
      { name: "Callout", props: { title: 'Note: "quoted" {title}' } },
      { name: "Callout", props: {} },
      { name: "PullQuote", props: { cite: "Someone, somewhere" } },
      { name: "PullQuote", props: {} },
      { name: "Divider", props: {} },
      { name: "Divider", props: { label: "Part two" } },
      { name: "Diagram", props: { src: "/blog/every-node/figures/teleop-loop.html", title: "Teleop loop", caption: "How it flows", size: "hero" } },
      { name: "Diagram", props: { src: "/blog/every-node/figures/fig-2.html", title: 'A "quoted" title' } },
      { name: "Embed", props: { answer: 42, label: "raw" } },
    ]);
  });

  it("renders the structure: nesting, numbering, task boxes, table shape", async () => {
    const tree = await render(body);
    const find = (name: string) => {
      const out: Extract<(typeof tree)[number], object>[] = [];
      const walk = (nodes: typeof tree) =>
        nodes.forEach((n) => {
          if (typeof n === "string") return;
          if (n.name === name) out.push(n);
          walk(n.children);
        });
      walk(tree);
      return out;
    };
    // 2 top-level bullet lists + 1 nested + 1 in the quote + 1 in the callout; task lists are <ul> too (2).
    expect(find("ul")).toHaveLength(7);
    expect(find("ol").map((n) => n.props.start)).toEqual(["3", "7", undefined]);
    expect(find("input").map((n) => n.props.checked === true)).toEqual([false, true, false, true]);
    expect(find("blockquote")).toHaveLength(2);
    expect(find("table")).toHaveLength(1);
    expect(find("tr").map((row) => row.children.length)).toEqual([3, 3, 3, 3]);
    expect(find("pre")).toHaveLength(6);
  });

  it("reads back into the same document", () => {
    const back = mdxToDraft(mdx, { kind: "blog", slug: "every-node", now: meta.createdAt });
    expect(back.meta).toEqual({ ...meta });
    expect(canonical(back.doc)).toEqual(canonical(fixture));
    expect(back.assets).toEqual([
      "/blog/every-node/cover.jpg",
      "/blog/every-node/photo one.jpg",
      "/blog/every-node/tall.png",
      "/blog/every-node/a.jpg",
      '/blog/every-node/c "q".jpg',
      "/blog/every-node/d.jpg",
      "/blog/every-node/e.jpg",
      "/blog/every-node/demo.mp4",
      "/blog/every-node/poster.jpg",
    ]);
  });

  it("exports the same MDX again after a round trip (stable)", () => {
    const back = mdxToDraft(mdx, { kind: "blog", slug: "every-node", now: meta.createdAt });
    expect(draftToMdx(back.meta, back.doc)).toBe(mdx);
  });

  it("lists figure requests, assets and words", () => {
    expect(figureRequests(fixture)).toEqual([
      { id: "teleop-loop", title: "Teleop loop", prompt: "Show the loop", caption: "How it flows", size: "hero", built: false },
      { id: "fig-2", title: 'A "quoted" title', prompt: "", caption: "", size: "figure", built: false },
    ]);
    expect(referencedAssets(meta, fixture)).toEqual([
      "assets/cover.jpg",
      "assets/photo one.jpg",
      "assets/tall.png",
      "assets/a.jpg",
      'assets/c "q".jpg',
      "assets/d.jpg",
      "assets/e.jpg",
      "assets/demo.mp4",
      "assets/poster.jpg",
    ]);
    expect(wordCount(fixture)).toBeGreaterThan(150);
  });
});
