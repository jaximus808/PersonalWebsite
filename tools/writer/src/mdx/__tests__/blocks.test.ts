// Block structure: exact output for the forms worth pinning, then a seeded
// property test that nests random blocks (lists in quotes in callouts, code in
// list items, components everywhere) and checks the page and the read-back.

import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { RAW_MDX_LANGUAGE, docToMdxBody, draftToMdx, mdxToDraft } from "../index";
import { jsxAttr } from "../export";
import { B, canonical, code, doc, h, li, ol, p, quote, raw, runsOfDoc, t, table, task, tasks, td, th, tr, ul } from "./docTools";
import { compileBody, componentsIn, render, runsOfRender } from "./render";

const ctx = { kind: "projects" as const, slug: "demo" };
const body = (...blocks: JSONContent[]) => docToMdxBody(doc(...blocks), ctx);

describe("components", () => {
  it("writes each component, leaving out defaults and empty strings", () => {
    expect(
      body(
        { type: "figure", attrs: { src: "assets/a.jpg", caption: "", alt: "", ratio: "standard", fit: "contain" } },
        { type: "figure", attrs: { src: "assets/a.jpg", caption: "Cap", alt: "Alt", ratio: "square", fit: "cover" } },
        { type: "gallery", attrs: { images: ["assets/a.jpg", "/projects/other/b.jpg"], caption: "", columns: 2 } },
        { type: "video", attrs: { youtube: "ztsJ87zMOS0", src: null, poster: null, loop: false } },
        { type: "video", attrs: { youtube: null, src: "assets/v.mp4", poster: null, loop: true } },
        { type: "divider", attrs: { label: "" } },
        { type: "divider", attrs: { label: "Part two" } },
        { type: "anatomy", attrs: { id: "fig-1", title: "Loop", prompt: "ignored", caption: "", size: "figure" } },
        { type: "anatomy", attrs: { id: "fig-2", title: "", prompt: "", caption: "Big one", size: "hero" } },
      ),
    ).toBe(
      [
        '<Figure src="/projects/demo/a.jpg" />',
        '<Figure src="/projects/demo/a.jpg" caption="Cap" alt="Alt" ratio="square" fit="cover" />',
        '<Gallery images={["/projects/demo/a.jpg", "/projects/other/b.jpg"]} columns={2} />',
        '<Video youtube="ztsJ87zMOS0" />',
        '<Video src="/projects/demo/v.mp4" loop />',
        "<Divider />",
        '<Divider label="Part two" />',
        '<Diagram src="/projects/demo/figures/fig-1.html" title="Loop" />',
        '<Diagram src="/projects/demo/figures/fig-2.html" caption="Big one" size="hero" />',
      ].join("\n\n") + "\n",
    );
  });

  it("writes callouts and pull quotes with their content on separate lines", () => {
    expect(
      body(
        { type: "callout", attrs: { title: "Update" }, content: [p(t("Shipped."))] },
        { type: "pullQuote", attrs: { cite: "Me" }, content: [t("A line.")] },
      ),
    ).toBe('<Callout title="Update">\n\nShipped.\n\n</Callout>\n\n<PullQuote cite="Me">\nA line.\n</PullQuote>\n');
  });

  it("skips media blocks that have nothing in them yet", () => {
    expect(
      body(
        { type: "figure", attrs: { src: "", caption: "x", alt: "", ratio: "standard", fit: "contain" } },
        { type: "gallery", attrs: { images: [], caption: "", columns: null } },
        { type: "video", attrs: { youtube: null, src: null, poster: null, loop: false } },
        p(t("text")),
      ),
    ).toBe("text\n");
  });

  it("refuses node types it doesn't know instead of dropping them", () => {
    expect(() => body({ type: "mystery", content: [p(t("x"))] })).toThrow(/"mystery"/);
  });
});

describe("attribute strings", () => {
  const cases = [
    ["plain", ' a="plain"'],
    ['say "hi"', ' a={"say \\"hi\\""}'],
    ["{braces}", ' a={"{braces}"}'],
    ["}", ' a={"}"}'],
    ["Tom & Jerry", ' a="Tom & Jerry"'],
    ["&amp; stays literal", ' a={"&amp; stays literal"}'],
    ["line\nbreak", ' a={"line\\nbreak"}'],
    ["<tag> and 'single'", " a=\"<tag> and 'single'\""],
    ["ünïcødé — 🙂", ' a="ünïcødé — 🙂"'],
    ["back\\slash", ' a="back\\slash"'],
  ] as const;

  it.each(cases)("%j -> %s", (value, expected) => {
    expect(jsxAttr(["a", value])).toBe(expected);
  });

  it("both forms compile and pass the exact string through", async () => {
    const source = cases.map(([value]) => `<X${jsxAttr(["a", value])} />`).join("\n\n");
    await compileBody(source);
    const props = componentsIn(await render(source)).map((c) => c.props.a);
    expect(props).toEqual(cases.map(([value]) => value));
  });
});

