// The writer's file API, as a Vite plugin: the editor and its API share one
// dev server on http://localhost:4310. See SPEC.md "API" for the routes.
//
// The request handling lives in createWriterMiddleware so tests can mount it
// on a plain node:http server against temp folders.

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";

import type { CreateDraftBody, FiguresResult, SaveDraftBody } from "../src/shared/types.ts";
import { assertKind, assertSlug, checkRepoRoot, HttpError, resolveInside } from "./paths.ts";
import { serveStatic } from "./static.ts";
import { DraftStore, errorMessage, MAX_UPLOAD_BYTES, type DraftStoreOptions } from "./storage.ts";

/** JSON bodies are a doc and its meta; uploads go through their own route. */
const MAX_JSON_BYTES = 25 * 1024 * 1024;

export type WriterApiOptions = DraftStoreOptions;

export function writerApi(options: WriterApiOptions = {}): Plugin {
  return {
    name: "writer-api",
    configureServer(server) {
      const store = new DraftStore(options);
      const problem = checkRepoRoot(store.repoRoot);
      if (problem) server.config.logger.error(`[writer] ${problem}`);
      // Added before Vite's own middlewares, so /drafts/** never falls through
      // to Vite's static serving of the tools/writer folder (whatever its
      // case: see routeOf). vite.config.ts also denies drafts/ to Vite's file
      // serving, as a second lock.
      server.middlewares.use(createWriterMiddleware(store));
    },
  };
}

type Route = "api" | "drafts" | "site";

/**
 * Which of the writer's routes a path belongs to, or null for Vite's. The
 * match ignores case and percent-encoding: macOS file systems are
 * case-insensitive, so "/Drafts/…" or "/%64rafts/…" passed on to Vite would
 * serve the very files these routes keep private (meta.json, doc.json, the
 * trash).
 */
export function routeOf(pathname: string): Route | null {
  const first = pathname.split("/")[1] ?? "";
  let head: string;
  try {
    head = decodeURIComponent(first);
  } catch {
    head = first;
  }
  // "%2F" or "\\" can smuggle a separator into the first segment.
  head = head.split(/[/\\]/)[0]!.toLowerCase();
  return head === "api" || head === "drafts" || head === "site" ? head : null;
}

export function createWriterMiddleware(store: DraftStore): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const route = routeOf(url.pathname);
    if (!route) return next();

    handle(store, req, res, url, route).catch((err: unknown) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (err instanceof HttpError) {
        for (const [name, value] of Object.entries(err.headers)) res.setHeader(name, value);
        sendJson(res, err.status, { error: err.message });
      } else {
        console.error("[writer]", err);
        sendJson(res, 500, { error: `Something went wrong: ${errorMessage(err)}` });
      }
    });
  };
}

async function handle(
  store: DraftStore,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  route: Route,
): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  rejectCrossSite(req, method);
  const segments = decodeSegments(url.pathname);
  const [root, ...rest] = segments;
  // The routes themselves are lowercase; any other spelling ("/Drafts/",
  // "/drafts%2Fblog/") is answered here, as not found, and never reaches Vite.
  if (root !== route) throw notFound(url);

  // Static files: /drafts/<kind>/<slug>/(assets|figures)/... and /site/...
  if (root === "drafts") {
    allow(method, ["GET", "HEAD"]);
    const [kind, slug, area, ...file] = rest;
    if (!kind || !slug || (area !== "assets" && area !== "figures") || file.length === 0) {
      throw new HttpError(404, "Not found.");
    }
    const dir = store.files(assertKind(kind), assertSlug(slug)).dir;
    return serveStatic(req, res, resolveInside(dir, area), file.join("/"));
  }
  if (root === "site") {
    allow(method, ["GET", "HEAD"]);
    return serveStatic(req, res, resolveInside(store.repoRoot, "public"), rest.join("/"));
  }

  // JSON API
  const [resource, kind, slug, sub, ...extra] = rest;
  if (resource === "drafts") {
    if (kind === undefined) {
      if (allow(method, ["GET", "POST"]) === "GET") {
        return sendJson(res, 200, { drafts: await store.list() });
      }
      const body = (await readJson(req)) as CreateDraftBody;
      return sendJson(res, 201, await store.create(body));
    }
    if (slug === undefined || extra.length > 0) throw notFound(url);
    const k = assertKind(kind);
    const s = assertSlug(slug);

    if (sub === undefined) {
      switch (allow(method, ["GET", "PUT", "DELETE"])) {
        case "GET":
          return sendJson(res, 200, await store.load(k, s));
        case "PUT": {
          const body = (await readJson(req)) as SaveDraftBody;
          return sendJson(res, 200, await store.save(k, s, body));
        }
        default:
          return sendJson(res, 200, await store.remove(k, s));
      }
    }
    if (sub === "assets") {
      allow(method, ["POST"]);
      const declared = Number(req.headers["content-length"]);
      if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
        res.setHeader("Connection", "close");
        throw new HttpError(413, `That file is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
      }
      const name = url.searchParams.get("name") ?? undefined;
      const result = await store.upload(k, s, name, req, { contentType: req.headers["content-type"] });
      return sendJson(res, 201, result);
    }
    if (sub === "figures") {
      allow(method, ["GET"]);
      const result: FiguresResult = { figures: await store.figures(k, s), builtIds: await store.builtFigureIds(k, s) };
      return sendJson(res, 200, result);
    }
    throw notFound(url);
  }
  if (resource === "site" && kind === undefined) {
    allow(method, ["GET"]);
    return sendJson(res, 200, { entries: await store.siteEntries() });
  }
  if (resource === "import" && kind === undefined) {
    allow(method, ["POST"]);
    const body = (await readJson(req)) as { kind?: unknown; slug?: unknown } | null;
    if (!body || typeof body !== "object") throw new HttpError(400, "Send { kind, slug }.");
    return sendJson(res, 201, await store.importFromSite(body.kind, body.slug));
  }
  throw notFound(url);
}

// ---------------------------------------------------------------------------
// Request helpers

/**
 * The API only answers the writer's own page. A page on another site could
 * otherwise fire simple POSTs at localhost:4310, so writes from a different
 * origin are refused. (Vite already checks the Host header against DNS
 * rebinding.)
 */
function rejectCrossSite(req: IncomingMessage, method: string): void {
  if (method === "GET" || method === "HEAD") return;
  if (req.headers["sec-fetch-site"] === "cross-site") throw new HttpError(403, "Cross-site requests are not allowed.");
  const origin = req.headers.origin;
  if (!origin || origin === "null") return;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Bad Origin header.");
  }
  if (originHost !== req.headers.host) throw new HttpError(403, "Cross-origin requests are not allowed.");
}

function decodeSegments(pathname: string): string[] {
  try {
    return pathname
      .split("/")
      .filter((s) => s.length > 0)
      .map((s) => decodeURIComponent(s));
  } catch {
    throw new HttpError(400, "Malformed URL.");
  }
}

function allow<M extends string>(method: string, methods: readonly M[]): M {
  if ((methods as readonly string[]).includes(method)) return method as M;
  throw new HttpError(405, `${method} is not supported here. Use ${methods.join(" or ")}.`, {
    Allow: methods.join(", "),
  });
}

function notFound(url: URL): HttpError {
  return new HttpError(404, `No such endpoint: ${url.pathname}`);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    total += chunk.byteLength;
    if (total > MAX_JSON_BYTES) throw new HttpError(413, "Request body is too large.");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) throw new HttpError(400, "Expected a JSON body.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "The body is not valid JSON.");
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", Buffer.byteLength(text));
  res.end(text);
}
