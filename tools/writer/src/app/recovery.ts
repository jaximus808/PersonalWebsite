// A second copy of unsaved work in localStorage. Every change lands here
// first, and is cleared once the server has it; if the tab dies, the server
// goes away, or a save fails, the next load offers it back.

import type { DraftDoc, DraftFile, DraftMeta } from "../shared/types";
import { draftKey, type DraftRef } from "./paths";

const PREFIX = "writer:unsaved:";

export interface LocalCopy {
  meta: DraftMeta;
  doc: DraftDoc;
  /** When the writer last changed it (ISO). */
  editedAt: string;
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** localStorage, or null where it's unavailable (private mode, blocked). */
export function browserStore(): Store | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function storageKey(ref: DraftRef): string {
  return PREFIX + draftKey(ref);
}

export function writeLocalCopy(ref: DraftRef, copy: LocalCopy, store = browserStore()): boolean {
  if (!store) return false;
  try {
    store.setItem(storageKey(ref), JSON.stringify(copy));
    return true;
  } catch {
    // Quota exceeded or storage blocked: the server copy is still the truth.
    return false;
  }
}

export function readLocalCopy(ref: DraftRef, store = browserStore()): LocalCopy | null {
  if (!store) return null;
  try {
    const raw = store.getItem(storageKey(ref));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalCopy>;
    if (!parsed || typeof parsed !== "object" || !parsed.meta || !parsed.doc || !parsed.editedAt) {
      return null;
    }
    return parsed as LocalCopy;
  } catch {
    return null;
  }
}

export function clearLocalCopy(ref: DraftRef, store = browserStore()): void {
  try {
    store?.removeItem(storageKey(ref));
  } catch {
    // Nothing to do: a stale copy is only ever offered, never applied silently.
  }
}

/** JSON with sorted keys, so two copies of the same content compare equal. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) => {
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return Object.fromEntries(
        Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      );
    }
    return inner;
  });
}

/** What the writer actually wrote: meta minus bookkeeping, plus the doc. */
function content(meta: DraftMeta, doc: DraftDoc): string {
  const { createdAt: _created, updatedAt: _updated, ...rest } = meta;
  return stableStringify({ meta: rest, doc });
}

/**
 * Offer the local copy back only when it's newer than what the server has
 * and actually differs from it. Anything else is stale and can go.
 */
export function shouldOfferRestore(local: LocalCopy | null, server: DraftFile): boolean {
  if (!local) return false;
  const localTime = Date.parse(local.editedAt);
  const serverTime = Date.parse(server.meta.updatedAt);
  if (Number.isNaN(localTime)) return false;
  if (!Number.isNaN(serverTime) && localTime <= serverTime) return false;
  return content(local.meta, local.doc) !== content(server.meta, server.doc);
}
