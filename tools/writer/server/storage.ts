// Draft storage: one folder per draft under tools/writer/drafts.
//
//   drafts/<kind>/<slug>/
//     meta.json      DraftMeta
//     doc.json       TipTap JSON (the lossless editor state)
//     draft.mdx      draftToMdx(meta, doc): what the site file will be
//     anatomy.json   FigureRequest[]
//     assets/        uploads
//     figures/       <id>.html, built by Claude with the anatomy skill
//   drafts/.trash/   deleted drafts, moved here rather than removed
//
// Everything here is plain async functions over a DraftStore so the Vite
// plugin, the CLI scripts and the tests all share one implementation, and the
// repo root and drafts folder can point at temp dirs in tests.

import { randomBytes } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

import { draftToMdx, figureRequests, mdxToDraft, wordCount } from "../src/mdx/index.ts";
import type {
  CreateDraftBody,
  DraftDoc,
  DraftFile,
  DraftMeta,
  DraftSummary,
  FigureRequest,
  Kind,
  ProjectLink,
  SaveDraftBody,
  SaveDraftResult,
  SiteEntry,
  UploadResult,
} from "../src/shared/types.ts";
import {
  copyFileAtomic,
  isFile,
  KeyedQueue,
  pathExists,
  readJson,
  writeFileAtomic,
  writeJsonAtomic,
} from "./fsutil.ts";
import { extensionForType, UPLOAD_EXTENSIONS } from "./mime.ts";
import {
  assertKind,
  assertSlug,
  contentFile,
  defaultPaths,
  draftDir,
  draftFiles,
  HttpError,
  isFigureId,
  isSlug,
  KINDS,
  publicDir,
  resolveInside,
  safeSegments,
  type WriterPaths,
} from "./paths.ts";

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export interface DraftStoreOptions extends Partial<WriterPaths> {
  /** Injectable clock, for stable timestamps in tests. */
  now?: () => Date;
}

export interface ImportResult extends DraftFile {
  /** Files the site file referenced that could not be copied (missing on disk). */
  warnings: string[];
}

export interface DeleteResult {
  /** Where the draft went, relative to the drafts folder. */
  trashed: string;
}

export class DraftStore {
  readonly repoRoot: string;
  readonly draftsDir: string;
  private readonly clock: () => Date;
  private readonly queue = new KeyedQueue();

  constructor(options: DraftStoreOptions = {}) {
    const paths = defaultPaths(options);
    this.repoRoot = paths.repoRoot;
    this.draftsDir = paths.draftsDir;
    this.clock = options.now ?? (() => new Date());
  }

  get trashDir(): string {
    return path.join(this.draftsDir, ".trash");
  }

  /** The folder and files of one draft (validates kind and slug). */
  files(kind: Kind, slug: string) {
    return draftFiles(draftDir(this.draftsDir, assertKind(kind), assertSlug(slug)));
  }

  async exists(kind: Kind, slug: string): Promise<boolean> {
    return isFile(this.files(kind, slug).meta);
  }

  // -------------------------------------------------------------------------
  // List, create, load, save, delete

  /** Every draft, newest `updatedAt` first. Unreadable folders are skipped with a warning. */
  async list(): Promise<DraftSummary[]> {
    const summaries: DraftSummary[] = [];
    for (const kind of KINDS) {
      let entries: fs.Dirent[];
      try {
        entries = await fsp.readdir(path.join(this.draftsDir, kind), { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory() || !isSlug(entry.name)) continue;
        const slug = entry.name;
        try {
          const { meta, doc } = await this.load(kind, slug);
          summaries.push({
            kind,
            slug,
            title: meta.title,
            updatedAt: meta.updatedAt,
            words: safeWordCount(doc),
            published: await isFile(contentFile(this.repoRoot, kind, slug)),
          });
        } catch (err) {
          console.warn(`[writer] skipping drafts/${kind}/${slug}: ${errorMessage(err)}`);
        }
      }
    }
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.slug.localeCompare(b.slug));
  }