describe("lists", () => {
  it("indents nested content under the marker and keeps lists tight", () => {
    expect(body(ol(9, li(p(t("nine")), ul(li(p(t("sub"))))), li(p(t("ten")), code("js", "x()"))))).toBe(
      "9. nine\n   - sub\n10. ten\n    ```js\n    x()\n    ```\n",
    );
  });

  it("writes task lists", () => {
    expect(body(tasks(task(true, p(t("done"))), task(false, p(t("todo")))))).toBe("- [x] done\n- [ ] todo\n");
  });

  it("puts a blank line before blocks that can't interrupt a paragraph", () => {
    expect(body(ul(li(p(t("a")), ol(2, li(p(t("b")))))))).toBe("- a\n\n  2. b\n");
    expect(body(ul(li(p(t("a")), p(t("b")))))).toBe("- a\n\n  b\n");
  });

  it("quotes every line, blank ones too", () => {
    expect(body(quote(p(t("a")), p(t("b"))))).toBe("> a\n>\n> b\n");
  });
});

describe("tables", () => {
  it("pads short rows and spans", () => {
    expect(
      body(
        table(
          tr(th(p(t("a"))), th(p(t("b"))), th(p(t("c")))),
          tr({ type: "tableCell", attrs: { colspan: 2, rowspan: 1, colwidth: null }, content: [p(t("wide"))] }, td(p(t("z")))),
          tr(td(p(t("only")))),
        ),
      ),
    ).toBe("| a | b | c |\n| --- | --- | --- |\n| wide | | z |\n| only | | |\n");
  });
});

describe("frontmatter", () => {
  const base = { createdAt: "", updatedAt: "" };

  it("writes a project in the house order, leaving out empty and false fields", () => {
    const mdx = draftToMdx(
      {
        ...base,
        kind: "projects",
        slug: "demo",
        title: "Demo",
        date: "2026-01-02",
        summary: 'It "works".',
        cover: "assets/cover.jpg",
        youtube: "",
        featured: false,
        hideCover: true,
        links: [{ label: "GitHub", href: "https://github.com/x/y" }, { label: "", href: "" }],
      },
      doc(p(t("Body."))),
    );
    expect(mdx).toBe(
      [
        "---",
        'title: "Demo"',
        "date: 2026-01-02",
        'summary: "It \\"works\\"."',
        'cover: "/projects/demo/cover.jpg"',
        "links:",
        '  - label: "GitHub"',
        '    href: "https://github.com/x/y"',
        "hideCover: true",
        "---",
        "Body.",
        "",
      ].join("\n"),
    );
  });

  it("keeps project-only fields out of blog posts and carries unknown keys through", () => {
    const meta = {
      ...base,
      kind: "blog" as const,
      slug: "post",
      title: "Post",
      date: "2026-01-02",
      summary: "not for blogs",
      extra: { legacyId: "abc123" },
    };
    expect(draftToMdx(meta, doc())).toBe('---\ntitle: "Post"\ndate: 2026-01-02\nlegacyId: "abc123"\n---\n');
  });

  it("quotes a date that isn't YYYY-MM-DD so the YAML stays valid", () => {
    expect(draftToMdx({ ...base, kind: "blog", slug: "p", title: "T", date: "next: week" }, doc())).toContain('date: "next: week"');
  });

  it("reads frontmatter back, keeping unknown keys in extra", () => {
    const back = mdxToDraft('---\ntitle: "T"\ndate: 2026-01-02\nsummary: "S"\nfeatured: true\nlegacyName: "Old_Name"\n---\nHi\n', {
      kind: "projects",
      slug: "p",
      now: "NOW",
    });
    expect(back.meta).toEqual({
      kind: "projects",
      slug: "p",
      title: "T",
      date: "2026-01-02",
      summary: "S",
      featured: true,
      extra: { legacyName: "Old_Name" },
      createdAt: "NOW",
      updatedAt: "NOW",
    });
  });

  it("explains broken frontmatter", () => {
    expect(() => mdxToDraft("---\ntitle: [unclosed\n---\n", { kind: "blog", slug: "p", now: "" })).toThrow(/frontmatter/);
  });
});

