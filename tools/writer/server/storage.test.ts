import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DraftMeta } from "../src/shared/types.ts";
import { HttpError, parseDraftRef, resolveInside, safeSegments, slugify } from "./paths.ts";
import { parseRange } from "./static.ts";
import { DraftStore, localDate, uploadFilename } from "./storage.ts";
import { makeTempRepo, PNG_BYTES, sampleDoc, type TempRepo } from "./test-helpers.ts";

// Let a test make the exporter throw, while every other test uses the real one.
const override = vi.hoisted(() => ({ draftToMdx: null as null | (() => string) }));
vi.mock("../src/mdx/index.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/mdx/index.ts")>();
  return {
    ...real,
    draftToMdx: (...args: Parameters<typeof real.draftToMdx>) =>
      override.draftToMdx ? override.draftToMdx() : real.draftToMdx(...args),
  };
});

let repo: TempRepo;
let store: DraftStore;
let clock: Date;

beforeEach(async () => {
  repo = await makeTempRepo();
  clock = new Date("2026-10-19T18:30:00.000Z");
  store = new DraftStore({ repoRoot: repo.repoRoot, draftsDir: repo.draftsDir, now: () => clock });
  override.draftToMdx = null;
});

afterEach(async () => {
  await repo.cleanup();
});

function tick(ms = 1000) {
  clock = new Date(clock.getTime() + ms);
}

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    return 200;
  } catch (err) {
    if (err instanceof HttpError) return err.status;
    throw err;
  }
}

describe("create", () => {
  it("writes every draft file with today's date and an empty paragraph", async () => {
    const draft = await store.create({ kind: "blog", slug: "first-post", title: "  First post " });
    expect(draft.meta).toMatchObject({
      kind: "blog",
      slug: "first-post",
      title: "First post",
      date: localDate(clock),
      createdAt: clock.toISOString(),
      updatedAt: clock.toISOString(),
    });
    expect(draft.doc).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    for (const file of ["meta.json", "doc.json", "draft.mdx", "anatomy.json"]) {
      expect(await repo.exists(`drafts/blog/first-post/${file}`)).toBe(true);
    }
    expect(await repo.exists("drafts/blog/first-post/assets")).toBe(true);
    expect(await repo.exists("drafts/blog/first-post/figures")).toBe(true);
    expect(await repo.read("drafts/blog/first-post/draft.mdx")).toMatch(/^---\n[\s\S]*First post/);
    expect(JSON.parse(await repo.read("drafts/blog/first-post/anatomy.json"))).toEqual([]);
  });

  it("refuses a draft that already exists", async () => {
    await store.create({ kind: "blog", slug: "twice", title: "Twice" });
    expect(await status(store.create({ kind: "blog", slug: "twice", title: "Again" }))).toBe(409);
    // The same slug under the other kind is a different draft.
    expect(await status(store.create({ kind: "projects", slug: "twice", title: "Twice" }))).toBe(200);
  });

  it.each([
    ["../escape"],
    ["a/b"],
    ["Upper"],
    ["double--hyphen"],
    ["-leading"],
    ["trailing-"],
    [""],
    ["a".repeat(81)],
    ["with space"],
    ["..%2f..%2fetc"],
  ])("rejects the slug %j", async (slug) => {
    expect(await status(store.create({ kind: "blog", slug, title: "x" }))).toBe(400);
    expect(await fs.readdir(repo.draftsDir)).toEqual([]);
  });

  it("rejects unknown kinds", async () => {
    expect(await status(store.create({ kind: "archive" as never, slug: "x", title: "x" }))).toBe(400);
    expect(await status(store.create({ kind: "../blog" as never, slug: "x", title: "x" }))).toBe(400);
  });

  it("accepts an 80-character slug", async () => {
    expect(await status(store.create({ kind: "blog", slug: "a".repeat(80), title: "x" }))).toBe(200);
  });

  it("still creates the draft when the exporter fails (draft.mdx is just empty)", async () => {
    override.draftToMdx = () => {
      throw new Error("boom");
    };
    await store.create({ kind: "blog", slug: "still-saved", title: "x" });
    expect(await repo.read("drafts/blog/still-saved/draft.mdx")).toBe("");
  });
});

