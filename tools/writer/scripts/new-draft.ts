// Create a draft from the command line, with or without the dev server
// running (the server reads the drafts folder fresh on every request).
//
//   npx tsx scripts/new-draft.ts blog/my-post "My post"
//   npx tsx scripts/new-draft.ts projects "Hand tracking arm"   (slug from the title)
//
// If the draft already exists it is left alone and reported. Prints JSON:
// { kind, slug, title, created, dir, url }.

import path from "node:path";
import { pathToFileURL } from "node:url";

import { WRITER_PORT, type Kind } from "../src/shared/types.ts";
import { assertKind, assertSlug, defaultPaths, HttpError, isKind, parseDraftRef, slugify } from "../server/paths.ts";
import { DraftStore, errorMessage } from "../server/storage.ts";

export interface NewDraftResult {
  kind: Kind;
  slug: string;
  title: string;
  created: boolean;
  dir: string;
  url: string;
}

export async function newDraft(options: {
  kind: Kind;
  slug: string;
  title: string;
  repoRoot?: string;
  draftsDir?: string;
}): Promise<NewDraftResult> {
  const store = new DraftStore(defaultPaths(options));
  const kind = assertKind(options.kind);
  const slug = assertSlug(options.slug);
  let created = true;
  let title = options.title;
  try {
    await store.create({ kind, slug, title });
  } catch (err) {
    if (!(err instanceof HttpError && err.status === 409)) throw err;
    created = false;
    title = (await store.load(kind, slug)).meta.title;
  }
  return {
    kind,
    slug,
    title,
    created,
    dir: store.files(kind, slug).dir,
    url: `http://localhost:${WRITER_PORT}/?draft=${kind}/${slug}`,
  };
}

const USAGE = `Usage: npx tsx scripts/new-draft.ts <kind>/<slug> ["Title"]
       npx tsx scripts/new-draft.ts <kind> "Title"   (slug made from the title)`;

export async function main(argv: string[]): Promise<number> {
  const [first, ...titleWords] = argv;
  if (!first || first === "--help") {
    console.error(USAGE);
    return first ? 0 : 2;
  }
  const title = titleWords.join(" ").trim();
  let kind: Kind;
  let slug: string;
  try {
    if (isKind(first)) {
      kind = first;
      slug = slugify(title);
      if (!slug) throw new HttpError(400, "Give a title to make the slug from.");
    } else {
      ({ kind, slug } = parseDraftRef(first));
    }
    const result = await newDraft({ kind, slug, title });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (err) {
    console.error(errorMessage(err));
    console.error(USAGE);
    return err instanceof HttpError && err.status === 400 ? 2 : 1;
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