  /** A new draft with today's date and one empty paragraph. 409 if it exists. */
  async create(body: CreateDraftBody): Promise<DraftFile> {
    const input = asObject(body, "Request body");
    const kind = assertKind(input.kind);
    const slug = assertSlug(input.slug);
    const title = input.title === undefined ? "" : asString(input.title, "title").trim();

    const stamp = this.clock().toISOString();
    const meta: DraftMeta = { kind, slug, title, date: localDate(this.clock()), createdAt: stamp, updatedAt: stamp };
    const doc: DraftDoc = emptyDoc();

    await this.claimFolder(kind, slug, async () => {
      await this.writeDraft(kind, slug, meta, doc);
    });
    return { meta, doc };
  }

  async load(kind: Kind, slug: string): Promise<DraftFile> {
    const f = this.files(kind, slug);
    if (!(await isFile(f.meta))) throw new HttpError(404, `No draft ${kind}/${slug}.`);
    let meta: DraftMeta;
    let doc: DraftDoc;
    try {
      meta = await readJson<DraftMeta>(f.meta);
    } catch (err) {
      throw new HttpError(500, `drafts/${kind}/${slug}/meta.json is unreadable: ${errorMessage(err)}`);
    }
    try {
      doc = (await isFile(f.doc)) ? await readJson<DraftDoc>(f.doc) : emptyDoc();
    } catch (err) {
      throw new HttpError(500, `drafts/${kind}/${slug}/doc.json is unreadable: ${errorMessage(err)}`);
    }
    // The folder is the truth for where a draft lives.
    return { meta: { ...meta, kind, slug }, doc };
  }

  /**
   * Write meta.json, doc.json, draft.mdx and anatomy.json (each atomically).
   * If the export throws, the doc and meta are still saved and the result
   * carries `mdx: ""` plus the error, so a serializer bug never loses writing.
   */
  async save(kind: Kind, slug: string, body: SaveDraftBody): Promise<SaveDraftResult & { error?: string }> {
    const f = this.files(kind, slug);
    const input = asObject(body, "Request body");
    const doc = parseDoc(input.doc);
    return this.queue.run(f.dir, async () => {
      if (!(await isFile(f.meta))) {
        // Never resurrect a deleted draft from a stale tab's autosave.
        throw new HttpError(404, `No draft ${kind}/${slug}. It may have been deleted.`);
      }
      const existing = await readJson<DraftMeta>(f.meta).catch(() => null);
      const savedAt = this.clock().toISOString();
      const meta = parseMeta(input.meta, kind, slug);
      meta.createdAt = existing?.createdAt ?? meta.createdAt ?? savedAt;
      meta.updatedAt = savedAt;
      const { mdx, error } = await this.writeDraft(kind, slug, meta, doc);
      return error ? { savedAt, mdx, error } : { savedAt, mdx };
    });
  }

  /** Move the draft to drafts/.trash/<kind>-<slug>-<timestamp>. Nothing is ever hard-deleted. */
  async remove(kind: Kind, slug: string): Promise<DeleteResult> {
    const f = this.files(kind, slug);
    return this.queue.run(f.dir, async () => {
      if (!(await pathExists(f.dir))) throw new HttpError(404, `No draft ${kind}/${slug}.`);
      await fsp.mkdir(this.trashDir, { recursive: true });
      let name = `${kind}-${slug}-${trashStamp(this.clock())}`;
      if (await pathExists(path.join(this.trashDir, name))) name += `-${randomBytes(3).toString("hex")}`;
      await fsp.rename(f.dir, path.join(this.trashDir, name));
      return { trashed: `.trash/${name}` };
    });
  }

  // -------------------------------------------------------------------------
  // Assets and figures

