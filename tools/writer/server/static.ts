// Serving files from a draft folder or the repo's public/: the right
// Content-Type, conditional requests, and byte ranges so <video> can seek.

import fs from "node:fs";
import fsp from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { contentTypeFor } from "./mime.ts";
import { HttpError, isInside, resolveInside, safeSegments } from "./paths.ts";

/**
 * Serve `relPath` from below `root`. Only plain files are served: no dotfiles,
 * no "..", and the real path (after symlinks) must still be inside `root`.
 */
export async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  root: string,
  relPath: string,
): Promise<void> {
  const file = resolveInside(root, ...safeSegments(relPath));
  let stat: fs.Stats;
  let real: string;
  try {
    [stat, real] = await Promise.all([fsp.stat(file), fsp.realpath(file)]);
  } catch {
    throw new HttpError(404, "Not found.");
  }
  const realRoot = await fsp.realpath(root).catch(() => path.resolve(root));
  if (!stat.isFile() || !isInside(realRoot, real)) throw new HttpError(404, "Not found.");

  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  res.setHeader("Content-Type", contentTypeFor(file));
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Last-Modified", stat.mtime.toUTCString());
  res.setHeader("ETag", etag);
  // Local files change under the same name (a rebuilt figure, a re-imported
  // asset), so always revalidate; the ETag keeps that cheap.
  res.setHeader("Cache-Control", "no-cache");

  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }

  const range = parseRange(req.headers.range, stat.size);
  if (range === "unsatisfiable") {
    res.statusCode = 416;
    res.setHeader("Content-Range", `bytes */${stat.size}`);
    res.end();
    return;
  }

  const { start, end } = range ?? { start: 0, end: stat.size - 1 };
  res.statusCode = range ? 206 : 200;
  if (range) res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
  res.setHeader("Content-Length", stat.size === 0 ? 0 : end - start + 1);

  if (req.method === "HEAD" || stat.size === 0) {
    res.end();
    return;
  }
  try {
    await pipeline(fs.createReadStream(file, { start, end }), res);
  } catch (err) {
    // A browser that stops reading a video mid-stream is normal, not an error.
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ERR_STREAM_PREMATURE_CLOSE" && code !== "EPIPE" && code !== "ECONNRESET") throw err;
  }
}

/**
 * One "bytes=" range ("0-99", "100-", "-500"). Multi-range requests are
 * served whole (null), which browsers accept.
 */
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start: number;
  let end: number;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (suffix === 0) return "unsatisfiable";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
}
