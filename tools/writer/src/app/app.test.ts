// The app's pure pieces: slugs, draft keys, path resolution (editor and
// preview), YouTube ids, local recovery decisions, and display formatting.

import { describe, expect, it } from "vitest";

import type { DraftFile, DraftMeta } from "../shared/types";
import { docImages, normalizeDoc, outline } from "./doc";
import { formatBytes, formatDate, formatMonthYear, readingMinutes, relativeTime, todayYmd } from "./format";
import {
  figureIdFromSrc,
  parseDraftKey,
  resolveExportedSrc,
  resolveSrc,
  slugify,
  slugProblem,
  youtubeId,
} from "./paths";
import {
  clearLocalCopy,
  readLocalCopy,
  shouldOfferRestore,
  stableStringify,
  writeLocalCopy,
  type LocalCopy,
} from "./recovery";

const blog = { kind: "blog" as const, slug: "my-post" };

describe("slugify", () => {
  it("turns a title into a slug", () => {
    expect(slugify("My First Robot Arm!")).toBe("my-first-robot-arm");
    expect(slugify("  Claude Code is the future  ")).toBe("claude-code-is-the-future");
  });

  it("handles accents, apostrophes and ampersands", () => {
    expect(slugify("Café déjà vu")).toBe("cafe-deja-vu");
    expect(slugify("Jaxon’s robots & rigs")).toBe("jaxons-robots-and-rigs");
  });

  it("collapses runs of punctuation and trims hyphens", () => {
    expect(slugify("--Hello,   world -- again!--")).toBe("hello-world-again");
    expect(slugify("???")).toBe("");
  });

  it("caps the length at a word boundary", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    expect(slugProblem(slug)).toBeNull();
  });
});

describe("slugProblem", () => {
  it("accepts good slugs", () => {
    expect(slugProblem("a")).toBeNull();
    expect(slugProblem("tandem-v2")).toBeNull();
  });

  it("explains bad ones", () => {
    expect(slugProblem("")).toMatch(/slug/);
    expect(slugProblem("My-Post")).toMatch(/Lowercase/);
    expect(slugProblem("my post")).toMatch(/spaces/);
    expect(slugProblem("my--post")).toMatch(/One hyphen/);
    expect(slugProblem("-post")).toMatch(/start or end/);
    expect(slugProblem("post_1")).toMatch(/Letters/);
    expect(slugProblem("../etc")).not.toBeNull();
    expect(slugProblem("a".repeat(81))).toMatch(/80/);
  });
});

describe("parseDraftKey", () => {
  it("reads kind/slug", () => {
    expect(parseDraftKey("blog/my-post")).toEqual(blog);
    expect(parseDraftKey("/projects/tandem/")).toEqual({ kind: "projects", slug: "tandem" });
  });

  it("rejects anything else", () => {
    expect(parseDraftKey(null)).toBeNull();
    expect(parseDraftKey("archive/x")).toBeNull();
    expect(parseDraftKey("blog/../secrets")).toBeNull();
    expect(parseDraftKey("blog/a/b")).toBeNull();
    expect(parseDraftKey("blog")).toBeNull();
  });
});

describe("resolveSrc (doc paths in the editor)", () => {
  it("maps uploaded assets into the draft folder", () => {
    expect(resolveSrc("assets/cover.jpg", blog)).toBe("/drafts/blog/my-post/assets/cover.jpg");
    expect(resolveSrc("assets/my shot.png", blog)).toBe("/drafts/blog/my-post/assets/my%20shot.png");
  });

  it("maps site paths through /site", () => {
    expect(resolveSrc("/blog/other/1.jpg", blog)).toBe("/site/blog/other/1.jpg");
    expect(resolveSrc("/projects/tandem/cover.jpg", blog)).toBe("/site/projects/tandem/cover.jpg");
  });

  it("leaves remote and inline sources alone", () => {
    expect(resolveSrc("https://example.com/a.png", blog)).toBe("https://example.com/a.png");
    expect(resolveSrc("data:image/png;base64,xx", blog)).toBe("data:image/png;base64,xx");
  });

  it("treats a bare filename as an asset and returns empty for empty", () => {
    expect(resolveSrc("x.jpg", blog)).toBe("/drafts/blog/my-post/assets/x.jpg");
    expect(resolveSrc("  ", blog)).toBe("");
  });
});