  /**
   * Store an upload in assets/ under a safe, unique name ("Screen Shot 2.PNG"
   * → "screen-shot-2.png", then "-2", "-3" if taken). Streams to a temp file,
   * enforcing the size limit as bytes arrive, then claims the final name with
   * an exclusive hard link so two uploads can never take the same name.
   */
  async upload(
    kind: Kind,
    slug: string,
    name: string | undefined,
    data: AsyncIterable<Uint8Array> | Uint8Array,
    opts: { contentType?: string; maxBytes?: number } = {},
  ): Promise<UploadResult> {
    const f = this.files(kind, slug);
    if (!(await isFile(f.meta))) throw new HttpError(404, `No draft ${kind}/${slug}.`);
    const filename = uploadFilename(name, opts.contentType);
    const maxBytes = opts.maxBytes ?? MAX_UPLOAD_BYTES;

    await fsp.mkdir(f.assets, { recursive: true });
    const temp = path.join(f.assets, `.upload-${process.pid}-${randomBytes(6).toString("hex")}.tmp`);
    try {
      await streamToFile(data, temp, maxBytes);
      const finalName = await claimUniqueName(temp, f.assets, filename);
      const src = `assets/${finalName}`;
      return { src, url: `/drafts/${kind}/${slug}/${src}` };
    } finally {
      await fsp.rm(temp, { force: true });
    }
  }

  /** The draft's figure requests with `built` read from disk. */
  async figures(kind: Kind, slug: string): Promise<FigureRequest[]> {
    const f = this.files(kind, slug);
    if (!(await isFile(f.meta))) throw new HttpError(404, `No draft ${kind}/${slug}.`);
    let requests: FigureRequest[] | null = null;
    try {
      const stored = await readJson<unknown>(f.anatomy);
      if (Array.isArray(stored)) requests = stored as FigureRequest[];
    } catch {
      // Missing or corrupt: rebuild from the doc below.
    }
    if (!requests) {
      const { doc } = await this.load(kind, slug);
      requests = safeFigureRequests(doc).requests;
    }
    return this.withBuilt(f.figures, requests);
  }

  /** Ids of every built figure page in the draft (figures/<id>.html), requested or not. */
  async builtFigureIds(kind: Kind, slug: string): Promise<string[]> {
    const f = this.files(kind, slug);
    if (!(await isFile(f.meta))) throw new HttpError(404, `No draft ${kind}/${slug}.`);
    let names: string[];
    try {
      names = await fsp.readdir(f.figures);
    } catch {
      return []; // no figures/ folder yet
    }
    const ids: string[] = [];
    for (const name of names) {
      if (!name.endsWith(".html")) continue;
      const id = name.slice(0, -".html".length);
      if (isFigureId(id) && (await isFile(path.join(f.figures, name)))) ids.push(id);
    }
    return ids.sort();
  }

  private async withBuilt(figuresDir: string, requests: FigureRequest[]): Promise<FigureRequest[]> {
    return Promise.all(
      requests.map(async (request) => ({
        ...request,
        built: isFigureId(request.id) && (await isFile(path.join(figuresDir, `${request.id}.html`))),
      })),
    );
  }

  // -------------------------------------------------------------------------
  // The site side: what is published, and importing it back into a draft

  /** Every post and project on the site, newest first, from frontmatter. */
  async siteEntries(): Promise<SiteEntry[]> {
    const entries: SiteEntry[] = [];
    for (const kind of KINDS) {
      let names: string[];
      try {
        names = await fsp.readdir(path.join(this.repoRoot, "content", kind));
      } catch {
        continue;
      }
      for (const name of names) {
        if (!name.endsWith(".mdx")) continue;
        const slug = name.slice(0, -4);
        if (!isSlug(slug)) continue;
        let title = slug;
        let date = "";
        try {
          const source = await fsp.readFile(path.join(this.repoRoot, "content", kind, name), "utf8");
          const fm = readFrontmatter(source);
          if (typeof fm.title === "string" && fm.title.trim()) title = fm.title;
          date = formatDate(fm.date);
        } catch (err) {
          console.warn(`[writer] content/${kind}/${name}: ${errorMessage(err)}`);
        }
        entries.push({ kind, slug, title, date, drafted: await this.exists(kind, slug) });
      }
    }
    return entries.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  }