describe("load and save", () => {
  it("round-trips the doc and meta, bumping updatedAt but keeping createdAt", async () => {
    const { meta } = await store.create({ kind: "projects", slug: "arm", title: "Arm" });
    tick(60_000);
    const doc = sampleDoc();
    const next: DraftMeta = {
      ...meta,
      title: "Hand tracking arm",
      summary: "A robotic hand that copies yours.",
      links: [{ label: "GitHub", href: "https://github.com/x/y" }],
      featured: true,
      createdAt: "1999-01-01T00:00:00.000Z",
    };
    const result = await store.save("projects", "arm", { meta: next, doc });
    expect(result.savedAt).toBe(clock.toISOString());
    expect(result.mdx).toBe(await repo.read("drafts/projects/arm/draft.mdx"));
    expect(result.mdx).toContain("Hand tracking arm");

    const loaded = await store.load("projects", "arm");
    expect(loaded.doc).toEqual(doc);
    expect(loaded.meta.createdAt).toBe(meta.createdAt);
    expect(loaded.meta.updatedAt).toBe(clock.toISOString());
    expect(loaded.meta.links).toEqual([{ label: "GitHub", href: "https://github.com/x/y" }]);
    expect(loaded.meta.featured).toBe(true);
  });

  it("writes anatomy.json from the doc with built flags", async () => {
    const { meta } = await store.create({ kind: "blog", slug: "loop", title: "Loop" });
    await store.save("blog", "loop", { meta, doc: sampleDoc({ anatomyId: "teleop-loop" }) });
    const anatomy = JSON.parse(await repo.read("drafts/blog/loop/anatomy.json"));
    expect(anatomy).toEqual([
      expect.objectContaining({ id: "teleop-loop", title: "Control loop", size: "figure", built: false }),
    ]);
  });

  it("drops empty optional fields and keeps unknown ones", async () => {
    const { meta } = await store.create({ kind: "blog", slug: "keep", title: "Keep" });
    await store.save("blog", "keep", {
      meta: { ...meta, cover: "", youtube: "", legacyId: "abc123" } as DraftMeta,
      doc: sampleDoc({ anatomyId: null }),
    });
    const saved = JSON.parse(await repo.read("drafts/blog/keep/meta.json"));
    expect(saved).not.toHaveProperty("cover");
    expect(saved).not.toHaveProperty("youtube");
    expect(saved.legacyId).toBe("abc123");
  });

  it("still saves the doc when the exporter throws, and reports it", async () => {
    const { meta } = await store.create({ kind: "blog", slug: "fragile", title: "Fragile" });
    override.draftToMdx = () => {
      throw new Error("unsupported node");
    };
    const doc = sampleDoc();
    const result = await store.save("blog", "fragile", { meta, doc });
    expect(result.mdx).toBe("");
    expect(result.error).toMatch(/unsupported node/);
    expect((await store.load("blog", "fragile")).doc).toEqual(doc);
  });

  it("rejects bodies that are not a draft", async () => {
    const { meta, doc } = await store.create({ kind: "blog", slug: "strict", title: "Strict" });
    const bad: unknown[] = [
      null,
      { meta, doc: { type: "paragraph" } },
      { meta, doc: { type: "doc", content: "nope" } },
      { meta: { ...meta, slug: "other" }, doc },
      { meta: { ...meta, kind: "projects" }, doc },
      { meta: { ...meta, title: 42 }, doc },
      { meta: { ...meta, featured: "yes" }, doc },
      { meta: { ...meta, links: [{ label: "x" }] }, doc },
    ];
    for (const body of bad) {
      expect(await status(store.save("blog", "strict", body as never))).toBe(400);
    }
  });

  it("404s for a draft that does not exist, instead of creating it", async () => {
    expect(await status(store.load("blog", "nope"))).toBe(404);
    const meta = { kind: "blog", slug: "nope", title: "", date: "", createdAt: "", updatedAt: "" } as DraftMeta;
    expect(await status(store.save("blog", "nope", { meta, doc: sampleDoc() }))).toBe(404);
    expect(await repo.exists("drafts/blog/nope")).toBe(false);
  });

  it("serialises concurrent saves so the last one wins", async () => {
    const { meta } = await store.create({ kind: "blog", slug: "race", title: "Race" });
    await Promise.all(
      Array.from({ length: 8 }, (_, i) => store.save("blog", "race", { meta: { ...meta, title: `v${i}` }, doc: sampleDoc() })),
    );
    expect((await store.load("blog", "race")).meta.title).toBe("v7");
    const leftovers = (await fs.readdir(path.join(repo.draftsDir, "blog/race"))).filter((f) => f.endsWith(".tmp"));
    expect(leftovers).toEqual([]);
  });
});