describe("resolveExportedSrc (site paths in the preview)", () => {
  it("reads this draft's exported assets from the draft folder", () => {
    expect(resolveExportedSrc("/blog/my-post/1.jpg", blog)).toBe("/drafts/blog/my-post/assets/1.jpg");
  });

  it("reads figures from the draft's figures folder", () => {
    expect(resolveExportedSrc("/blog/my-post/figures/fig-1.html", blog)).toBe(
      "/drafts/blog/my-post/figures/fig-1.html",
    );
  });

  it("with the asset list, sends paths the draft doesn't own to public/", () => {
    const assets = new Set(["assets/1.jpg"]);
    expect(resolveExportedSrc("/blog/my-post/1.jpg", blog, assets)).toBe("/drafts/blog/my-post/assets/1.jpg");
    expect(resolveExportedSrc("/blog/my-post/demo.mp4", blog, assets)).toBe("/site/blog/my-post/demo.mp4");
    expect(resolveExportedSrc("/blog/my-post/figures/fig-1.html", blog, assets)).toBe(
      "/drafts/blog/my-post/figures/fig-1.html",
    );
  });

  it("reads other site paths from public/", () => {
    expect(resolveExportedSrc("/blog/my-post-two/1.jpg", blog)).toBe("/site/blog/my-post-two/1.jpg");
    expect(resolveExportedSrc("/projects/x/a.png", blog)).toBe("/site/projects/x/a.png");
  });

  it("finds the anatomy id in a Diagram src", () => {
    expect(figureIdFromSrc("/blog/my-post/figures/teleop-loop.html")).toBe("teleop-loop");
    expect(figureIdFromSrc("/blog/my-post/1.jpg")).toBeNull();
  });
});

describe("youtubeId", () => {
  it("accepts ids and every common URL shape", () => {
    const id = "ztsJ87zMOS0";
    expect(youtubeId(id)).toBe(id);
    expect(youtubeId(`https://www.youtube.com/watch?v=${id}&t=30s`)).toBe(id);
    expect(youtubeId(`https://youtu.be/${id}?si=abc`)).toBe(id);
    expect(youtubeId(`youtube.com/shorts/${id}`)).toBe(id);
    expect(youtubeId(`https://www.youtube-nocookie.com/embed/${id}`)).toBe(id);
    expect(youtubeId(`https://m.youtube.com/watch?v=${id}`)).toBe(id);
  });

  it("rejects everything else", () => {
    expect(youtubeId("")).toBeNull();
    expect(youtubeId("not a video")).toBeNull();
    expect(youtubeId("https://vimeo.com/123456")).toBeNull();
    expect(youtubeId("https://www.youtube.com/watch?v=short")).toBeNull();
  });
});

// ---------------------------------------------------------------------------

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

const meta = (patch: Partial<DraftMeta> = {}): DraftMeta => ({
  kind: "blog",
  slug: "my-post",
  title: "Hello",
  date: "2026-10-19",
  createdAt: "2026-10-19T10:00:00.000Z",
  updatedAt: "2026-10-19T12:00:00.000Z",
  ...patch,
});

