// Publish a draft into the site:
//
//   npm --prefix tools/writer run build-draft -- <kind>/<slug> [--force]
//       [--allow-unbuilt-figures] [--dry-run] [--keep-remote]
//
// 1. Load the draft and lint it (raw MDX checked against the site's live
//    component map); stop on errors.
// 2. Every anatomy figure must be built (figures/<id>.html) unless
//    --allow-unbuilt-figures.
// 3. Refuse to overwrite content/<kind>/<slug>.mdx unless --force.
// 4. Copy referenced assets to public/<kind>/<slug>/ and built figures to
//    public/<kind>/<slug>/figures/. Remote (http) images are downloaded there
//    too, so the site never hotlinks (--keep-remote leaves them as links).
//    Nothing already in public/ is deleted; a different file under the same
//    name is only replaced with --force.
// 5. Compile the body with the site's MDX options; stop if it fails. Then
//    write content/<kind>/<slug>.mdx = draftToMdx(meta, doc).
// 6. Print a JSON summary. --dry-run checks everything and prints the plan
//    without writing or downloading anything.
//
// Every check runs before the first write, so a stopped build leaves the
// repo exactly as it was.

import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  compileMdxBody,
  componentNamesFromMdxContent,
  docToMdxBody,
  draftToMdx,
  figureRequests,
  lint,
  referencedAssets,
  SITE_COMPONENTS,
} from "../src/mdx/index.ts";
import type { DraftDoc, DraftMeta, Kind } from "../src/shared/types.ts";
import { copyFileAtomic, isFile, sameFileContents, writeFileAtomic } from "../server/fsutil.ts";
import { isMediaType } from "../server/mime.ts";
import {
  contentFile,
  defaultPaths,
  HttpError,
  isFigureId,
  parseDraftRef,
  publicDir,
  resolveInside,
  safeSegments,
} from "../server/paths.ts";
import { DraftStore, errorMessage, MAX_UPLOAD_BYTES, readFrontmatter, uploadFilename } from "../server/storage.ts";

export interface BuildOptions {
  kind: Kind;
  slug: string;
  repoRoot?: string;
  draftsDir?: string;
  /** Overwrite an existing site file, and replace differing files in public/. */
  force?: boolean;
  allowUnbuiltFigures?: boolean;
  dryRun?: boolean;
  /** Leave http(s) media as remote links instead of downloading them. */
  keepRemote?: boolean;
  /** Injectable for tests. */
  fetch?: typeof fetch;
}

export type CopyAction = "copy" | "replace" | "unchanged";

export interface CopyEntry {
  /** Repo-relative (or absolute, outside the repo) paths. */
  from: string;
  to: string;
  action: CopyAction;
}

export interface DownloadEntry {
  url: string;
  /** Where it lands; in a dry run, not known until the download. */
  to: string | null;
}

export interface BuildSummary {
  ok: boolean;
  dryRun: boolean;
  draft: string;
  /** The site file this build writes (or would write). */
  output: string;
  /** True once the file is written (always false in a dry run or a stopped build). */
  wrote: boolean;
  /** The site file existed before this build. */
  overwrote: boolean;
  copied: CopyEntry[];
  downloaded: DownloadEntry[];
  missingFigures: string[];
  warnings: string[];
  errors: string[];
}