  /**
   * Turn content/<kind>/<slug>.mdx back into a draft: parse it, copy the
   * public/<kind>/<slug>/ files it references into assets/, and copy any
   * built anatomy figures into figures/ so they show as built.
   */
  async importFromSite(kindInput: unknown, slugInput: unknown): Promise<ImportResult> {
    const kind = assertKind(kindInput);
    const slug = assertSlug(slugInput);
    const source = contentFile(this.repoRoot, kind, slug);
    if (!(await isFile(source))) throw new HttpError(404, `content/${kind}/${slug}.mdx does not exist.`);
    const text = await fsp.readFile(source, "utf8");

    let parsed: ReturnType<typeof mdxToDraft>;
    try {
      parsed = mdxToDraft(text, { kind, slug, now: this.clock().toISOString() });
    } catch (err) {
      throw new HttpError(422, `Could not read content/${kind}/${slug}.mdx: ${errorMessage(err)}`);
    }
    const stamp = this.clock().toISOString();
    const meta: DraftMeta = { ...parsed.meta, kind, slug, createdAt: stamp, updatedAt: stamp };
    const doc = parsed.doc;
    const warnings: string[] = [];
    const sitePublic = publicDir(this.repoRoot, kind, slug);

    await this.claimFolder(kind, slug, async () => {
      const f = this.files(kind, slug);
      for (const asset of parsed.assets) {
        const rel = assetRelPath(asset, kind, slug);
        if (!rel) {
          warnings.push(`Skipped ${asset}: not under /${kind}/${slug}/.`);
          continue;
        }
        let from: string;
        let to: string;
        try {
          const segments = safeSegments(rel);
          from = resolveInside(sitePublic, ...segments);
          to = resolveInside(f.assets, ...segments);
        } catch {
          warnings.push(`Skipped ${asset}: not a plain file path.`);
          continue;
        }
        if (await isFile(from)) await copyFileAtomic(from, to);
        else warnings.push(`public/${kind}/${slug}/${rel} is referenced but missing.`);
      }
      for (const request of safeFigureRequests(doc).requests) {
        if (!isFigureId(request.id)) continue;
        const built = path.join(sitePublic, "figures", `${request.id}.html`);
        if (await isFile(built)) await copyFileAtomic(built, path.join(f.figures, `${request.id}.html`));
      }
      const { error } = await this.writeDraft(kind, slug, meta, doc);
      if (error) warnings.push(`Export check failed: ${error}`);
    });

    return { meta, doc, warnings };
  }

  // -------------------------------------------------------------------------
  // Internals

  /**
   * Create the draft folder exclusively (409 if it exists), run `fill`, and
   * remove the folder again if filling fails, so a half-made draft never
   * shows up in the list.
   */
  private async claimFolder(kind: Kind, slug: string, fill: () => Promise<void>): Promise<void> {
    const f = this.files(kind, slug);
    await fsp.mkdir(path.dirname(f.dir), { recursive: true });
    try {
      await fsp.mkdir(f.dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        throw new HttpError(409, `A draft ${kind}/${slug} already exists.`);
      }
      throw err;
    }
    try {
      await fsp.mkdir(f.assets, { recursive: true });
      await fsp.mkdir(f.figures, { recursive: true });
      await fill();
    } catch (err) {
      await fsp.rm(f.dir, { recursive: true, force: true });
      throw err;
    }
  }

