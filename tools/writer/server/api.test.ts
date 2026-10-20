import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DraftFile, DraftSummary, SaveDraftResult, SiteEntry, UploadResult } from "../src/shared/types.ts";
import { createWriterMiddleware } from "./api.ts";
import { DraftStore } from "./storage.ts";
import { makeTempRepo, PNG_BYTES, sampleDoc, type TempRepo } from "./test-helpers.ts";

let repo: TempRepo;
let server: http.Server;
let base: string;

beforeEach(async () => {
  repo = await makeTempRepo();
  const middleware = createWriterMiddleware(new DraftStore({ repoRoot: repo.repoRoot, draftsDir: repo.draftsDir }));
  server = http.createServer((req, res) =>
    middleware(req, res, () => {
      res.statusCode = 418; // "fell through to Vite"
      res.end("next");
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await repo.cleanup();
});

function api(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  return fetch(`${base}${path}`, {
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
}

/** Raw request, for paths fetch would normalise ("..") before sending. */
function rawGet(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request(`${base}/`, { path, method: "GET" }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.end();
  });
}

describe("drafts API", () => {
  it("creates, lists, loads, saves and deletes a draft", async () => {
    const created = await api("/api/drafts", { method: "POST", json: { kind: "blog", slug: "hello", title: "Hello" } });
    expect(created.status).toBe(201);
    const draft = (await created.json()) as DraftFile;
    expect(draft.meta.title).toBe("Hello");

    const again = await api("/api/drafts", { method: "POST", json: { kind: "blog", slug: "hello", title: "Hello" } });
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: expect.stringContaining("already exists") });

    const list = (await (await api("/api/drafts")).json()) as { drafts: DraftSummary[] };
    expect(list.drafts.map((d) => d.slug)).toEqual(["hello"]);

    const saved = await api("/api/drafts/blog/hello", {
      method: "PUT",
      json: { meta: { ...draft.meta, title: "Hello again" }, doc: sampleDoc({ anatomyId: null }) },
    });
    expect(saved.status).toBe(200);
    const result = (await saved.json()) as SaveDraftResult;
    expect(result.mdx).toContain("Hello again");

    const loaded = (await (await api("/api/drafts/blog/hello")).json()) as DraftFile;
    expect(loaded.meta.title).toBe("Hello again");
    expect(loaded.doc).toEqual(sampleDoc({ anatomyId: null }));

    const deleted = await api("/api/drafts/blog/hello", { method: "DELETE" });
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ trashed: expect.stringMatching(/^\.trash\/blog-hello-/) });
    expect((await api("/api/drafts/blog/hello")).status).toBe(404);
  });

  it("uploads assets and serves them back with ranges", async () => {
    await api("/api/drafts", { method: "POST", json: { kind: "projects", slug: "clip", title: "Clip" } });
    const video = Buffer.from("0123456789abcdef");
    const upload = await api("/api/drafts/projects/clip/assets?name=Demo%20Run.MP4", {
      method: "POST",
      headers: { "content-type": "video/mp4" },
      body: video,
    });
    expect(upload.status).toBe(201);
    const { src, url } = (await upload.json()) as UploadResult;
    expect(src).toBe("assets/demo-run.mp4");
    expect(url).toBe("/drafts/projects/clip/assets/demo-run.mp4");

    const whole = await api(url);
    expect(whole.status).toBe(200);
    expect(whole.headers.get("content-type")).toBe("video/mp4");
    expect(whole.headers.get("accept-ranges")).toBe("bytes");
    expect(await whole.text()).toBe("0123456789abcdef");

    const part = await api(url, { headers: { range: "bytes=4-7" } });
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe("bytes 4-7/16");
    expect(part.headers.get("content-length")).toBe("4");
    expect(await part.text()).toBe("4567");

    expect((await api(url, { headers: { range: "bytes=99-" } })).status).toBe(416);

    const etag = whole.headers.get("etag")!;
    expect((await api(url, { headers: { "if-none-match": etag } })).status).toBe(304);

    const head = await api(url, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("16");
  });

  it("uploads a PNG and serves it with an image content type", async () => {
    await api("/api/drafts", { method: "POST", json: { kind: "blog", slug: "pic", title: "Pic" } });
    const upload = await api("/api/drafts/blog/pic/assets", {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: PNG_BYTES,
    });
    const { url } = (await upload.json()) as UploadResult;
    expect(url).toBe("/drafts/blog/pic/assets/image.png");
    const res = await api(url);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(Buffer.from(PNG_BYTES));
  });

  it("reports figure requests and serves built figures", async () => {
    const draft = (await (
      await api("/api/drafts", { method: "POST", json: { kind: "blog", slug: "figs", title: "Figs" } })
    ).json()) as DraftFile;
    await api("/api/drafts/blog/figs", { method: "PUT", json: { meta: draft.meta, doc: sampleDoc({ anatomyId: "fig-1" }) } });
    let figures = await (await api("/api/drafts/blog/figs/figures")).json();
    expect(figures).toEqual({ figures: [expect.objectContaining({ id: "fig-1", built: false })], builtIds: [] });

    await repo.write("drafts/blog/figs/figures/fig-1.html", "<!doctype html><p>figure</p>");
    figures = await (await api("/api/drafts/blog/figs/figures")).json();
    expect(figures).toEqual({ figures: [expect.objectContaining({ id: "fig-1", built: true })], builtIds: ["fig-1"] });

    const page = await api("/drafts/blog/figs/figures/fig-1.html");
    expect(page.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await page.text()).toContain("figure");
  });

  it("lists the site and imports from it", async () => {
    await repo.write("repo/content/blog/on-site.mdx", '---\ntitle: "On site"\ndate: 2026-01-02\n---\nWords here.\n');
    const site = (await (await api("/api/site")).json()) as { entries: SiteEntry[] };
    expect(site.entries).toEqual([{ kind: "blog", slug: "on-site", title: "On site", date: "2026-01-02", drafted: false }]);

    const imported = await api("/api/import", { method: "POST", json: { kind: "blog", slug: "on-site" } });
    expect(imported.status).toBe(201);
    expect(((await imported.json()) as DraftFile).meta.title).toBe("On site");
    expect((await api("/api/import", { method: "POST", json: { kind: "blog", slug: "on-site" } })).status).toBe(409);
    expect((await api("/api/import", { method: "POST", json: { kind: "blog", slug: "gone" } })).status).toBe(404);
  });

  it("serves the repo's public folder under /site", async () => {
    await repo.write("repo/public/blog/x/cover.jpg", "jpeg");
    const res = await api("/site/blog/x/cover.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(await res.text()).toBe("jpeg");
    expect((await api("/site/blog/x/missing.jpg")).status).toBe(404);
  });
});

describe("validation and safety", () => {
  beforeEach(async () => {
    await api("/api/drafts", { method: "POST", json: { kind: "blog", slug: "safe", title: "Safe" } });
    await repo.write("repo/secret.txt", "secret");
    await repo.write("drafts/blog/safe/assets/ok.png", "ok");
  });

  it.each([
    "/drafts/blog/safe/assets/../meta.json",
    "/drafts/blog/safe/assets/..%2fmeta.json",
    "/drafts/blog/safe/assets/%2e%2e/%2e%2e/%2e%2e/repo/secret.txt",
    "/drafts/blog/safe/meta.json",
    "/drafts/blog/safe/draft.mdx",
    "/drafts/.trash/x",
    "/drafts/blog/..%2f..%2frepo/assets/x",
    "/site/../secret.txt",
    "/site/..%2fsecret.txt",
    "/site/%2e%2e/secret.txt",
    "/site/blog/%00x",
    "/drafts/blog/safe/assets/%E0%A4%A",
  ])("refuses %s", async (path) => {
    // 418 means the URL normalised to somewhere outside /drafts and /site
    // ("/site/../x" is just "/x") and went on to Vite, which is also safe.
    const status = await rawGet(path);
    expect([400, 404, 418]).toContain(status);
  });

  // macOS file systems ignore case, so any spelling of /drafts/ that slipped
  // past the routes would let Vite serve meta.json and friends. They must be
  // answered here (never 418, the fall-through) and never with the file.
  it.each([
    "/Drafts/blog/safe/meta.json",
    "/DRAFTS/blog/safe/doc.json",
    "/Drafts/blog/safe/draft.mdx",
    "/Drafts/.trash/x",
    "/%64rafts/blog/safe/meta.json",
    "/drafts%2Fblog/safe/meta.json",
    "/Site/secret.txt",
    "/API/drafts",
  ])("keeps %s away from Vite", async (path) => {
    expect([400, 404]).toContain(await rawGet(path));
  });

  it("serves a plain asset (the control for the cases above)", async () => {
    expect(await rawGet("/drafts/blog/safe/assets/ok.png")).toBe(200);
  });

  it.each(["/api/drafts/blog/..%2f..%2fx", "/api/drafts/archive/x", "/api/drafts/blog/Bad_Slug", "/api/drafts/blog/a--b/figures"])(
    "400s for %s",
    async (path) => {
      const res = await api(path);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: expect.any(String) });
    },
  );

  it("answers with JSON errors for bad bodies, methods and routes", async () => {
    const badJson = await api("/api/drafts", { method: "POST", body: "{nope", headers: { "content-type": "application/json" } });
    expect(badJson.status).toBe(400);
    expect(await badJson.json()).toEqual({ error: "The body is not valid JSON." });

    const empty = await api("/api/drafts", { method: "POST" });
    expect(empty.status).toBe(400);

    const wrongMethod = await api("/api/drafts/blog/safe", { method: "PATCH", json: {} });
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get("allow")).toBe("GET, PUT, DELETE");

    const unknown = await api("/api/whatever");
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: expect.stringContaining("/api/whatever") });

    const badSave = await api("/api/drafts/blog/safe", { method: "PUT", json: { meta: {}, doc: { type: "nope" } } });
    expect(badSave.status).toBe(400);
  });

  it("refuses writes from other origins", async () => {
    const res = await api("/api/drafts", {
      method: "POST",
      headers: { origin: "https://evil.example" },
      json: { kind: "blog", slug: "pwned", title: "x" },
    });
    expect(res.status).toBe(403);
    expect(await repo.exists("drafts/blog/pwned")).toBe(false);

    const sameOrigin = await api("/api/drafts", {
      method: "POST",
      headers: { origin: base },
      json: { kind: "blog", slug: "fine", title: "x" },
    });
    expect(sameOrigin.status).toBe(201);
  });

  it("rejects uploads that declare a size over the limit", async () => {
    const res = await new Promise<number>((resolve, reject) => {
      const req = http.request(`${base}/api/drafts/blog/safe/assets?name=huge.mp4`, {
        method: "POST",
        headers: { "content-length": String(300 * 1024 * 1024), "content-type": "video/mp4" },
      });
      req.on("response", (r) => {
        r.resume();
        resolve(r.statusCode ?? 0);
      });
      req.on("error", reject);
      req.write("x");
    });
    expect(res).toBe(413);
  });

  it("leaves everything else to Vite", async () => {
    expect((await api("/")).status).toBe(418);
    expect((await api("/src/main.tsx")).status).toBe(418);
    expect((await api("/apis")).status).toBe(418);
  });
});