describe("list", () => {
  it("lists drafts newest first with words and published state", async () => {
    await store.create({ kind: "blog", slug: "older", title: "Older" });
    tick();
    const { meta } = await store.create({ kind: "projects", slug: "newer", title: "Newer" });
    tick();
    await store.save("projects", "newer", { meta, doc: sampleDoc() });
    await repo.write("repo/content/blog/older.mdx", "---\ntitle: Older\n---\n");

    const drafts = await store.list();
    expect(drafts.map((d) => `${d.kind}/${d.slug}`)).toEqual(["projects/newer", "blog/older"]);
    expect(drafts[0]!.words).toBeGreaterThan(0);
    expect(drafts[1]).toMatchObject({ title: "Older", published: true, words: 0 });
  });

  it("skips folders that are not drafts", async () => {
    await store.create({ kind: "blog", slug: "good", title: "Good" });
    await repo.write("drafts/blog/broken/meta.json", "{not json");
    await repo.write("drafts/blog/Not_A_Slug/meta.json", "{}");
    await repo.write("drafts/blog/stray.txt", "x");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await store.list()).map((d) => d.slug)).toEqual(["good"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("drafts/blog/broken"));
    warn.mockRestore();
  });

  it("is empty when there are no drafts yet", async () => {
    await fs.rm(repo.draftsDir, { recursive: true });
    expect(await store.list()).toEqual([]);
  });
});

describe("remove", () => {
  it("moves the draft to the trash and never deletes it", async () => {
    await store.create({ kind: "blog", slug: "bye", title: "Bye" });
    await store.upload("blog", "bye", "a.png", PNG_BYTES);
    const { trashed } = await store.remove("blog", "bye");
    expect(trashed).toMatch(/^\.trash\/blog-bye-\d{8}-\d{6}-\d{3}$/);
    expect(await repo.exists("drafts/blog/bye")).toBe(false);
    expect(await repo.exists(`drafts/${trashed}/assets/a.png`)).toBe(true);
    expect(await store.list()).toEqual([]);
  });

  it("keeps several trashed copies of the same slug apart", async () => {
    await store.create({ kind: "blog", slug: "again", title: "1" });
    const first = await store.remove("blog", "again");
    await store.create({ kind: "blog", slug: "again", title: "2" });
    const second = await store.remove("blog", "again");
    expect(second.trashed).not.toBe(first.trashed);
    expect(await fs.readdir(path.join(repo.draftsDir, ".trash"))).toHaveLength(2);
  });

  it("404s for a missing draft and blocks a stale save afterwards", async () => {
    const { meta, doc } = await store.create({ kind: "blog", slug: "stale", title: "Stale" });
    await store.remove("blog", "stale");
    expect(await status(store.remove("blog", "stale"))).toBe(404);
    expect(await status(store.save("blog", "stale", { meta, doc }))).toBe(404);
  });
});

describe("upload", () => {
  beforeEach(async () => {
    await store.create({ kind: "blog", slug: "pics", title: "Pics" });
  });

  it("sanitises the name, keeps the extension and dedupes", async () => {
    const first = await store.upload("blog", "pics", "My Photo (1).PNG", PNG_BYTES);
    expect(first).toEqual({ src: "assets/my-photo-1.png", url: "/drafts/blog/pics/assets/my-photo-1.png" });
    const second = await store.upload("blog", "pics", "my photo 1.png", PNG_BYTES);
    const third = await store.upload("blog", "pics", "my-photo-1.png", PNG_BYTES);
    expect([second.src, third.src]).toEqual(["assets/my-photo-1-2.png", "assets/my-photo-1-3.png"]);
    expect(await fs.readFile(path.join(repo.draftsDir, "blog/pics/assets/my-photo-1-3.png"))).toEqual(Buffer.from(PNG_BYTES));
  });

  it("never lets two concurrent uploads take the same name", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => store.upload("blog", "pics", "same.png", PNG_BYTES)));
    expect(new Set(results.map((r) => r.src)).size).toBe(6);
  });

  it("streams bodies and strips any directory from the name", async () => {
    const result = await store.upload("blog", "pics", "../../../etc/clip.MP4", Readable.from([Buffer.from("abc"), Buffer.from("def")]));
    expect(result.src).toBe("assets/clip.mp4");
    expect(await repo.read("drafts/blog/pics/assets/clip.mp4")).toBe("abcdef");
  });

  it("names a pasted screenshot from its content type", async () => {
    expect((await store.upload("blog", "pics", undefined, PNG_BYTES, { contentType: "image/png" })).src).toBe("assets/image.png");
    expect((await store.upload("blog", "pics", "", PNG_BYTES, { contentType: "video/webm" })).src).toBe("assets/video.webm");
  });

  it("refuses files that are not images or videos", async () => {
    expect(await status(store.upload("blog", "pics", "notes.pdf", PNG_BYTES))).toBe(415);
    expect(await status(store.upload("blog", "pics", "script.html", PNG_BYTES, { contentType: "text/html" }))).toBe(415);
    expect(await status(store.upload("blog", "pics", undefined, PNG_BYTES))).toBe(415);
  });

  it("enforces the size limit while streaming and cleans up", async () => {
    const big = Readable.from([Buffer.alloc(600), Buffer.alloc(600)]);
    expect(await status(store.upload("blog", "pics", "big.png", big, { maxBytes: 1000 }))).toBe(413);
    expect(await status(store.upload("blog", "pics", "empty.png", new Uint8Array()))).toBe(400);
    expect(await fs.readdir(path.join(repo.draftsDir, "blog/pics/assets"))).toEqual([]);
  });

  it("404s for an unknown draft", async () => {
    expect(await status(store.upload("blog", "missing", "a.png", PNG_BYTES))).toBe(404);
  });
});