  /** Write the four draft files. doc.json first, meta.json last (it carries updatedAt). */
  private async writeDraft(
    kind: Kind,
    slug: string,
    meta: DraftMeta,
    doc: DraftDoc,
  ): Promise<{ mdx: string; error?: string }> {
    const f = this.files(kind, slug);
    await writeJsonAtomic(f.doc, doc);

    let mdx = "";
    let error: string | undefined;
    try {
      mdx = draftToMdx(meta, doc);
    } catch (err) {
      error = `Could not export MDX: ${errorMessage(err)}`;
    }
    await writeFileAtomic(f.mdx, mdx);

    const figures = safeFigureRequests(doc);
    if (figures.error && !error) error = `Could not read figure requests: ${figures.error}`;
    await writeJsonAtomic(f.anatomy, await this.withBuilt(f.figures, figures.requests));

    await writeJsonAtomic(f.meta, meta);
    return error ? { mdx, error } : { mdx };
  }
}

// ---------------------------------------------------------------------------
// Validation of request bodies

function asObject(value: unknown, what: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${what} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new HttpError(400, `meta.${field} must be a string.`);
  return value;
}

function parseDoc(value: unknown): DraftDoc {
  const doc = asObject(value, "doc");
  if (doc.type !== "doc") throw new HttpError(400, `doc.type must be "doc".`);
  if (doc.content !== undefined && !Array.isArray(doc.content)) {
    throw new HttpError(400, "doc.content must be an array.");
  }
  return doc as DraftDoc;
}

const OPTIONAL_STRINGS = ["cover", "summary", "youtube"] as const;
const OPTIONAL_FLAGS = ["featured", "hideCover"] as const;

/**
 * Check the meta the app sends. Known fields must have the right types;
 * empty optional strings are dropped; unknown fields pass through untouched
 * (so frontmatter the writer does not model, like an imported legacyId, is
 * kept for the exporter to decide on).
 */
export function parseMeta(value: unknown, kind: Kind, slug: string): DraftMeta {
  const input = asObject(value, "meta");
  if (input.kind !== undefined && input.kind !== kind) {
    throw new HttpError(400, `meta.kind is ${JSON.stringify(input.kind)} but this draft is ${kind}.`);
  }
  if (input.slug !== undefined && input.slug !== slug) {
    throw new HttpError(400, `meta.slug is ${JSON.stringify(input.slug)} but this draft is ${slug}. Renaming is not supported.`);
  }
  const meta: Record<string, unknown> = { ...input, kind, slug };
  meta.title = asString(input.title ?? "", "title");
  meta.date = asString(input.date ?? "", "date");

  for (const key of OPTIONAL_STRINGS) {
    if (input[key] === undefined || input[key] === null || input[key] === "") delete meta[key];
    else meta[key] = asString(input[key], key);
  }
  for (const key of OPTIONAL_FLAGS) {
    if (input[key] === undefined || input[key] === null) delete meta[key];
    else if (typeof input[key] !== "boolean") throw new HttpError(400, `meta.${key} must be true or false.`);
  }
  if (input.links === undefined || input.links === null) {
    delete meta.links;
  } else {
    if (!Array.isArray(input.links)) throw new HttpError(400, "meta.links must be a list.");
    meta.links = input.links.map((link, i): ProjectLink => {
      const l = asObject(link, `meta.links[${i}]`);
      if (typeof l.label !== "string" || typeof l.href !== "string") {
        throw new HttpError(400, `meta.links[${i}] needs a label and an href.`);
      }
      return { label: l.label, href: l.href };
    });
  }
  for (const key of ["createdAt", "updatedAt"] as const) {
    if (input[key] !== undefined && typeof input[key] !== "string") delete meta[key];
  }
  return meta as unknown as DraftMeta;
}

// ---------------------------------------------------------------------------
// Upload naming

/**
 * A safe filename for an upload: basename only, lowercase, ASCII letters,
 * digits, "-" and "_", a known image/video extension. A nameless upload (a
 * pasted screenshot) gets "image" or "video" plus an extension from its type.
 */
