// The anatomy figures a draft asks for, and which are built, for Claude to
// work through with the anatomy skill:
//
//   npx tsx scripts/figures.ts blog/my-post
//
// Prints JSON: { draft, figuresDir, figures: [{ id, title, prompt, caption,
// size, built, file }] }. Each figure is a standalone HTML page written to
// `file`; the writer shows it as soon as it exists.

import path from "node:path";
import { pathToFileURL } from "node:url";

import type { FigureRequest, Kind } from "../src/shared/types.ts";
import { defaultPaths, parseDraftRef } from "../server/paths.ts";
import { DraftStore, errorMessage } from "../server/storage.ts";

export interface FiguresReport {
  draft: string;
  figuresDir: string;
  figures: (FigureRequest & { file: string })[];
}

export async function listFigures(options: {
  kind: Kind;
  slug: string;
  repoRoot?: string;
  draftsDir?: string;
}): Promise<FiguresReport> {
  const store = new DraftStore(defaultPaths(options));
  const figuresDir = store.files(options.kind, options.slug).figures;
  const figures = await store.figures(options.kind, options.slug);
  return {
    draft: `${options.kind}/${options.slug}`,
    figuresDir,
    figures: figures.map((f) => ({ ...f, file: path.join(figuresDir, `${f.id}.html`) })),
  };
}

export async function main(argv: string[]): Promise<number> {
  if (argv.length !== 1) {
    console.error("Usage: npx tsx scripts/figures.ts <kind>/<slug>");
    return 2;
  }
  try {
    console.log(JSON.stringify(await listFigures(parseDraftRef(argv[0]!)), null, 2));
    return 0;
  } catch (err) {
    console.error(errorMessage(err));
    return 1;
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