describe("figures", () => {
  it("recomputes built from disk", async () => {
    const { meta } = await store.create({ kind: "blog", slug: "figs", title: "Figs" });
    await store.save("blog", "figs", { meta, doc: sampleDoc({ anatomyId: "fig-1" }) });
    expect((await store.figures("blog", "figs")).map((f) => f.built)).toEqual([false]);
    await repo.write("drafts/blog/figs/figures/fig-1.html", "<!doctype html><title>x</title>");
    expect(await store.figures("blog", "figs")).toEqual([expect.objectContaining({ id: "fig-1", built: true })]);
  });

  it("lists every built page, including ones whose request was deleted", async () => {
    const { meta } = await store.create({ kind: "blog", slug: "orphans", title: "x" });
    expect(await store.builtFigureIds("blog", "orphans")).toEqual([]);
    await store.save("blog", "orphans", { meta, doc: sampleDoc({ anatomyId: "fig-2" }) });
    await repo.write("drafts/blog/orphans/figures/fig-1.html", "<!doctype html><title>old</title>");
    await repo.write("drafts/blog/orphans/figures/fig-2.html", "<!doctype html><title>new</title>");
    // Sources and screenshots beside the pages are not figures.
    await repo.write("drafts/blog/orphans/figures/fig-1/build.mjs", "");
    await repo.write("drafts/blog/orphans/figures/notes.txt", "");
    await repo.write("drafts/blog/orphans/figures/Bad Id.html", "");
    expect(await store.builtFigureIds("blog", "orphans")).toEqual(["fig-1", "fig-2"]);
    expect((await store.figures("blog", "orphans")).map((f) => f.id)).toEqual(["fig-2"]);
  });

  it("falls back to the doc when anatomy.json is missing", async () => {
    const { meta } = await store.create({ kind: "blog", slug: "nofile", title: "x" });
    await store.save("blog", "nofile", { meta, doc: sampleDoc({ anatomyId: "loop" }) });
    await fs.rm(path.join(repo.draftsDir, "blog/nofile/anatomy.json"));
    expect((await store.figures("blog", "nofile")).map((f) => f.id)).toEqual(["loop"]);
  });

  it("never treats an unsafe id as a path", async () => {
    await store.create({ kind: "blog", slug: "evil", title: "x" });
    await repo.write(
      "drafts/blog/evil/anatomy.json",
      JSON.stringify([{ id: "../../meta", title: "", prompt: "", caption: "", size: "figure", built: true }]),
    );
    expect((await store.figures("blog", "evil"))[0]!.built).toBe(false);
  });
});

