// Test fixtures: a throwaway repo (content/, public/) and drafts folder in the
// OS temp dir, so tests never touch the real site or Jaxon's drafts.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { DraftDoc } from "../src/shared/types.ts";

export interface TempRepo {
  root: string;
  repoRoot: string;
  draftsDir: string;
  write(rel: string, data: string | Uint8Array): Promise<string>;
  read(rel: string): Promise<string>;
  exists(rel: string): Promise<boolean>;
  cleanup(): Promise<void>;
}

export async function makeTempRepo(): Promise<TempRepo> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "writer-test-"));
  const repoRoot = path.join(root, "repo");
  const draftsDir = path.join(root, "drafts");
  for (const dir of ["content/blog", "content/projects", "public/blog", "public/projects"]) {
    await fs.mkdir(path.join(repoRoot, dir), { recursive: true });
  }
  await fs.mkdir(draftsDir, { recursive: true });
  const abs = (rel: string) => path.join(root, rel);
  return {
    root,
    repoRoot,
    draftsDir,
    async write(rel, data) {
      await fs.mkdir(path.dirname(abs(rel)), { recursive: true });
      await fs.writeFile(abs(rel), data);
      return abs(rel);
    },
    read: (rel) => fs.readFile(abs(rel), "utf8"),
    exists: (rel) =>
      fs.access(abs(rel)).then(
        () => true,
        () => false,
      ),
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}

/** A small doc exercising text, an uploaded figure and an anatomy request. */
export function sampleDoc(opts: { figureSrc?: string; anatomyId?: string | null } = {}): DraftDoc {
  const content: DraftDoc[] = [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "How it works" }] },
    { type: "paragraph", content: [{ type: "text", text: "The arm follows your hand in real time." }] },
    {
      type: "figure",
      attrs: {
        src: opts.figureSrc ?? "assets/arm.jpg",
        caption: "The arm on the bench",
        alt: "A robotic arm on a workbench",
        ratio: "standard",
        fit: "contain",
      },
    },
  ];
  if (opts.anatomyId !== null) {
    content.push({
      type: "anatomy",
      attrs: {
        id: opts.anatomyId ?? "fig-1",
        title: "Control loop",
        prompt: "Camera to hand pose to servo angles",
        caption: "The loop, once per frame",
        size: "figure",
      },
    });
  }
  return { type: "doc", content };
}

/** Tiny but real PNG bytes (1x1 transparent). */
export const PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  ),
);