export async function buildDraft(options: BuildOptions): Promise<BuildSummary> {
  const { repoRoot, draftsDir } = defaultPaths(options);
  const { kind, slug } = options;
  const store = new DraftStore({ repoRoot, draftsDir });
  const rel = (p: string) => {
    const r = path.relative(repoRoot, p);
    return r.startsWith("..") || path.isAbsolute(r) ? p : r.split(path.sep).join("/");
  };

  const outputFile = contentFile(repoRoot, kind, slug);
  const siteDir = publicDir(repoRoot, kind, slug);
  const summary: BuildSummary = {
    ok: false,
    dryRun: !!options.dryRun,
    draft: `${kind}/${slug}`,
    output: rel(outputFile),
    wrote: false,
    overwrote: false,
    copied: [],
    downloaded: [],
    missingFigures: [],
    warnings: [],
    errors: [],
  };
  const stop = () => summary;

  // 1. Load and lint ---------------------------------------------------------
  let meta: DraftMeta;
  let doc: DraftDoc;
  try {
    ({ meta, doc } = await store.load(kind, slug));
  } catch (err) {
    summary.errors.push(errorMessage(err));
    return stop();
  }
  const files = store.files(kind, slug);

  const siteComponents = await readSiteComponents(repoRoot);
  const problems = runLint(meta, doc, summary, siteComponents);
  if (problems.errors.length > 0) {
    summary.errors.push(...problems.errors);
    return stop();
  }

  // 2. Anatomy figures --------------------------------------------------------
  let requests: ReturnType<typeof figureRequests>;
  try {
    requests = figureRequests(doc);
  } catch (err) {
    summary.errors.push(`Could not read the figure requests: ${errorMessage(err)}`);
    return stop();
  }
  const builtFigures: string[] = [];
  for (const request of requests) {
    if (!isFigureId(request.id)) {
      summary.errors.push(`Figure id ${JSON.stringify(request.id)} is not a usable file name (lowercase letters, digits, hyphens).`);
      continue;
    }
    if (await isFile(path.join(files.figures, `${request.id}.html`))) builtFigures.push(request.id);
    else summary.missingFigures.push(request.id);
  }
  if (summary.missingFigures.length > 0) {
    const list = summary.missingFigures.join(", ");
    if (options.allowUnbuiltFigures) {
      summary.warnings.push(`Figures not built yet (their <Diagram> will point at a missing page): ${list}.`);
    } else {
      summary.errors.push(
        `Figures not built yet: ${list}. Build them (ask Claude to "build the figures for ${slug}") or pass --allow-unbuilt-figures.`,
      );
    }
  }
  if (summary.errors.length > 0) return stop();

  // 3. Existing site file -----------------------------------------------------
  summary.overwrote = await isFile(outputFile);
  if (summary.overwrote && !options.force) {
    summary.errors.push(`${rel(outputFile)} already exists. Pass --force to overwrite it.`);
    return stop();
  }

  // 4. Plan the copies --------------------------------------------------------
  let assets: string[];
  try {
    assets = referencedAssets(meta, doc);
  } catch (err) {
    summary.errors.push(`Could not list the draft's assets: ${errorMessage(err)}`);
    return stop();
  }
  const plan: { from: string; to: string }[] = [];
  for (const asset of new Set(assets)) {
    if (!asset.startsWith("assets/")) continue;
    let from: string;
    let to: string;
    try {
      const segments = safeSegments(asset.slice("assets/".length));
      from = resolveInside(files.assets, ...segments);
      to = resolveInside(siteDir, ...segments);
    } catch {
      summary.errors.push(`${asset} is not a plain file path.`);
      continue;
    }
    if (!(await isFile(from))) {
      summary.errors.push(`${asset} is used in the draft but missing from drafts/${kind}/${slug}/assets/.`);
      continue;
    }
    plan.push({ from, to });
  }
  for (const id of builtFigures) {
    plan.push({ from: path.join(files.figures, `${id}.html`), to: path.join(siteDir, "figures", `${id}.html`) });
  }

  const conflicts: string[] = [];
  for (const { from, to } of plan) {
    let action: CopyAction = "copy";
    if (await isFile(to)) {
      action = (await sameFileContents(from, to)) ? "unchanged" : "replace";
      if (action === "replace" && !options.force) conflicts.push(rel(to));
    }
    summary.copied.push({ from: rel(from), to: rel(to), action });
  }
  if (conflicts.length > 0) {
    summary.errors.push(
      `These files already exist in public/ with different contents: ${conflicts.join(", ")}. Pass --force to replace them, or rename the upload in the draft.`,
    );
  }

  const remote = options.keepRemote ? [] : remoteMedia(meta, doc);
  if (options.keepRemote && remoteMedia(meta, doc).length > 0) {
    summary.warnings.push("Remote images were left as links (--keep-remote); the site will hotlink them.");
  }
  summary.downloaded = remote.map((url) => ({ url, to: null }));
  if (summary.errors.length > 0) return stop();

  // Dry run: everything checked, nothing touched.
  if (options.dryRun) {
    let mdx: string;
    try {
      mdx = draftToMdx(meta, doc);
    } catch (err) {
      summary.errors.push(`Could not export MDX: ${errorMessage(err)}`);
      return stop();
    }
    const compileError = await compileCheck(meta, doc);
    if (compileError) {
      summary.errors.push(compileError);
      return stop();
    }
    if (summary.overwrote) summary.warnings.push(...(await droppedFrontmatter(outputFile, mdx)));
    summary.ok = true;
    return summary;
  }

  // Downloads go to a temp folder first, so a failed download writes nothing.
  const tempDir = remote.length > 0 ? await fsp.mkdtemp(path.join(os.tmpdir(), "writer-build-")) : null;
  try {
    const downloads = new Map<string, { temp: string; name: string }>();
    const reserved = new Set(plan.map((p) => path.relative(siteDir, p.to).split(path.sep).join("/")));
    for (const [i, url] of remote.entries()) {
      try {
        const got = await download(url, path.join(tempDir!, String(i)), options.fetch ?? fetch);
        const name = await pickDownloadName(uploadFilename(got.name, got.contentType), got.file, siteDir, reserved);
        reserved.add(name);
        downloads.set(url, { temp: got.file, name });
      } catch (err) {
        summary.errors.push(`Could not download ${url}: ${errorMessage(err)}`);
      }
    }
    if (summary.errors.length > 0) return stop();

    // Rewrite remote URLs to the downloaded files, then export.
    const toAsset = (src: string) => {
      const hit = downloads.get(src);
      return hit ? `assets/${hit.name}` : src;
    };
    const exportMeta = { ...meta, cover: meta.cover ? toAsset(meta.cover) : meta.cover } as DraftMeta;
    if (exportMeta.cover === undefined) delete exportMeta.cover;
    const exportDoc = mapMedia(doc, toAsset);

    let mdx: string;
    try {
      mdx = draftToMdx(exportMeta, exportDoc);
    } catch (err) {
      summary.errors.push(`Could not export MDX: ${errorMessage(err)}`);
      return stop();
    }
    if (downloads.size > 0) {
      // The remote-image warnings no longer apply; lint the final version.
      summary.warnings = summary.warnings.filter((w) => !problems.warnings.includes(w));
      runLint(exportMeta, exportDoc, summary, siteComponents);
    }
    // Last check before the first write: the body compiles the way the site
    // compiles it.
    const compileError = await compileCheck(exportMeta, exportDoc);
    if (compileError) {
      summary.errors.push(compileError);
      return stop();
    }
    if (summary.overwrote) summary.warnings.push(...(await droppedFrontmatter(outputFile, mdx)));

    // 4. Copy -----------------------------------------------------------------
    for (const [i, { from, to }] of plan.entries()) {
      if (summary.copied[i]!.action !== "unchanged") await copyFileAtomic(from, to);
    }
    for (const [url, { temp, name }] of downloads) {
      const to = resolveInside(siteDir, name);
      if (!(await isFile(to))) await copyFileAtomic(temp, to);
      summary.downloaded = summary.downloaded.map((d) => (d.url === url ? { url, to: rel(to) } : d));
    }

    // 5. Write the site file -----------------------------------------------------
    await writeFileAtomic(outputFile, mdx);
    summary.wrote = true;
    summary.ok = true;
    return summary;
  } finally {
    if (tempDir) await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------

/** Lint, with errors and warnings split; warnings are added to the summary. */
function runLint(meta: DraftMeta, doc: DraftDoc, summary: BuildSummary, siteComponents: readonly string[]) {
  let results: ReturnType<typeof lint>;
  try {
    results = lint(meta, doc, { siteComponents });
  } catch (err) {
    return { errors: [`Lint failed: ${errorMessage(err)}`], warnings: [] };
  }
  const errors = results.filter((r) => r.level === "error").map((r) => r.message);
  const warnings = results.filter((r) => r.level === "warn").map((r) => r.message);
  summary.warnings.push(...warnings);
  return { errors, warnings };
}

/**
 * The components the target repo's MdxContent.tsx registers, so a component
 * added to the site since the writer's list was updated still passes. Falls
 * back to the writer's list when the file can't be read or parsed (a temp
 * repo root in tests, or a reshaped map).
 */
async function readSiteComponents(repoRoot: string): Promise<readonly string[]> {
  try {
    const source = await fsp.readFile(path.join(repoRoot, "components", "content", "MdxContent.tsx"), "utf8");
    return componentNamesFromMdxContent(source) ?? SITE_COMPONENTS;
  } catch {
    return SITE_COMPONENTS;
  }
}

/** The site's compile, run on the body this build would write; null when it compiles. */
async function compileCheck(meta: DraftMeta, doc: DraftDoc): Promise<string | null> {
  let body: string;
  try {
    body = docToMdxBody(doc, { kind: meta.kind, slug: meta.slug });
  } catch (err) {
    return `Could not export MDX: ${errorMessage(err)}`;
  }
  const failure = await compileMdxBody(body);
  return failure ? `The page's MDX doesn't compile (${failure}). Fix it in the writer; the Preview shows the same error.` : null;
}

/**
 * Frontmatter keys the existing site file has and the new one drops. The
 * writer does not model every key (legacyId and legacyName feed the old-URL
 * redirects), so an overwrite says so out loud.
 */
async function droppedFrontmatter(existingFile: string, mdx: string): Promise<string[]> {
  try {
    const before = readFrontmatter(await fsp.readFile(existingFile, "utf8"));
    const after = readFrontmatter(mdx);
    return Object.keys(before)
      .filter((key) => !(key in after))
      .map((key) =>
        key.startsWith("legacy")
          ? `The existing file has "${key}: ${String(before[key])}", which the new file drops; it feeds the old-URL redirects, so add it back to the frontmatter.`
          : `The existing file has a "${key}" field the new file drops.`,
      );
  } catch {
    return [];
  }
}

type Node = DraftDoc;

/** Every http(s) media URL in the meta and doc, deduped, in order. */
export function remoteMedia(meta: DraftMeta, doc: DraftDoc): string[] {
  const found = new Set<string>();
  const visit = (src: unknown) => {
    // Protocol-relative "//cdn…" counts too; the mdx lint treats it as remote.
    if (typeof src === "string" && /^(https?:)?\/\//i.test(src.trim())) found.add(src);
  };
  visit(meta.cover);
  mapMedia(doc, (src) => {
    visit(src);
    return src;
  });
  return [...found];
}

/** A copy of the doc with every media path (figure, gallery, video) passed through `fn`. */
export function mapMedia(doc: DraftDoc, fn: (src: string) => string): DraftDoc {
  const walk = (node: Node): Node => {
    const attrs = node.attrs ? { ...node.attrs } : undefined;
    if (attrs) {
      if (node.type === "figure" && typeof attrs.src === "string") attrs.src = fn(attrs.src);
      if (node.type === "gallery" && Array.isArray(attrs.images)) {
        attrs.images = attrs.images.map((s: unknown) => (typeof s === "string" ? fn(s) : s));
      }
      if (node.type === "video") {
        if (typeof attrs.src === "string") attrs.src = fn(attrs.src);
        if (typeof attrs.poster === "string") attrs.poster = fn(attrs.poster);
      }
    }
    return {
      ...node,
      ...(attrs ? { attrs } : {}),
      ...(node.content ? { content: node.content.map(walk) } : {}),
    };
  };
  return walk(doc);
}

async function download(
  url: string,
  file: string,
  fetchImpl: typeof fetch,
): Promise<{ file: string; name: string; contentType: string | undefined }> {
  const absolute = url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim();
  const res = await fetchImpl(absolute, { redirect: "follow", signal: AbortSignal.timeout(60_000) });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? undefined;
  if (!isMediaType(contentType)) throw new Error(`it is ${contentType ?? "an unknown type"}, not an image or video`);
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) throw new Error("it is larger than 200 MB");

  const handle = await fsp.open(file, "w");
  let total = 0;
  try {
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.byteLength;
      if (total > MAX_UPLOAD_BYTES) throw new Error("it is larger than 200 MB");
      await handle.write(chunk);
    }
  } finally {
    await handle.close();
  }
  if (total === 0) throw new Error("it was empty");
  const last = new URL(res.url || absolute).pathname.split("/").pop() ?? "";
  let name: string;
  try {
    name = decodeURIComponent(last);
  } catch {
    name = last; // a stray "%" in the URL; uploadFilename sanitises it either way
  }
  return { file, name, contentType };
}

/**
 * A name in public/<kind>/<slug>/ for a download: its own name if free (or
 * already holding the same bytes, from an earlier build), else -2, -3, ….
 */
async function pickDownloadName(filename: string, temp: string, siteDir: string, reserved: Set<string>): Promise<string> {
  const dot = filename.lastIndexOf(".");
  const stem = filename.slice(0, dot);
  const ext = filename.slice(dot);
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? filename : `${stem}-${n}${ext}`;
    if (reserved.has(candidate)) continue;
    const target = path.join(siteDir, candidate);
    if (!(await isFile(target)) || (await sameFileContents(temp, target))) return candidate;
  }
}

