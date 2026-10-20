// Small filesystem helpers. The important one is writeFileAtomic: every file
// the writer owns is written to a temp file beside it and renamed into place,
// so a crash or a killed dev server never leaves half a doc.json behind.

import { randomBytes } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

function tempPathFor(file: string): string {
  return path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
}

export async function writeFileAtomic(file: string, data: string | Uint8Array): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const temp = tempPathFor(file);
  try {
    await fsp.writeFile(temp, data);
    await fsp.rename(temp, file);
  } catch (err) {
    await fsp.rm(temp, { force: true });
    throw err;
  }
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Copy via a temp file + rename, so a reader never sees a partial copy. */
export async function copyFileAtomic(from: string, to: string): Promise<void> {
  await fsp.mkdir(path.dirname(to), { recursive: true });
  const temp = tempPathFor(to);
  try {
    await fsp.copyFile(from, temp);
    await fsp.rename(temp, to);
  } catch (err) {
    await fsp.rm(temp, { force: true });
    throw err;
  }
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fsp.readFile(file, "utf8")) as T;
}

export async function pathExists(file: string): Promise<boolean> {
  try {
    await fsp.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function isFile(file: string): Promise<boolean> {
  try {
    return (await fsp.stat(file)).isFile();
  } catch {
    return false;
  }
}

/** Byte-for-byte equal (sizes first, so the common case is one stat each). */
export async function sameFileContents(a: string, b: string): Promise<boolean> {
  const [sa, sb] = await Promise.all([fsp.stat(a), fsp.stat(b)]);
  if (sa.size !== sb.size) return false;
  const [ba, bb] = await Promise.all([fsp.readFile(a), fsp.readFile(b)]);
  return ba.equals(bb);
}

/** Every regular file below `dir`, as paths relative to it with "/" separators. */
export async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string, prefix: string) {
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(current, entry.name), rel);
      else if (entry.isFile()) out.push(rel);
    }
  }
  await walk(dir, "");
  return out.sort();
}

/**
 * Serialises async work per key, so two saves of the same draft (an autosave
 * racing a Cmd+S) run one after the other instead of interleaving writes.
 */
export class KeyedQueue {
  private tails = new Map<string, Promise<unknown>>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const next = previous.then(task, task);
    const tail = next.catch(() => undefined);
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return next;
  }
}