export function uploadFilename(name: string | undefined, contentType?: string): string {
  const raw = (name ?? "").split(/[\\/]/).pop() ?? "";
  const dot = raw.lastIndexOf(".");
  let ext = dot > 0 ? raw.slice(dot).toLowerCase() : "";
  let stem = dot > 0 ? raw.slice(0, dot) : raw;
  if (!ext || !UPLOAD_EXTENSIONS.has(ext)) {
    const fromType = extensionForType(contentType);
    if (ext && !fromType) {
      throw new HttpError(415, `${ext} files are not supported. Upload an image or a video.`);
    }
    if (!fromType) throw new HttpError(415, "Upload an image or a video (the file type was not recognised).");
    if (ext) stem = raw; // keep "photo.final" readable as "photo-final"
    ext = fromType;
  }
  stem = sanitizeStem(stem);
  if (!stem) stem = ext === ".mp4" || ext === ".mov" || ext === ".webm" || ext === ".m4v" || ext === ".ogv" ? "video" : "image";
  return `${stem}${ext}`;
}

export function sanitizeStem(stem: string): string {
  return stem
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 60)
    .replace(/[-_]+$/g, "");
}

/** "a.png", then "a-2.png", "a-3.png", … the first name not already taken in `dir`. */
export function dedupeName(filename: string, taken: (name: string) => boolean): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  if (!taken(filename)) return filename;
  for (let n = 2; ; n++) {
    const candidate = `${stem}-${n}${ext}`;
    if (!taken(candidate)) return candidate;
  }
}

async function claimUniqueName(temp: string, dir: string, filename: string): Promise<string> {
  const dot = filename.lastIndexOf(".");
  const stem = filename.slice(0, dot);
  const ext = filename.slice(dot);
  for (let n = 1; n < 10_000; n++) {
    const candidate = n === 1 ? filename : `${stem}-${n}${ext}`;
    try {
      // link() fails with EEXIST instead of overwriting: an atomic "claim".
      await fsp.link(temp, path.join(dir, candidate));
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }
  throw new HttpError(500, `Could not find a free name for ${filename}.`);
}

async function streamToFile(data: AsyncIterable<Uint8Array> | Uint8Array, file: string, maxBytes: number) {
  if (data instanceof Uint8Array) {
    if (data.byteLength > maxBytes) throw tooLarge(maxBytes);
    if (data.byteLength === 0) throw new HttpError(400, "The upload was empty.");
    await fsp.writeFile(file, data);
    return;
  }
  const handle = await fsp.open(file, "w");
  let total = 0;
  try {
    for await (const chunk of data) {
      total += chunk.byteLength;
      if (total > maxBytes) throw tooLarge(maxBytes);
      await handle.write(chunk);
    }
  } finally {
    await handle.close();
  }
  if (total === 0) throw new HttpError(400, "The upload was empty.");
}

function tooLarge(maxBytes: number): HttpError {
  return new HttpError(413, `That file is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`);
}

// ---------------------------------------------------------------------------
// Helpers

export function emptyDoc(): DraftDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** YYYY-MM-DD in local time (a post written at 11pm is dated today, not tomorrow UTC). */
export function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function trashStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").replace(/\..*$/, "") + `-${String(date.getMilliseconds()).padStart(3, "0")}`;
}

/** "/blog/x/a.jpg" or "assets/a.jpg" → "a.jpg"; anything else → null. */
function assetRelPath(asset: string, kind: Kind, slug: string): string | null {
  const sitePrefix = `/${kind}/${slug}/`;
  if (asset.startsWith(sitePrefix)) return asset.slice(sitePrefix.length);
  if (asset.startsWith("assets/")) return asset.slice("assets/".length);
  return null;
}

/** The YAML frontmatter of an .mdx file as a plain object ({} if there is none). */
export function readFrontmatter(source: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  if (!match) return {};
  const data: unknown = YAML.parse(match[1]!);
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function formatDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.trim();
  return "";
}

export function safeWordCount(doc: DraftDoc): number {
  try {
    return wordCount(doc);
  } catch {
    return 0;
  }
}

function safeFigureRequests(doc: DraftDoc): { requests: FigureRequest[]; error?: string } {
  try {
    return { requests: figureRequests(doc) };
  } catch (err) {
    return { requests: [], error: errorMessage(err) };
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