// ---------------------------------------------------------------------------
// CLI

const USAGE = `Usage: npm run build-draft -- <kind>/<slug> [--force] [--allow-unbuilt-figures] [--dry-run] [--keep-remote]`;

export async function main(argv: string[]): Promise<number> {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const refs = argv.filter((a) => !a.startsWith("--"));
  const known = new Set(["--force", "--allow-unbuilt-figures", "--dry-run", "--keep-remote", "--help"]);
  const unknown = [...flags].filter((f) => !known.has(f));
  if (flags.has("--help")) {
    console.log(USAGE);
    return 0;
  }
  if (refs.length !== 1 || unknown.length > 0) {
    if (unknown.length > 0) console.error(`Unknown option: ${unknown.join(", ")}`);
    console.error(USAGE);
    return 2;
  }
  let ref: { kind: Kind; slug: string };
  try {
    ref = parseDraftRef(refs[0]!);
  } catch (err) {
    console.error(err instanceof HttpError ? err.message : errorMessage(err));
    console.error(USAGE);
    return 2;
  }

  const summary = await buildDraft({
    ...ref,
    force: flags.has("--force"),
    allowUnbuiltFigures: flags.has("--allow-unbuilt-figures"),
    dryRun: flags.has("--dry-run"),
    keepRemote: flags.has("--keep-remote"),
  });
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) {
    console.error(`\nStopped, nothing was written:\n${summary.errors.map((e) => `  - ${e}`).join("\n")}`);
    return 1;
  }
  if (summary.dryRun) console.error(`\nDry run: ${summary.output} would be written. Nothing was changed.`);
  else console.error(`\nWrote ${summary.output}.`);
  return 0;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
