import { describe, expect, it } from "vitest";

import {
  galleryColumnsFor,
  isImageUrl,
  isStorableSrc,
  isVideoUrl,
  MAX_UPLOAD_BYTES,
  mediaKindOf,
  normalizeHref,
  parseYouTubeId,
  sortMediaFiles,
} from "../media";

describe("parseYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=ztsJ87zMOS0", "ztsJ87zMOS0"],
    ["https://youtube.com/watch?v=ztsJ87zMOS0&t=42s", "ztsJ87zMOS0"],
    ["https://m.youtube.com/watch?v=ztsJ87zMOS0", "ztsJ87zMOS0"],
    ["https://youtu.be/ztsJ87zMOS0", "ztsJ87zMOS0"],
    ["https://youtu.be/ztsJ87zMOS0?si=abc", "ztsJ87zMOS0"],
    ["youtu.be/ztsJ87zMOS0", "ztsJ87zMOS0"],
    ["https://www.youtube.com/shorts/ztsJ87zMOS0", "ztsJ87zMOS0"],
    ["https://www.youtube.com/embed/ztsJ87zMOS0", "ztsJ87zMOS0"],
    ["https://www.youtube-nocookie.com/embed/ztsJ87zMOS0?autoplay=1", "ztsJ87zMOS0"],
    ["https://www.youtube.com/live/ztsJ87zMOS0", "ztsJ87zMOS0"],
    ["ztsJ87zMOS0", "ztsJ87zMOS0"],
    ["  ztsJ87zMOS0  ", "ztsJ87zMOS0"],
  ])("reads %s", (input, id) => {
    expect(parseYouTubeId(input)).toBe(id);
  });

  it.each([
    "",
    "https://www.youtube.com/playlist?list=PL123",
    "https://www.youtube.com/@channel",
    "https://vimeo.com/123456789",
    "https://youtu.be/short",
    "not a url at all",
    "https://example.com/watch?v=ztsJ87zMOS0",
  ])("rejects %s", (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});

describe("image and video URLs", () => {
  it("recognises image links and site paths", () => {
    expect(isImageUrl("https://example.com/a/b.png")).toBe(true);
    expect(isImageUrl("https://example.com/photo.JPEG?w=800")).toBe(true);
    expect(isImageUrl("/blog/my-post/1.jpg")).toBe(true);
    expect(isImageUrl("https://example.com/page")).toBe(false);
    expect(isImageUrl("https://example.com/a.png and more")).toBe(false);
    expect(isImageUrl("javascript:alert(1).png")).toBe(false);
    expect(isImageUrl("file.png")).toBe(false);
  });

  it("recognises video links", () => {
    expect(isVideoUrl("https://cdn.example.com/demo.mp4")).toBe(true);
    expect(isVideoUrl("/projects/x/loop.webm")).toBe(true);
    expect(isVideoUrl("https://example.com/demo.mp4.html")).toBe(false);
  });

  it("refuses data and blob sources", () => {
    expect(isStorableSrc("data:image/png;base64,AAAA")).toBe(false);
    expect(isStorableSrc("blob:http://localhost/123")).toBe(false);
    expect(isStorableSrc("assets/a.png")).toBe(true);
    expect(isStorableSrc("")).toBe(false);
  });
});

describe("files", () => {
  const file = (name: string, type: string, size = 10) => ({ name, type, size });

  it("classifies by MIME type, then extension", () => {
    expect(mediaKindOf(file("a.png", "image/png"))).toBe("image");
    expect(mediaKindOf(file("clip.mov", "video/quicktime"))).toBe("video");
    expect(mediaKindOf(file("shot.heic.png", ""))).toBe("image");
    expect(mediaKindOf(file("notes.pdf", "application/pdf"))).toBeNull();
  });

  it("sorts a batch and explains rejections", () => {
    const sorted = sortMediaFiles([
      file("a.png", "image/png"),
      file("b.mp4", "video/mp4"),
      file("c.pdf", "application/pdf"),
      file("huge.png", "image/png", MAX_UPLOAD_BYTES + 1),
    ]);
    expect(sorted.images.map((f) => f.name)).toEqual(["a.png"]);
    expect(sorted.videos.map((f) => f.name)).toEqual(["b.mp4"]);
    expect(sorted.rejected.map((r) => r.file.name)).toEqual(["c.pdf", "huge.png"]);
    expect(sorted.rejected[1].reason).toMatch(/200 MB/);
  });

  it("picks three columns only for full rows of three", () => {
    expect(galleryColumnsFor(2)).toBeNull();
    expect(galleryColumnsFor(3)).toBe(3);
    expect(galleryColumnsFor(4)).toBeNull();
    expect(galleryColumnsFor(6)).toBe(3);
  });
});

describe("normalizeHref", () => {
  it.each([
    ["example.com", "https://example.com"],
    ["https://example.com/x", "https://example.com/x"],
    ["/projects/tandem", "/projects/tandem"],
    ["#section", "#section"],
    ["me@example.com", "mailto:me@example.com"],
    ["mailto:me@example.com", "mailto:me@example.com"],
    ["localhost:3000", "https://localhost:3000"],
    ["  ", ""],
  ])("%s → %s", (input, href) => {
    expect(normalizeHref(input)).toBe(href);
  });
});