const doc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("local recovery copies", () => {
  it("round-trips through storage and clears", () => {
    const store = memoryStore();
    const copy: LocalCopy = { meta: meta(), doc: doc("hi"), editedAt: "2026-10-19T12:30:00.000Z" };
    expect(writeLocalCopy(blog, copy, store)).toBe(true);
    expect(readLocalCopy(blog, store)).toEqual(copy);
    expect(readLocalCopy({ kind: "projects", slug: "my-post" }, store)).toBeNull();
    clearLocalCopy(blog, store);
    expect(readLocalCopy(blog, store)).toBeNull();
  });

  it("ignores garbage and survives a throwing store", () => {
    const store = memoryStore();
    store.map.set("writer:unsaved:blog/my-post", "{not json");
    expect(readLocalCopy(blog, store)).toBeNull();
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readLocalCopy(blog, throwing)).toBeNull();
    expect(writeLocalCopy(blog, { meta: meta(), doc: doc("x"), editedAt: "now" }, throwing)).toBe(false);
    expect(() => clearLocalCopy(blog, throwing)).not.toThrow();
  });

  it("offers a restore only when newer and different", () => {
    const server: DraftFile = { meta: meta(), doc: doc("on disk") };
    const newer = "2026-10-19T12:05:00.000Z";
    const older = "2026-10-19T11:00:00.000Z";

    expect(shouldOfferRestore(null, server)).toBe(false);
    expect(shouldOfferRestore({ meta: meta(), doc: doc("unsaved"), editedAt: newer }, server)).toBe(true);
    expect(shouldOfferRestore({ meta: meta(), doc: doc("unsaved"), editedAt: older }, server)).toBe(false);
    // Same content, newer stamp (the save landed but the clear didn't): nothing to offer.
    expect(shouldOfferRestore({ meta: meta(), doc: doc("on disk"), editedAt: newer }, server)).toBe(false);
    // Only bookkeeping differs: still the same content.
    expect(
      shouldOfferRestore({ meta: meta({ updatedAt: newer }), doc: doc("on disk"), editedAt: newer }, server),
    ).toBe(false);
    // A title change counts.
    expect(shouldOfferRestore({ meta: meta({ title: "New" }), doc: doc("on disk"), editedAt: newer }, server)).toBe(
      true,
    );
  });

  it("compares objects regardless of key order", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } })).toBe(
      stableStringify({ a: { c: [3, { e: 0, f: 1 }], d: 2 }, b: 1 }),
    );
  });
});

// ---------------------------------------------------------------------------

describe("doc walks", () => {
  const tree = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Why" }] },
      { type: "figure", attrs: { src: "assets/a.jpg", caption: "", alt: "", ratio: "standard", fit: "contain" } },
      {
        type: "callout",
        attrs: { title: "Note" },
        content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Inside" }] }],
      },
      { type: "gallery", attrs: { images: ["assets/b.jpg", "assets/a.jpg"], caption: "", columns: null } },
      { type: "video", attrs: { youtube: null, src: "assets/v.mp4", poster: "assets/p.jpg", loop: true } },
      { type: "heading", attrs: { level: 4 }, content: [] },
    ],
  };

  it("lists headings in document order, nested ones included", () => {
    expect(outline(tree)).toEqual([
      { index: 0, level: 2, text: "Why" },
      { index: 1, level: 3, text: "Inside" },
      { index: 2, level: 4, text: "" },
    ]);
  });

  it("collects every image once", () => {
    expect(docImages(tree)).toEqual(["assets/a.jpg", "assets/b.jpg", "assets/p.jpg"]);
  });

  it("normalizes a missing or empty doc to one paragraph", () => {
    expect(normalizeDoc(undefined)).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(normalizeDoc({ type: "doc", content: [] })).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(normalizeDoc(tree)).toBe(tree);
  });
});

describe("formatting", () => {
  it("prints dates like the site", () => {
    expect(formatDate("2026-03-17")).toBe("March 17, 2026");
    expect(formatMonthYear("2026-06-12")).toBe("June 2026");
    expect(formatDate("not a date")).toBe("not a date");
  });

  it("estimates reading time at 200 wpm, at least a minute", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
    expect(readingMinutes(1999)).toBe(10);
  });

  it("says how long ago", () => {
    const now = new Date(2026, 9, 19, 15, 0, 0);
    expect(relativeTime(new Date(2026, 9, 19, 14, 59, 40).toISOString(), now)).toBe("just now");
    expect(relativeTime(new Date(2026, 9, 19, 14, 56, 0).toISOString(), now)).toBe("4 min ago");
    expect(relativeTime(new Date(2026, 9, 19, 12, 0, 0).toISOString(), now)).toBe("3 h ago");
    expect(relativeTime(new Date(2026, 9, 18, 9, 0, 0).toISOString(), now)).toBe("yesterday");
    expect(relativeTime(new Date(2026, 2, 3, 9, 0, 0).toISOString(), now)).toBe("Mar 3");
    expect(relativeTime(new Date(2025, 2, 3, 9, 0, 0).toISOString(), now)).toBe("Mar 3, 2025");
  });

  it("formats today and sizes", () => {
    expect(todayYmd(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(150 * 1024 * 1024)).toBe("150 MB");
  });
});
