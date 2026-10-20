// Pure helpers for recognising media in pasted text and dropped files. No DOM
// beyond the File type, so they are easy to test.

/** The largest file the local API accepts (see SPEC.md, assets upload). */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|avif|svg)$/i;
const VIDEO_EXT = /\.(?:mp4|webm|mov|m4v)$/i;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The 11-character video id from anything that points at one YouTube video:
 * watch?v=, youtu.be/, /shorts/, /embed/, /live/, the nocookie domain, or a
 * bare id. Returns null for anything else (playlists, channels, other sites).
 */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (YOUTUBE_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(?:www\.|m\.|music\.)/, "").toLowerCase();

  let candidate: string | null = null;
  if (host === "youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else {
      const match = /^\/(?:shorts|embed|live|v)\/([^/?#]+)/.exec(url.pathname);
      candidate = match ? match[1] : null;
    }
  }
  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

/** Path part of a URL or site path, without query or hash. */
function pathOf(value: string): string | null {
  if (value.startsWith("/")) return value.split(/[?#]/)[0];
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.pathname;
  } catch {
    return null;
  }
}

/** A single http(s) URL or site path ("/blog/x/1.jpg") that names an image file. */
export function isImageUrl(input: string): boolean {
  const value = input.trim();
  if (!value || /\s/.test(value)) return false;
  const path = pathOf(value);
  return !!path && IMAGE_EXT.test(path);
}

/** A single http(s) URL or site path that names a video file. */
export function isVideoUrl(input: string): boolean {
  const value = input.trim();
  if (!value || /\s/.test(value)) return false;
  const path = pathOf(value);
  return !!path && VIDEO_EXT.test(path);
}

export type MediaKind = "image" | "video";

/** What a file is, judged by MIME type first and extension second. */
export function mediaKindOf(file: { name: string; type: string }): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (IMAGE_EXT.test(file.name)) return "image";
  if (VIDEO_EXT.test(file.name)) return "video";
  return null;
}

export interface SortedFiles<F> {
  images: F[];
  videos: F[];
  /** Files the writer can't place, with a reason in plain words. */
  rejected: { file: F; reason: string }[];
}

/** Split a batch of files into images, videos and ones we refuse. */
export function sortMediaFiles<F extends { name: string; type: string; size: number }>(
  files: readonly F[],
): SortedFiles<F> {
  const sorted: SortedFiles<F> = { images: [], videos: [], rejected: [] };
  for (const file of files) {
    const kind = mediaKindOf(file);
    if (!kind) {
      sorted.rejected.push({ file, reason: "only images and videos can go in a post" });
    } else if (file.size > MAX_UPLOAD_BYTES) {
      sorted.rejected.push({ file, reason: "it is larger than 200 MB" });
    } else if (kind === "image") {
      sorted.images.push(file);
    } else {
      sorted.videos.push(file);
    }
  }
  return sorted;
}

/**
 * Gallery columns for a fresh batch: three when the images fill rows of three
 * evenly, otherwise the site's default of two (null).
 */
export function galleryColumnsFor(count: number): 3 | null {
  return count >= 3 && count % 3 === 0 ? 3 : null;
}

/** "assets/x.png" and http URLs are fine; data: and blob: URLs would bloat or break the doc. */
export function isStorableSrc(src: string): boolean {
  return !!src && !/^(?:data|blob):/i.test(src.trim());
}

/** Normalise what someone types into a link field into an href. */
export function normalizeHref(input: string): string {
  const value = input.trim();
  if (!value) return "";
  // Already has a scheme (https:, mailto:, tel:), or is site-relative / an
  // anchor. "localhost:3000" is a host and port, not a scheme.
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(value) || /^[/#?]/.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return `https://${value}`;
}
