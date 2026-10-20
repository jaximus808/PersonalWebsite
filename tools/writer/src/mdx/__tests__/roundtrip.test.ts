// Every real post and project must survive site .mdx -> draft -> .mdx with the
// same page. Reads the repo's content/ (never writes to it).
//
// Harmless normalizations the export makes, and these tests allow:
// - trailing spaces at the ends of lines are dropped (they render nothing);
// - `featured: false` / `hideCover: false` are left out (false is the default),
//   and frontmatter keys come out in the house order (title, date, summary,
//   cover, youtube, featured, links, hideCover, then any others such as
//   legacyName in their original order);
// - a loose list (blank lines between items) comes out tight when its items
//   are single paragraphs; render.ts's normalize treats <li><p>x</p></li> and
//   <li>x</li> as the same item.
// Anything the editor can't model (embeds like <TandemBoardDemo />, a <Video>
// with a `title`) comes back byte-for-byte as a raw MDX block.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";
import { describe, expect, it } from "vitest";

import type { Kind } from "../../shared/types";
import { draftToMdx, mdxToDraft } from "../index";
import { bodyOf, compileBody, render } from "./render";

const here = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(here, "../../../../../content");

const files = (["blog", "projects"] as Kind[]).flatMap((kind) =>
  fs
    .readdirSync(path.join(contentDir, kind))
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => ({ kind, slug: file.replace(/\.mdx$/, ""), file: path.join(contentDir, kind, file) })),
);

function frontmatterOf(source: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  const data = (match ? YAML.parse(match[1]!) : {}) as Record<string, unknown>;
  for (const key of ["featured", "hideCover"]) if (data[key] === false) delete data[key];
  return data;
}

/** The original as the exporter is expected to write it, byte for byte. */
function expectedText(source: string): string {
  return (
    source
      .replace(/[ \t]+$/gm, "")
      .replace(/^featured: false\n/m, "")
      .replace(/^hideCover: false\n/m, "")
      // A modelled component written over several lines (one attribute per
      // line, as in tandem.mdx's <Video>) comes back on one line.
      .replace(/^<(Figure|Gallery|Video|Divider|Diagram)\n((?:  [^\n]+\n)+)\/>$/gm, (_m, name: string, lines: string) =>
        `<${name} ${lines.trim().split(/\n\s*/).join(" ")} />`,
      )
  );
}

describe("round trip of every content file", () => {
  it("finds the content", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const { kind, slug, file } of files) {
    describe(`${kind}/${slug}`, () => {
      const source = fs.readFileSync(file, "utf8");
      const draft = mdxToDraft(source, { kind, slug, now: "2026-10-19T00:00:00.000Z" });
      const out = draftToMdx(draft.meta, draft.doc);

      it("keeps the frontmatter", () => {
        expect(frontmatterOf(out)).toEqual(frontmatterOf(source));
      });

      it("compiles", async () => {
        await expect(compileBody(bodyOf(out))).resolves.toBeTruthy();
      });

      it("renders the same page", async () => {
        expect(await render(bodyOf(out))).toEqual(await render(bodyOf(source)));
      });

      it("writes the same text, up to the documented normalizations", () => {
        // Key order is the one thing not normalized textually; compare the
        // body exactly and the frontmatter as data (above).
        expect(bodyOf(out)).toBe(bodyOf(expectedText(source)));
      });

      it("is stable: a second round trip changes nothing", () => {
        const again = mdxToDraft(out, { kind, slug, now: "2026-10-19T00:00:00.000Z" });
        expect(draftToMdx(again.meta, again.doc)).toBe(out);
      });

      it("reports the site files it uses", () => {
        for (const asset of draft.assets) expect(asset.startsWith(`/${kind}/${slug}/`)).toBe(true);
        const cover = frontmatterOf(source).cover;
        if (typeof cover === "string" && cover.startsWith(`/${kind}/${slug}/`)) expect(draft.assets).toContain(cover);
      });
    });
  }

  it("keeps frontmatter in the house style when nothing changes (claude-code-is-the-future)", () => {
    const file = path.join(contentDir, "blog", "claude-code-is-the-future.mdx");
    if (!fs.existsSync(file)) return;
    const source = fs.readFileSync(file, "utf8");
    const draft = mdxToDraft(source, { kind: "blog", slug: "claude-code-is-the-future", now: "x" });
    expect(draftToMdx(draft.meta, draft.doc)).toBe(expectedText(source));
  });
});
