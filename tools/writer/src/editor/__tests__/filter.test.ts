import { describe, expect, it } from "vitest";

import { filterItems, matchScore } from "../slash/filter";
import { BLOCK_ITEMS } from "../slash/items";

const titles = (query: string) => filterItems(BLOCK_ITEMS, query).map((item) => item.title);

describe("slash menu filter", () => {
  it("shows everything, in menu order, for an empty query", () => {
    expect(titles("")).toEqual(BLOCK_ITEMS.map((item) => item.title));
  });

  it("puts title prefixes first", () => {
    expect(titles("h")[0]).toBe("Heading 2");
    expect(titles("ima")[0]).toBe("Image");
    expect(titles("gal")[0]).toBe("Gallery");
  });

  it("finds blocks by keyword", () => {
    expect(titles("diagram")).toContain("Anatomy figure");
    expect(titles("youtube")[0]).toBe("Video");
    expect(titles("hr")[0]).toBe("Divider");
    expect(titles("todo")[0]).toBe("Checklist");
    expect(titles("h3")[0]).toBe("Heading 3");
  });

  it("matches words inside a title", () => {
    expect(titles("quote")).toEqual(expect.arrayContaining(["Quote", "Pull quote"]));
    expect(titles("quote")[0]).toBe("Quote");
  });

  it("allows loose subsequence matches but ranks them last", () => {
    expect(matchScore({ title: "Anatomy figure", keywords: [] }, "anfg")).toBeGreaterThan(0);
    expect(titles("zzz")).toEqual([]);
  });

  it("every item has an id, a title and a hint", () => {
    const ids = new Set(BLOCK_ITEMS.map((item) => item.id));
    expect(ids.size).toBe(BLOCK_ITEMS.length);
    for (const item of BLOCK_ITEMS) {
      expect(item.title).toBeTruthy();
      expect(item.hint).toBeTruthy();
    }
  });
});