describe("site entries and import", () => {
  const projectMdx = `---
title: "Hand Tracking Arm"
date: 2025-04-02
summary: "A robotic hand that copies yours."
cover: "/projects/hand-arm/cover.jpg"
---
The arm follows your hand.

<Figure src="/projects/hand-arm/bench.jpg" caption="On the bench" />

<Diagram src="/projects/hand-arm/figures/loop.html" title="Loop" />
`;

  beforeEach(async () => {
    await repo.write("repo/content/projects/hand-arm.mdx", projectMdx);
    await repo.write("repo/content/blog/old-post.mdx", "---\ntitle: Old post\ndate: 2024-01-05\n---\nHi\n");
    await repo.write("repo/content/blog/NotASlug.mdx", "---\ntitle: skip me\n---\n");
    await repo.write("repo/public/projects/hand-arm/cover.jpg", "cover-bytes");
    await repo.write("repo/public/projects/hand-arm/bench.jpg", "bench-bytes");
    await repo.write("repo/public/projects/hand-arm/figures/loop.html", "<!doctype html>loop");
  });

  it("lists the site's posts and projects from frontmatter, newest first", async () => {
    await store.create({ kind: "blog", slug: "old-post", title: "x" });
    expect(await store.siteEntries()).toEqual([
      { kind: "projects", slug: "hand-arm", title: "Hand Tracking Arm", date: "2025-04-02", drafted: false },
      { kind: "blog", slug: "old-post", title: "Old post", date: "2024-01-05", drafted: true },
    ]);
  });

  it("imports a site file with its images and built figures", async () => {
    const result = await store.importFromSite("projects", "hand-arm");
    expect(result.meta).toMatchObject({ kind: "projects", slug: "hand-arm", title: "Hand Tracking Arm", date: "2025-04-02" });
    expect(result.warnings).toEqual([]);
    expect(await repo.read("drafts/projects/hand-arm/assets/cover.jpg")).toBe("cover-bytes");
    expect(await repo.read("drafts/projects/hand-arm/assets/bench.jpg")).toBe("bench-bytes");
    expect(await repo.read("drafts/projects/hand-arm/figures/loop.html")).toBe("<!doctype html>loop");
    expect(await store.figures("projects", "hand-arm")).toEqual([expect.objectContaining({ id: "loop", built: true })]);
    expect(await repo.read("drafts/projects/hand-arm/draft.mdx")).toContain("Hand Tracking Arm");
    expect((await store.list()).map((d) => d.published)).toEqual([true]);
  });

  it("warns about referenced files that are missing", async () => {
    await fs.rm(path.join(repo.repoRoot, "public/projects/hand-arm/bench.jpg"));
    const result = await store.importFromSite("projects", "hand-arm");
    expect(result.warnings).toEqual([expect.stringContaining("bench.jpg")]);
  });

  it("409s when the draft exists and 404s when the site file does not", async () => {
    await store.importFromSite("projects", "hand-arm");
    expect(await status(store.importFromSite("projects", "hand-arm"))).toBe(409);
    expect(await status(store.importFromSite("blog", "nothing-here"))).toBe(404);
    expect(await status(store.importFromSite("blog", "../projects/hand-arm"))).toBe(400);
  });
});

describe("naming and path rules", () => {
  it("builds safe upload names", () => {
    expect(uploadFilename("Résumé Photo.JPEG")).toBe("resume-photo.jpeg");
    expect(uploadFilename("   .png", "image/png")).toBe("image.png");
    expect(uploadFilename("photo.final", "image/png")).toBe("photo-final.png");
    expect(uploadFilename("***.gif")).toBe("image.gif");
    expect(uploadFilename(`${"x".repeat(200)}.png`)).toBe(`${"x".repeat(60)}.png`);
    expect(() => uploadFilename("a.exe", "application/x-msdownload")).toThrow(HttpError);
  });

  it("keeps resolved paths inside their base", () => {
    expect(resolveInside("/base", "a", "b.png")).toBe(path.resolve("/base/a/b.png"));
    expect(() => resolveInside("/base", "..", "etc")).toThrow(HttpError);
    expect(() => resolveInside("/base", "/etc/passwd")).toThrow(HttpError);
    expect(() => resolveInside("/base", "a\0b")).toThrow(HttpError);
    expect(() => safeSegments("a/../b")).toThrow(HttpError);
    expect(() => safeSegments(".env")).toThrow(HttpError);
    expect(() => safeSegments("a\\b")).toThrow(HttpError);
    expect(safeSegments("assets//a.png")).toEqual(["assets", "a.png"]);
  });

  it("parses draft refs and slugifies titles", () => {
    expect(parseDraftRef("blog/my-post")).toEqual({ kind: "blog", slug: "my-post" });
    expect(parseDraftRef("/projects/arm/")).toEqual({ kind: "projects", slug: "arm" });
    expect(() => parseDraftRef("blog/../x")).toThrow(HttpError);
    expect(() => parseDraftRef("archive/x")).toThrow(HttpError);
    expect(slugify("Going To A Place New is Hard!")).toBe("going-to-a-place-new-is-hard");
    expect(slugify("Jaxon’s Café — v2")).toBe("jaxons-cafe-v2");
  });

  it("parses byte ranges", () => {
    expect(parseRange(undefined, 100)).toBeNull();
    expect(parseRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=50-500", 100)).toEqual({ start: 50, end: 99 });
    expect(parseRange("bytes=100-", 100)).toBe("unsatisfiable");
    expect(parseRange("bytes=9-3", 100)).toBe("unsatisfiable");
    expect(parseRange("bytes=0-1,5-6", 100)).toBeNull();
    expect(parseRange("items=0-1", 100)).toBeNull();
  });
});
