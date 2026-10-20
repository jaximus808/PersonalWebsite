import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { draftToMdx, RAW_MDX_LANGUAGE } from "../src/mdx/index.ts";
import type { DraftDoc, DraftMeta, Kind } from "../src/shared/types.ts";
import { DraftStore } from "../server/storage.ts";
import { makeTempRepo, PNG_BYTES, sampleDoc, type TempRepo } from "../server/test-helpers.ts";
import { buildDraft, main, mapMedia, remoteMedia, type BuildOptions } from "./build-draft.ts";
import { listFigures } from "./figures.ts";
import { newDraft } from "./new-draft.ts";

let repo: TempRepo;
let store: DraftStore;

beforeEach(async () => {
  repo = await makeTempRepo();
  store = new DraftStore({ repoRoot: repo.repoRoot, draftsDir: repo.draftsDir });
});

afterEach(async () => {
  await repo.cleanup();
});

/** A complete, lint-clean draft with one uploaded image and (optionally) a built figure. */
async function seed(
  opts: {
    kind?: Kind;
    slug?: string;
    meta?: Partial<DraftMeta>;
    doc?: DraftDoc;
    figureBuilt?: boolean;
    upload?: boolean;
  } = {},
) {
  const kind = opts.kind ?? "blog";
  const slug = opts.slug ?? "arm";
  const { meta } = await store.create({ kind, slug, title: "Hand tracking arm" });
  const next: DraftMeta = {
    ...meta,
    date: "2026-10-19",
    cover: "assets/arm.jpg",
    ...(kind === "projects" ? { summary: "A robotic hand that copies yours." } : {}),
    ...opts.meta,
  };
  await store.save(kind, slug, { meta: next, doc: opts.doc ?? sampleDoc() });
  if (opts.upload !== false) await repo.write(`drafts/${kind}/${slug}/assets/arm.jpg`, "arm-jpeg");
  if (opts.figureBuilt !== false) await repo.write(`drafts/${kind}/${slug}/figures/fig-1.html`, "<!doctype html>fig");
  return next;
}

function build(extra: Partial<BuildOptions> = {}) {
  return buildDraft({ kind: "blog", slug: "arm", repoRoot: repo.repoRoot, draftsDir: repo.draftsDir, ...extra });
}

