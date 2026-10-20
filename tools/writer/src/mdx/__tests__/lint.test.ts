import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import type { DraftMeta } from "../../shared/types";
import { lint, wordCount } from "../index";
import { C, L, code, doc, h, li, p, quote, raw, t, ul } from "./docTools";

const blog: DraftMeta = {
  kind: "blog",
  slug: "post",
  title: "A post",
  date: "2026-10-19",
  cover: "assets/cover.jpg",
  createdAt: "",
  updatedAt: "",
};
const project: DraftMeta = { ...blog, kind: "projects", slug: "thing", summary: "It does a thing." };
const ok = doc(p(t("Some words.")));

const messages = (meta: DraftMeta, d: JSONContent, level?: "error" | "warn") =>
  lint(meta, d)
    .filter((issue) => !level || issue.level === level)
    .map((issue) => issue.message);

const figure = (attrs: Partial<Record<string, string>>): JSONContent => ({
  type: "figure",
  attrs: { src: "", caption: "", alt: "", ratio: "standard", fit: "contain", ...attrs },
});
const anatomy = (id: string, title = "T", prompt = "p"): JSONContent => ({
  type: "anatomy",
  attrs: { id, title, prompt, caption: "", size: "figure" },
});

describe("lint", () => {
  it("is quiet for a clean draft", () => {
    expect(lint(blog, ok)).toEqual([]);
    expect(lint(project, ok)).toEqual([]);
  });

  it("requires a title and a valid date", () => {
    expect(messages({ ...blog, title: " ", date: "" }, ok, "error")).toEqual(["Add a title.", "Add a date."]);
    expect(messages({ ...blog, date: "Oct 19" }, ok, "error")).toEqual(['The date "Oct 19" should look like 2026-03-17.']);
    expect(messages({ ...blog, date: "2026-13-45" }, ok, "error")).toEqual(['The date "2026-13-45" isn\'t a real day.']);
  });

  it("refuses days that don't exist (YAML would roll them into the next month)", () => {
    for (const date of ["2026-02-30", "2026-02-29", "2026-04-31", "2026-00-10", "2026-01-00"]) {
      expect(messages({ ...blog, date }, ok, "error")).toEqual([`The date "${date}" isn't a real day.`]);
    }
    for (const date of ["2028-02-29", "2026-12-31", "2026-01-01"]) expect(messages({ ...blog, date }, ok, "error")).toEqual([]);
  });

  it("requires a summary for projects only", () => {
    expect(messages({ ...project, summary: "" }, ok, "error")).toEqual(["Projects need a summary (one or two sentences for the cards)."]);
    expect(messages({ ...blog, summary: "" }, ok, "error")).toEqual([]);
  });

  it("checks project links the way the site's build does", () => {
    const links = [
      { label: "GitHub", href: "github.com/x" },
      { label: "", href: "https://x.com" },
      { label: "", href: "" },
    ];
    expect(messages({ ...project, links }, ok, "error")).toEqual([
      'Link "GitHub" needs an http(s) address.',
      "Link 2 needs a label.",
    ]);
  });

  it("errors on empty media and short galleries", () => {
    const d = doc(
      figure({}),
      { type: "gallery", attrs: { images: ["assets/a.jpg"], caption: "c", columns: null } },
      { type: "video", attrs: { youtube: null, src: null, poster: null, loop: false } },
    );
    expect(messages(blog, d, "error")).toEqual([
      "An image block has no image yet.",
      "A gallery needs at least two images (it has 1); use an image block for one.",
      "A video block has no video yet.",
    ]);
  });

  it("errors on duplicate or malformed figure ids", () => {
    const d = doc(anatomy("fig-1"), anatomy("fig-1"), anatomy("Bad Id"), anatomy(""));
    expect(messages(blog, d, "error")).toEqual([
      'The figure id "Bad Id" should be lowercase words joined by hyphens.',
      'The figure "T" has no id.',
      'Two figures share the id "fig-1"; each needs its own.',
    ]);
  });

  it("warns about remote images, missing alt text, empty headings and no cover", () => {
    const d = doc(
      h(2),
      figure({ src: "https://example.com/pic.png", caption: "remote" }),
      figure({ src: "assets/no-alt.jpg" }),
      { type: "gallery", attrs: { images: ["assets/a.jpg", "assets/b.jpg"], caption: "", columns: null } },
      p(t("words")),
    );
    expect(messages({ ...blog, cover: "" }, d, "warn")).toEqual([
      "No cover image: the post will have no thumbnail.",
      "An image (pic.png) is linked from another site; it'll be downloaded at build time.",
      "There's an empty heading.",
      "The image no-alt.jpg has no alt text or caption.",
      "A gallery has no caption (gallery images have no alt text).",
    ]);
  });

  it("warns about skipped heading levels, YouTube URLs instead of ids, links without an address, and unexplained figures", () => {
    const d = doc(
      h(2, t("Top")),
      h(4, t("Too deep")),
      { type: "video", attrs: { youtube: "https://youtu.be/ztsJ87zMOS0", src: null, poster: null, loop: false } },
      p(t("dead link", L(""))),
      anatomy("fig-1", "", ""),
    );
    expect(messages({ ...project, youtube: "https://youtube.com/watch?v=x" }, d, "warn")).toEqual([
      'The YouTube field should be the video id (11 characters), not "https://youtube.com/watch?v=x".',
      'The heading "Too deep" skips a level (H2 to H4).',
      `The video's YouTube id "https://youtu.be/ztsJ87zMOS0" doesn't look like an id (11 characters).`,
      'The link on "dead link" has no address.',
      "The figure fig-1 doesn't say what it should show yet.",
    ]);
  });

  it("warns when there's nothing written yet", () => {
    expect(messages(blog, doc(p()), "warn")).toEqual(["The draft has no writing yet."]);
  });

  it("reports blocks export can't write as errors", () => {
    expect(messages(blog, doc({ type: "mystery" }), "error")).toEqual(['The writer can\'t export a "mystery" block.']);
  });
});