describe("import", () => {
  const read = (source: string) => mdxToDraft(source, { kind: "blog", slug: "post", now: "" });

  it("turns a markdown image alone on a line into a figure (alt doubles as caption)", () => {
    const { doc: d, assets } = read("![A cat](/blog/post/cat.jpg)\n");
    expect(d.content).toEqual([
      { type: "figure", attrs: { src: "assets/cat.jpg", caption: "A cat", alt: "A cat", ratio: "standard", fit: "contain" } },
    ]);
    expect(assets).toEqual(["/blog/post/cat.jpg"]);
  });

  it("keeps embeds and components with unknown props as raw MDX, verbatim", () => {
    const source = '<TandemBoardDemo />\n\n<Video\n  src="/blog/post/v.mp4"\n  priority\n/>\n\n<Figure src="/x.jpg" priority />\n';
    const { doc: d } = read(source);
    expect(d.content?.map((n) => n.content?.[0]?.text)).toEqual([
      "<TandemBoardDemo />",
      '<Video\n  src="/blog/post/v.mp4"\n  priority\n/>',
      '<Figure src="/x.jpg" priority />',
    ]);
    expect(docToMdxBody(d, { kind: "blog", slug: "post" })).toBe(source);
  });

  it("models a video's title and caption (Tandem's multi-line <Video>)", () => {
    const source = '<Video\n  src="/projects/tandem/queue-loop.mp4"\n  poster="/projects/tandem/cover.jpg"\n  title="Tandem queue loop"\n/>\n';
    const { doc: d } = mdxToDraft(`---\ntitle: "T"\ndate: 2026-06-12\n---\n${source}`, { kind: "projects", slug: "tandem", now: "2026-10-19T00:00:00.000Z" });
    expect(d.content?.[0]).toEqual({
      type: "video",
      attrs: { youtube: null, src: "assets/queue-loop.mp4", poster: "assets/cover.jpg", loop: false, caption: "", title: "Tandem queue loop" },
    });
    expect(docToMdxBody({ type: "doc", content: [{ type: "video", attrs: { ...d.content![0]!.attrs, caption: 'The "queue" loop' } }] }, { kind: "projects", slug: "tandem" })).toBe(
      '<Video src="/projects/tandem/queue-loop.mp4" poster="/projects/tandem/cover.jpg" title="Tandem queue loop" caption={"The \\"queue\\" loop"} />\n',
    );
  });

  it("strips container prefixes from raw blocks inside lists and quotes", () => {
    const source = "- item\n\n  <Embed\n    a={1}\n  />\n\n> <Embed\n>   b={2}\n> />\n";
    const { doc: d } = read(source);
    const raws: string[] = [];
    JSON.stringify(d, (key, value) => {
      if (value?.type === "codeBlock") raws.push(value.content[0].text);
      return value;
    });
    expect(raws).toEqual(["<Embed\n  a={1}\n/>", "<Embed\n  b={2}\n/>"]);
    expect(docToMdxBody(d, { kind: "blog", slug: "post" })).toBe(source);
  });

  it("reads the one-line PullQuote form and inline JSX formatting", () => {
    const { doc: d } = read('<PullQuote cite="x">A **b**</PullQuote>\n\na <strong>b</strong> <em>c</em> <del>d</del>\n');
    expect(canonical(d)).toEqual(
      canonical(doc({ type: "pullQuote", attrs: { cite: "x" }, content: [t("A "), t("b", B)] }, p(t("a "), t("b", B), t(" "), t("c", { type: "italic" }), t(" "), t("d", { type: "strike" })))),
    );
  });

  it("resolves reference links and maps other headings into 2-4", () => {
    const { doc: d } = read("# Top\n\n###### Deep\n\nSee [the site][s].\n\n[s]: https://jaxonp.com\n");
    expect(d.content?.map((n) => n.attrs?.level ?? n.type)).toEqual([2, 4, "paragraph"]);
    expect(d.content?.[2]?.content?.[1]).toEqual({ type: "text", text: "the site", marks: [{ type: "link", attrs: { href: "https://jaxonp.com" } }] });
  });

  it("reads a Diagram back as an anatomy figure", () => {
    const { doc: d } = read('<Diagram src="/blog/post/figures/teleop-loop.html" title="Loop" size="hero" />\n');
    expect(d.content).toEqual([{ type: "anatomy", attrs: { id: "teleop-loop", title: "Loop", prompt: "", caption: "", size: "hero" } }]);
  });

  it("keeps a fenced MDX sample a code sample; only the raw-MDX language passes through", () => {
    const source = "```mdx\n<Figure src=\"/a.jpg\" />\n```\n";
    const { doc: d } = read(source);
    expect(d.content?.[0]?.attrs).toEqual({ language: "mdx" });
    expect(docToMdxBody(d, { kind: "blog", slug: "post" })).toBe(source);
    expect(docToMdxBody(doc(raw("<Figure src=\"/a.jpg\" />")), { kind: "blog", slug: "post" })).toBe('<Figure src="/a.jpg" />\n');
    // A fence that happens to use the passthrough's name is still a sample.
    const fenced = read(`\`\`\`${RAW_MDX_LANGUAGE}\n<Figure src="/a.jpg" />\n\`\`\`\n`).doc;
    expect(fenced.content?.[0]?.attrs).toEqual({ language: "mdx" });
  });

  it("gives an empty file one empty paragraph", () => {
    expect(read("").doc).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("reports MDX it can't parse with a position", () => {
    expect(() => read("<Broken\n")).toThrow(/doesn't parse/);
  });
});

// ---------------------------------------------------------------------------
// Property test: random nested structure.

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const SCALE = Math.max(1, Number(process.env.WRITER_FUZZ) || 1);

function generator(rand: () => number) {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const WORDS = ["robot", "arm", "- dash", "1. one", "# hash", "> gt", "{x}", "<y>", "`tick`", "*star*", "a_b", "|", "import x", "&amp;", "é"];
  let figure = 0;
  const sentence = () => {
    const nodes: JSONContent[] = [];
    const n = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) nodes.push(t(`${pick(WORDS)} ${pick(WORDS)} `, ...(rand() < 0.3 ? [B] : [])));
    return nodes;
  };
  const block = (depth: number): JSONContent => {
    const kinds = depth <= 0
      ? (["p", "p", "h", "code", "figure", "divider"] as const)
      : (["p", "p", "h", "ul", "ol", "tasks", "quote", "code", "table", "figure", "gallery", "video", "callout", "pull", "divider", "anatomy", "raw"] as const);
    const blocks = (min: number, max: number) => Array.from({ length: min + Math.floor(rand() * (max - min + 1)) }, () => block(depth - 1));
    const item = () => [p(...sentence()), ...blocks(0, 2)];
    switch (pick(kinds)) {
      case "p":
        return p(...sentence());
      case "h":
        return h(pick([2, 3, 4] as const), ...sentence());
      case "ul":
        return ul(...Array.from({ length: 1 + Math.floor(rand() * 3) }, () => li(...item())));
      case "ol":
        return ol(Math.floor(rand() * 12), ...Array.from({ length: 1 + Math.floor(rand() * 3) }, () => li(...item())));
      case "tasks":
        return tasks(...Array.from({ length: 1 + Math.floor(rand() * 3) }, () => task(rand() < 0.5, ...item())));
      case "quote":
        return quote(...blocks(1, 3));
      case "code":
        return code(pick(["js", "py", null, "sh"] as const), pick(["x = 1", "```\nnested\n```", "a\n\n  b", "{x} <y>", "````"]));
      case "table":
        return table(tr(th(p(...sentence())), th(p(...sentence()))), tr(td(p(...sentence())), td(p(...sentence()))));
      case "figure":
        return { type: "figure", attrs: { src: `assets/${figure++}.jpg`, caption: pick(["", "cap", 'a "q"']), alt: "", ratio: pick(["standard", "wide"]), fit: "contain" } };
      case "gallery":
        return { type: "gallery", attrs: { images: ["assets/a.jpg", "assets/b.jpg"], caption: "", columns: pick([null, 3]) } };
      case "video":
        return { type: "video", attrs: { youtube: "ztsJ87zMOS0", src: null, poster: null, loop: false } };
      case "callout":
        return { type: "callout", attrs: { title: pick(["", "Note"]) }, content: blocks(1, 3) };
      case "pull":
        return { type: "pullQuote", attrs: { cite: "" }, content: sentence() };
      case "divider":
        return { type: "divider", attrs: { label: pick(["", "Part"]) } };
      case "anatomy":
        return { type: "anatomy", attrs: { id: `fig-${figure++}`, title: "T", prompt: "", caption: "", size: "figure" } };
      case "raw":
        return raw(pick(["<Embed />", "<Embed\n  n={1}\n/>"]));
    }
  };
  return () => doc(...Array.from({ length: 2 + Math.floor(rand() * 4) }, () => block(3)));
}

describe("random nested documents render and read back exactly", () => {
  const next = generator(mulberry32(42 + (SCALE > 1 ? Date.now() % 1000 : 0)));
  const cases = Array.from({ length: 150 * SCALE }, (_, i) => ({ name: `doc ${i}`, source: next() }));

  it.each(cases)("$name", async ({ source }) => {
    const mdx = docToMdxBody(source, ctx);
    let tree;
    try {
      await compileBody(mdx);
      tree = await render(mdx);
    } catch (err) {
      throw new Error(`${(err as Error).message}\n--- MDX ---\n${mdx}`);
    }
    expect(runsOfRender(tree), mdx).toEqual(runsOfDoc(source));
    const back = mdxToDraft(mdx, { ...ctx, now: "" }).doc;
    expect(canonical(back), mdx).toEqual(canonical(source));
    expect(docToMdxBody(back, ctx), "stable").toBe(mdx);
  });
});