describe("build-draft", () => {
  it("writes the site file and copies assets and figures", async () => {
    const meta = await seed();
    const summary = await build();
    expect(summary).toMatchObject({ ok: true, wrote: true, overwrote: false, errors: [], output: "content/blog/arm.mdx" });

    const written = await repo.read("repo/content/blog/arm.mdx");
    const saved = await store.load("blog", "arm");
    expect(written).toBe(draftToMdx(saved.meta, saved.doc));
    expect(meta.title).toBe("Hand tracking arm");
    expect(written).toContain("/blog/arm/arm.jpg");
    expect(written).toContain("/blog/arm/figures/fig-1.html");

    expect(await repo.read("repo/public/blog/arm/arm.jpg")).toBe("arm-jpeg");
    expect(await repo.read("repo/public/blog/arm/figures/fig-1.html")).toBe("<!doctype html>fig");
    expect(summary.copied).toEqual([
      { from: expect.stringMatching(/drafts\/blog\/arm\/assets\/arm\.jpg$/), to: "public/blog/arm/arm.jpg", action: "copy" },
      {
        from: expect.stringMatching(/drafts\/blog\/arm\/figures\/fig-1\.html$/),
        to: "public/blog/arm/figures/fig-1.html",
        action: "copy",
      },
    ]);
  });

  it("builds a project too", async () => {
    await seed({ kind: "projects", slug: "arm" });
    const summary = await build({ kind: "projects" });
    expect(summary.ok).toBe(true);
    expect(await repo.read("repo/content/projects/arm.mdx")).toContain("A robotic hand that copies yours.");
  });

  it("stops on lint errors and writes nothing", async () => {
    await seed({ meta: { title: "" } });
    const summary = await build();
    expect(summary.ok).toBe(false);
    expect(summary.errors.join(" ")).toMatch(/title/i);
    expect(await repo.exists("repo/content/blog/arm.mdx")).toBe(false);
    expect(await repo.exists("repo/public/blog/arm")).toBe(false);
  });

  describe("raw MDX", () => {
    const withRaw = (text: string): DraftDoc => {
      const doc = sampleDoc();
      doc.content!.push({ type: "codeBlock", attrs: { language: RAW_MDX_LANGUAGE }, content: [{ type: "text", text }] });
      return doc;
    };

    it.each([
      ["broken syntax", '<Figure src="/blog/x/1.jpg" />\n<Gallery images={[', /doesn't compile/],
      ["a misspelled embed", "<TandemBoardDemos />", /<TandemBoardDemos> in a raw MDX block isn't one of the site's components/],
      ["an undefined variable", "<Figure src=\"/blog/x/1.jpg\" caption={caption} />", /\{caption\} in a raw MDX block isn't defined/],
    ])("stops on %s, in a dry run and a real one, writing nothing", async (_label, text, message) => {
      await seed({ doc: withRaw(text) });
      for (const dryRun of [true, false]) {
        const summary = await build({ dryRun });
        expect(summary).toMatchObject({ ok: false, wrote: false });
        expect(summary.errors).toEqual([expect.stringMatching(message)]);
      }
      expect(await repo.exists("repo/content/blog/arm.mdx")).toBe(false);
      expect(await repo.exists("repo/public/blog/arm")).toBe(false);
    });

    it("builds raw MDX the site can render", async () => {
      await seed({ doc: withRaw("<TandemBoardDemo />") });
      const summary = await build();
      expect(summary).toMatchObject({ ok: true, wrote: true, errors: [] });
      expect(await repo.read("repo/content/blog/arm.mdx")).toContain("\n<TandemBoardDemo />\n");
    });

    it("checks components against the repo's own MdxContent.tsx", async () => {
      await repo.write(
        "repo/components/content/MdxContent.tsx",
        "const components = {\n  Figure,\n  Diagram,\n  RobotDemo,\n  a() {\n    return null;\n  },\n};\n",
      );
      await seed({ doc: withRaw("<RobotDemo />") });
      expect((await build({ dryRun: true })).ok).toBe(true);

      await repo.write("repo/components/content/MdxContent.tsx", "const components = {\n  Figure,\n  Diagram,\n};\n");
      const summary = await build({ dryRun: true });
      expect(summary.errors).toEqual([expect.stringContaining("<RobotDemo>")]);
    });
  });

  it("stops on a project without a summary", async () => {
    await seed({ kind: "projects", meta: { summary: undefined } });
    const summary = await build({ kind: "projects" });
    expect(summary.ok).toBe(false);
    expect(summary.errors.join(" ")).toMatch(/summary/i);
  });

  it("stops on unbuilt figures, listing them, unless allowed", async () => {
    await seed({ figureBuilt: false });
    const stopped = await build();
    expect(stopped.ok).toBe(false);
    expect(stopped.missingFigures).toEqual(["fig-1"]);
    expect(stopped.errors.join(" ")).toContain("fig-1");
    expect(await repo.exists("repo/content/blog/arm.mdx")).toBe(false);

    const allowed = await build({ allowUnbuiltFigures: true });
    expect(allowed.ok).toBe(true);
    expect(allowed.warnings.join(" ")).toContain("fig-1");
    expect(await repo.exists("repo/public/blog/arm/figures/fig-1.html")).toBe(false);
  });

  it("refuses to overwrite a site file without --force", async () => {
    await seed();
    await repo.write("repo/content/blog/arm.mdx", "---\ntitle: Old\n---\nold\n");
    const stopped = await build();
    expect(stopped.ok).toBe(false);
    expect(stopped.errors[0]).toMatch(/already exists.*--force/);
    expect(await repo.read("repo/content/blog/arm.mdx")).toContain("old");

    const forced = await build({ force: true });
    expect(forced).toMatchObject({ ok: true, overwrote: true, wrote: true });
    expect(await repo.read("repo/content/blog/arm.mdx")).toContain("Hand tracking arm");
  });

  it("warns when an overwrite drops frontmatter like legacyId", async () => {
    await seed();
    await repo.write("repo/content/blog/arm.mdx", '---\ntitle: Old\nlegacyId: "abc"\n---\nold\n');
    const summary = await build({ force: true });
    expect(summary.warnings.join(" ")).toMatch(/legacyId/);
  });

  it("does a dry run without touching anything", async () => {
    await seed();
    const summary = await build({ dryRun: true });
    expect(summary).toMatchObject({ ok: true, dryRun: true, wrote: false });
    expect(summary.copied.map((c) => c.action)).toEqual(["copy", "copy"]);
    expect(await repo.exists("repo/content/blog/arm.mdx")).toBe(false);
    expect(await repo.exists("repo/public/blog/arm")).toBe(false);
  });

  it("dry runs report the same stops as real runs", async () => {
    await seed({ figureBuilt: false });
    expect((await build({ dryRun: true })).ok).toBe(false);
  });

  it("stops when a referenced asset is missing from the draft", async () => {
    await seed({ upload: false });
    const summary = await build();
    expect(summary.ok).toBe(false);
    expect(summary.errors.join(" ")).toContain("assets/arm.jpg");
  });

  it("never deletes what is in public/, skips identical files, and guards different ones", async () => {
    await seed();
    await repo.write("repo/public/blog/arm/keep-me.jpg", "older upload");
    await repo.write("repo/public/blog/arm/figures/fig-1.html", "<!doctype html>fig");
    await repo.write("repo/public/blog/arm/arm.jpg", "a different arm");

    const stopped = await build();
    expect(stopped.ok).toBe(false);
    expect(stopped.errors.join(" ")).toContain("public/blog/arm/arm.jpg");
    expect(await repo.read("repo/public/blog/arm/arm.jpg")).toBe("a different arm");

    const forced = await build({ force: true });
    expect(forced.ok).toBe(true);
    expect(forced.copied.map((c) => c.action)).toEqual(["replace", "unchanged"]);
    expect(await repo.read("repo/public/blog/arm/arm.jpg")).toBe("arm-jpeg");
    expect(await repo.read("repo/public/blog/arm/keep-me.jpg")).toBe("older upload");
  });

  it("reports a missing draft", async () => {
    const summary = await build({ slug: "nothing" });
    expect(summary.ok).toBe(false);
    expect(summary.errors[0]).toMatch(/No draft blog\/nothing/);
  });

  describe("remote images", () => {
    const remoteDoc = (): DraftDoc => ({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "From the web." }] },
        {
          type: "figure",
          attrs: { src: "https://cdn.example.com/img/Bench%20Shot.png?w=2", caption: "Bench", alt: "Bench", ratio: "standard", fit: "contain" },
        },
        {
          type: "gallery",
          attrs: { images: ["https://cdn.example.com/img/Bench%20Shot.png?w=2", "assets/arm.jpg"], caption: "", columns: null },
        },
      ],
    });

    function fakeFetch(body: Uint8Array, contentType = "image/png") {
      return vi.fn(async (input: string | URL | Request) => {
        const res = new Response(Buffer.from(body), { headers: { "content-type": contentType } });
        Object.defineProperty(res, "url", { value: String(input) });
        return res;
      }) as unknown as typeof fetch;
    }

    it("downloads them into public/ and points the page at the copy", async () => {
      await seed({ doc: remoteDoc(), figureBuilt: false });
      const fetchImpl = fakeFetch(PNG_BYTES);
      const summary = await build({ fetch: fetchImpl });
      expect(summary.ok).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(summary.downloaded).toEqual([
        { url: "https://cdn.example.com/img/Bench%20Shot.png?w=2", to: "public/blog/arm/bench-shot.png" },
      ]);
      expect(await fs.readFile(path.join(repo.repoRoot, "public/blog/arm/bench-shot.png"))).toEqual(Buffer.from(PNG_BYTES));
      const written = await repo.read("repo/content/blog/arm.mdx");
      expect(written).toContain("/blog/arm/bench-shot.png");
      expect(written).not.toContain("cdn.example.com");
      // The draft itself is left as Jaxon wrote it.
      expect(JSON.stringify((await store.load("blog", "arm")).doc)).toContain("cdn.example.com");
    });

    it("reuses an identical earlier download instead of renaming", async () => {
      await seed({ doc: remoteDoc(), figureBuilt: false });
      await build({ fetch: fakeFetch(PNG_BYTES) });
      const again = await build({ fetch: fakeFetch(PNG_BYTES), force: true });
      expect(again.downloaded[0]!.to).toBe("public/blog/arm/bench-shot.png");
    });

    it("stops, writing nothing, when a download is not an image", async () => {
      await seed({ doc: remoteDoc(), figureBuilt: false });
      const summary = await build({ fetch: fakeFetch(new TextEncoder().encode("<html>"), "text/html") });
      expect(summary.ok).toBe(false);
      expect(summary.errors[0]).toMatch(/Could not download .*not an image/);
      expect(await repo.exists("repo/content/blog/arm.mdx")).toBe(false);
      expect(await repo.exists("repo/public/blog/arm")).toBe(false);
    });

    it("lists them without downloading in a dry run, and keeps them with --keep-remote", async () => {
      await seed({ doc: remoteDoc(), figureBuilt: false });
      const fetchImpl = fakeFetch(PNG_BYTES);
      const dry = await build({ dryRun: true, fetch: fetchImpl });
      expect(dry.downloaded).toEqual([{ url: "https://cdn.example.com/img/Bench%20Shot.png?w=2", to: null }]);
      expect(fetchImpl).not.toHaveBeenCalled();

      const kept = await build({ keepRemote: true, fetch: fetchImpl });
      expect(kept.ok).toBe(true);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(await repo.read("repo/content/blog/arm.mdx")).toContain("cdn.example.com");
    });

    it("finds media in figures, galleries, videos and the cover", () => {
      const doc: DraftDoc = {
        type: "doc",
        content: [
          { type: "video", attrs: { youtube: null, src: "http://x.com/a.mp4", poster: "https://x.com/p.jpg", loop: false } },
          { type: "figure", attrs: { src: "//cdn.x.com/r.png", caption: "", alt: "", ratio: "standard", fit: "contain" } },
          { type: "callout", attrs: { title: "" }, content: remoteDoc().content },
        ],
      };
      const meta = { cover: "https://x.com/c.jpg" } as DraftMeta;
      expect(remoteMedia(meta, doc)).toEqual([
        "https://x.com/c.jpg",
        "http://x.com/a.mp4",
        "https://x.com/p.jpg",
        "//cdn.x.com/r.png",
        "https://cdn.example.com/img/Bench%20Shot.png?w=2",
      ]);
      const mapped = mapMedia(doc, (s) => s.toUpperCase());
      expect(mapped.content![0]!.attrs!.poster).toBe("HTTPS://X.COM/P.JPG");
      expect(doc.content![0]!.attrs!.poster).toBe("https://x.com/p.jpg");
    });
  });
});

describe("CLI", () => {
  it("rejects bad arguments with usage", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main([])).toBe(2);
    expect(await main(["blog/arm", "--frobnicate"])).toBe(2);
    expect(await main(["blog/../etc"])).toBe(2);
    err.mockRestore();
  });
});

describe("new-draft and figures scripts", () => {
  it("creates a draft once and reports it after", async () => {
    const opts = { kind: "blog" as const, slug: "cli-post", title: "CLI post", repoRoot: repo.repoRoot, draftsDir: repo.draftsDir };
    const first = await newDraft(opts);
    expect(first).toMatchObject({ created: true, url: "http://localhost:4310/?draft=blog/cli-post" });
    const second = await newDraft({ ...opts, title: "Other title" });
    expect(second).toMatchObject({ created: false, title: "CLI post" });
  });

  it("lists figure requests with their target files", async () => {
    await seed({ figureBuilt: false });
    const report = await listFigures({ kind: "blog", slug: "arm", repoRoot: repo.repoRoot, draftsDir: repo.draftsDir });
    expect(report.figures).toEqual([
      expect.objectContaining({ id: "fig-1", built: false, file: path.join(report.figuresDir, "fig-1.html") }),
    ]);
  });
});