describe("lint: raw MDX", () => {
  const errors = (...blocks: JSONContent[]) => messages(blog, doc(p(t("Some words.")), ...blocks), "error");
  const warnings = (...blocks: JSONContent[]) => messages(blog, doc(p(t("Some words.")), ...blocks), "warn");

  it("passes raw MDX that the site can build", () => {
    expect(
      errors(
        raw("<TandemBoardDemo />"),
        raw('<Figure src="/blog/x/1.jpg" caption={"A " + new Date(0).getUTCFullYear()} />'),
        raw("<Callout title=\"Note\">\n\nSome *text* with {props.slug ?? \"no slug\"}.\n\n</Callout>"),
        raw("{[1, 2, 3].map((n) => <span key={n}>{n}</span>)}"),
        raw("{/* a comment */}"),
        raw("<details>\n<summary>More</summary>\n\nHidden.\n\n</details>"),
        raw("{(() => { const total = 2 + 2; return total; })()}"),
        raw("<Gallery images={[\"/blog/x/1.jpg\", \"/blog/x/2.jpg\"]} />"),
        raw("{typeof window === \"undefined\" ? \"server\" : \"client\"}"),
        raw("{Math.max(...[1, 2])}"),
      ),
    ).toEqual([]);
  });

  it("names the raw block with a syntax error, with its line", () => {
    const issues = errors(raw('<Figure src="/blog/x/1.jpg" />'), raw('<Figure src="/blog/x/2.jpg" />\n<Gallery images={['));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^The raw MDX block starting "<Figure src=\"\/blog\/x\/2\.jpg\" \/>" doesn't compile: Unexpected end of file in expression.*\(line 2:\d+ of the block\)\.$/);
  });

  it("allows a tag that opens in one block and closes in another, but not a mismatch", () => {
    expect(errors(raw("<div className=\"wide\">"), p(t("between")), raw("</div>"))).toEqual([]);
    expect(errors(raw("<div>"), p(t("between")), raw("</span>"))).toEqual([
      expect.stringMatching(/^The raw MDX block starting "<div>" doesn't compile: /),
    ]);
  });

  it("catches raw MDX nested in lists and quotes", () => {
    expect(errors(ul(li(p(t("item")), raw("<Bogus />"))))).toEqual([expect.stringContaining("<Bogus>")]);
    expect(errors(quote(raw("<Figure src={\"x\"")))).toEqual([expect.stringContaining("doesn't compile")]);
  });

  it("flags components the site doesn't register", () => {
    const issues = errors(raw("<TandemBoardDemos />"), raw("Inline <Fancy.Thing /> and <motion.div /> too, but <span /> is fine."));
    expect(issues).toEqual([
      expect.stringMatching(/^<TandemBoardDemos> in a raw MDX block isn't one of the site's components \(Callout, Diagram, .*TandemBoardDemo, Video\)\./),
      expect.stringContaining("<Fancy.Thing>"),
      expect.stringContaining("<motion.div>"),
    ]);
    // JSX inside an expression counts too.
    expect(errors(raw("{true && <Nope />}"))).toEqual([expect.stringContaining("<Nope>")]);
  });

  it("uses the component list it's given (build-draft reads the live one)", () => {
    const d = doc(p(t("x")), raw("<NewEmbed />"));
    expect(lint(blog, d, { siteComponents: ["NewEmbed"] })).toEqual([]);
    expect(lint(blog, d).map((i) => i.message)).toEqual([expect.stringContaining("<NewEmbed>")]);
  });

  it("flags variables nothing defines", () => {
    expect(errors(raw('<Figure src="/blog/x/1.jpg" caption={caption} />'))).toEqual([
      "{caption} in a raw MDX block isn't defined on the page, so it would fail to render. Only the site's components and props are in scope; write the value in directly.",
    ]);
    expect(errors(raw("{items.map((item) => item.name)}"), raw("<Figure {...extra} />"))).toEqual([
      expect.stringContaining("{items}"),
      expect.stringContaining("{extra}"),
    ]);
    // Not variables: property names, object keys, labels, parameters.
    expect(errors(raw("{({ a: 1, b: { c: 2 } }).b.c + [1].length}"), raw("{((x, { y }) => x + y)(1, { y: 2 })}"))).toEqual([]);
  });

  it("warns that the site drops import and export lines", () => {
    expect(warnings(raw("export const answer = 42"))).toContain(
      "A raw MDX block has an import or export line. The site removes those, so they won't do anything there.",
    );
    // An exported name is gone on the site, so using it is an error.
    expect(errors(raw("export const answer = 42\n\nThe answer is {answer}."))).toEqual([expect.stringContaining("{answer}")]);
  });

  it("leaves code samples alone, whatever they hold", () => {
    expect(errors(code("mdx", "<Gallery images={["), code("jsx", "<Bogus caption={caption} />"))).toEqual([]);
  });
});

describe("wordCount", () => {
  it("counts prose and captions, not code or punctuation", () => {
    const d = doc(
      h(2, t("Two words")),
      p(t("Three "), t("more", C), t(" words — here.")),
      code("js", "const notCounted = true;"),
      figure({ src: "assets/a.jpg", caption: "caption word" }),
      { type: "pullQuote", attrs: { cite: "" }, content: [t("quoted line")] },
    );
    expect(wordCount(d)).toBe(2 + 4 + 2 + 2);
  });

  it("handles an empty or malformed doc", () => {
    expect(wordCount(doc())).toBe(0);
    expect(wordCount({ type: "doc" })).toBe(0);
  });
});
