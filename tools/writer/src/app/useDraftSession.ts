// One open draft: loading it, holding its meta and doc, and getting every
// change to disk without the writer thinking about it.
//
// Saving: 700 ms after the last change, when the tab is hidden or loses
// focus, on Cmd+S, and when switching to another draft. One save is in flight
// at a time; changes made during it queue one more. Every change is also
// mirrored to localStorage first, so a dead server or a closed tab never
// loses work; the next load offers it back when it's newer than the disk.

import { useCallback, useEffect, useRef, useState } from "react";

import type { DraftDoc, DraftFile, DraftMeta } from "../shared/types";
import { ApiError, api, errorMessage, isAbort, type SaveResponse } from "./api";
import { normalizeDoc } from "./doc";
import { draftKey, type DraftRef } from "./paths";
import {
  clearLocalCopy,
  readLocalCopy,
  shouldOfferRestore,
  writeLocalCopy,
  type LocalCopy,
} from "./recovery";

export const AUTOSAVE_DELAY_MS = 700;
const LOCAL_COPY_DELAY_MS = 250;
const RETRY_FIRST_MS = 2_000;
const RETRY_MAX_MS = 30_000;
/** Browsers cap keepalive request bodies at 64 KB. */
const KEEPALIVE_LIMIT = 60_000;

export type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "missing" }
  | { status: "failed"; message: string };

export type SaveState =
  /** What's on screen is what's on disk. */
  | { status: "clean"; savedAt: string | null }
  /** Changes waiting for the debounce. */
  | { status: "pending" }
  | { status: "saving" }
  /** The server didn't answer; the work is in localStorage and retrying. */
  | { status: "offline" }
  | { status: "error"; message: string };

export interface DraftSession {
  load: LoadState;
  meta: DraftMeta | null;
  doc: DraftDoc | null;
  /** What the editor mounts with, and the key that remounts it (load, restore). */
  editor: { key: string; doc: DraftDoc } | null;
  save: SaveState;
  /** The server's draftToMdx error on the last save, if it threw. */
  exportError: string | null;
  /** draft.mdx as last written to disk. */
  diskMdx: string | null;
  /** Unsaved work from an earlier session, newer than the disk copy. */
  recovery: LocalCopy | null;
  setDoc(doc: DraftDoc): void;
  updateMeta(patch: Partial<DraftMeta>): void;
  saveNow(): Promise<void>;
  restoreRecovery(): void;
  dismissRecovery(): void;
  reload(): void;
  /** Drop unsaved work without saving it (the draft is being deleted). */
  forget(): void;
}

export interface SessionOptions {
  /** After every successful save (the rail updates its entry from this). */
  onSaved?(ref: DraftRef, meta: DraftMeta, doc: DraftDoc, result: SaveResponse): void;
}

export function useDraftSession(target: DraftRef | null, options: SessionOptions = {}): DraftSession {
  const [load, setLoad] = useState<LoadState>({ status: target ? "loading" : "idle" });
  const [meta, setMeta] = useState<DraftMeta | null>(null);
  const [doc, setDocState] = useState<DraftDoc | null>(null);
  const [editor, setEditor] = useState<{ key: string; doc: DraftDoc } | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "clean", savedAt: null });
  const [exportError, setExportError] = useState<string | null>(null);
  const [diskMdx, setDiskMdx] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<LocalCopy | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  // The live values the save path reads. State drives rendering; these refs
  // are what a timer or event handler sees, so nothing reads a stale closure.
  const refTarget = useRef<DraftRef | null>(null);
  const generation = useRef(0);
  const loaded = useRef(false);
  const metaRef = useRef<DraftMeta | null>(null);
  const docRef = useRef<DraftDoc | null>(null);
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const queued = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const localTimer = useRef<number | undefined>(undefined);
  const retryTimer = useRef<number | undefined>(undefined);
  const retryDelay = useRef(RETRY_FIRST_MS);
  const lastFailure = useRef<"offline" | "error" | null>(null);
  const onSavedRef = useRef(options.onSaved);
  onSavedRef.current = options.onSaved;

  const isDirty = () => loaded.current && revision.current !== savedRevision.current;

  const writeLocalNow = useCallback(() => {
    window.clearTimeout(localTimer.current);
    localTimer.current = undefined;
    const ref = refTarget.current;
    if (!ref || !metaRef.current || !docRef.current || !isDirty()) return;
    writeLocalCopy(ref, {
      meta: metaRef.current,
      doc: docRef.current,
      editedAt: new Date().toISOString(),
    });
  }, []);

  const saveNowRef = useRef<(opts?: { keepalive?: boolean }) => Promise<void>>(async () => {});

  const scheduleSave = useCallback((delay: number) => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveNowRef.current(), delay);
  }, []);

  const scheduleRetry = useCallback(() => {
    window.clearTimeout(retryTimer.current);
    const delay = retryDelay.current;
    retryDelay.current = Math.min(delay * 2, RETRY_MAX_MS);
    retryTimer.current = window.setTimeout(() => void saveNowRef.current(), delay);
  }, []);

  const saveNow = useCallback(
    (opts: { keepalive?: boolean } = {}): Promise<void> => {
      window.clearTimeout(saveTimer.current);
      window.clearTimeout(retryTimer.current);
      if (!loaded.current) return Promise.resolve();
      if (inFlight.current) {
        queued.current = true;
        return inFlight.current;
      }
      if (!isDirty()) return Promise.resolve();

      const ref = refTarget.current!;
      const gen = generation.current;
      const rev = revision.current;
      const body = { meta: metaRef.current!, doc: docRef.current! };
      const keepalive = !!opts.keepalive && JSON.stringify(body).length < KEEPALIVE_LIMIT;
      writeLocalNow();
      setSave({ status: "saving" });

      const run = (async () => {
        try {
          const result = await api.saveDraft(ref.kind, ref.slug, body, { keepalive });
          if (gen !== generation.current) return;
          savedRevision.current = Math.max(savedRevision.current, rev);
          retryDelay.current = RETRY_FIRST_MS;
          lastFailure.current = null;
          setExportError(result.error ?? null);
          setDiskMdx(result.error ? null : result.mdx);
          if (metaRef.current) metaRef.current = { ...metaRef.current, updatedAt: result.savedAt };
          setMeta((current) => (current ? { ...current, updatedAt: result.savedAt } : current));
          if (revision.current === rev) {
            clearLocalCopy(ref);
            setSave({ status: "clean", savedAt: result.savedAt });
          } else {
            setSave({ status: "pending" });
            scheduleSave(AUTOSAVE_DELAY_MS);
          }
          onSavedRef.current?.(ref, body.meta, body.doc, result);
        } catch (error) {
          if (gen !== generation.current) return;
          const apiError = error instanceof ApiError ? error : null;
          if (!apiError || apiError.offline || apiError.status >= 500) {
            lastFailure.current = apiError && !apiError.offline ? "error" : "offline";
            setSave(
              lastFailure.current === "offline"
                ? { status: "offline" }
                : { status: "error", message: errorMessage(error) },
            );
            scheduleRetry();
          } else {
            // A 4xx won't fix itself by retrying (bad draft, deleted folder).
            lastFailure.current = "error";
            setSave({ status: "error", message: errorMessage(error) });
          }
        } finally {
          if (gen === generation.current) {
            inFlight.current = null;
            if (queued.current) {
              queued.current = false;
              void saveNowRef.current();
            }
          }
        }
      })();
      inFlight.current = run;
      return run;
    },
    [scheduleRetry, scheduleSave, writeLocalNow],
  );
  saveNowRef.current = saveNow;

  const markChanged = useCallback(() => {
    revision.current += 1;
    setSave((current) => (current.status === "saving" ? current : { status: "pending" }));
    window.clearTimeout(localTimer.current);
    localTimer.current = window.setTimeout(writeLocalNow, LOCAL_COPY_DELAY_MS);
    // While offline, keep the backoff rather than hammering a dead server.
    if (lastFailure.current !== "offline") scheduleSave(AUTOSAVE_DELAY_MS);
  }, [scheduleSave, writeLocalNow]);

  const setDoc = useCallback(
    (next: DraftDoc) => {
      if (!loaded.current) return;
      docRef.current = next;
      setDocState(next);
      markChanged();
    },
    [markChanged],
  );

  const updateMeta = useCallback(
    (patch: Partial<DraftMeta>) => {
      if (!loaded.current || !metaRef.current) return;
      // kind and slug name the folder on disk; they never change from here.
      const { kind: _kind, slug: _slug, ...rest } = patch;
      const next = { ...metaRef.current, ...rest };
      metaRef.current = next;
      setMeta(next);
      markChanged();
    },
    [markChanged],
  );

  // Load whenever the selected draft changes; flush the old one on the way out.
  const targetKey = target ? draftKey(target) : null;
  useEffect(() => {
    if (!target) {
      refTarget.current = null;
      loaded.current = false;
      setLoad({ status: "idle" });
      setMeta(null);
      setDocState(null);
      setEditor(null);
      setRecovery(null);
      return;
    }
    const ref: DraftRef = { kind: target.kind, slug: target.slug };
    const gen = ++generation.current;
    const controller = new AbortController();
    refTarget.current = ref;
    loaded.current = false;
    revision.current = 0;
    savedRevision.current = 0;
    inFlight.current = null;
    queued.current = false;
    lastFailure.current = null;
    retryDelay.current = RETRY_FIRST_MS;
    setLoad({ status: "loading" });
    setRecovery(null);
    setExportError(null);
    setDiskMdx(null);

    api
      .getDraft(ref.kind, ref.slug, controller.signal)
      .then((file: DraftFile) => {
        if (gen !== generation.current) return;
        const loadedDoc = normalizeDoc(file.doc);
        metaRef.current = file.meta;
        docRef.current = loadedDoc;
        loaded.current = true;
        const local = readLocalCopy(ref);
        if (shouldOfferRestore(local, file)) {
          setRecovery(local);
        } else if (local) {
          clearLocalCopy(ref);
        }
        setMeta(file.meta);
        setDocState(loadedDoc);
        setEditor({ key: `${draftKey(ref)}#${gen}`, doc: loadedDoc });
        setSave({ status: "clean", savedAt: file.meta.updatedAt });
        setLoad({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (isAbort(error) || gen !== generation.current) return;
        if (error instanceof ApiError && error.notFound) {
          setLoad({ status: "missing" });
        } else {
          setLoad({ status: "failed", message: errorMessage(error) });
        }
      });

    return () => {
      controller.abort();
      window.clearTimeout(saveTimer.current);
      window.clearTimeout(retryTimer.current);
      if (!loaded.current || revision.current === savedRevision.current) return;
      // Leaving with unsaved work: write it out after any save in flight, so
      // the newest copy lands last. The local copy stays until it succeeds.
      writeLocalNow();
      const body = { meta: metaRef.current!, doc: docRef.current! };
      const onSaved = onSavedRef.current;
      const prior = inFlight.current ?? Promise.resolve();
      loaded.current = false;
      void prior
        .catch(() => undefined)
        .then(() => api.saveDraft(ref.kind, ref.slug, body))
        .then((result) => {
          clearLocalCopy(ref);
          onSaved?.(ref, body.meta, body.doc, result);
        })
        .catch(() => undefined);
    };
    // target is captured through targetKey; the effect must not rerun for a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, reloadNonce, writeLocalNow]);

  // Save on the way out of the tab or window; retry when the network returns.
  useEffect(() => {
    const onHide = () => {
      if (!isDirty()) return;
      writeLocalNow();
      void saveNowRef.current({ keepalive: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else if (isDirty() && lastFailure.current) void saveNowRef.current();
    };
    const onOnline = () => {
      retryDelay.current = RETRY_FIRST_MS;
      if (isDirty()) void saveNowRef.current();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      onHide();
      // Only ask when the server truly doesn't have the work yet.
      if (lastFailure.current) event.preventDefault();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onHide);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [writeLocalNow]);

  const restoreRecovery = useCallback(() => {
    const ref = refTarget.current;
    if (!ref || !recovery || !metaRef.current) return;
    const restoredDoc = normalizeDoc(recovery.doc);
    metaRef.current = {
      ...recovery.meta,
      kind: ref.kind,
      slug: ref.slug,
      createdAt: metaRef.current.createdAt,
      updatedAt: metaRef.current.updatedAt,
    };
    docRef.current = restoredDoc;
    setMeta(metaRef.current);
    setDocState(restoredDoc);
    setEditor({ key: `${draftKey(ref)}#${generation.current}-restored-${Date.now()}`, doc: restoredDoc });
    setRecovery(null);
    markChanged();
    void saveNowRef.current();
  }, [markChanged, recovery]);

  const dismissRecovery = useCallback(() => {
    const ref = refTarget.current;
    setRecovery(null);
    // If there are newer edits, the local copy is theirs now; keep it.
    if (ref && !isDirty()) clearLocalCopy(ref);
  }, []);

  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);
  const saveNowPublic = useCallback(() => saveNowRef.current(), []);

  const forget = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    window.clearTimeout(localTimer.current);
    window.clearTimeout(retryTimer.current);
    savedRevision.current = revision.current;
    loaded.current = false;
    queued.current = false;
    if (refTarget.current) clearLocalCopy(refTarget.current);
  }, []);

  return {
    load,
    meta,
    doc,
    editor,
    save,
    exportError,
    diskMdx,
    recovery,
    setDoc,
    updateMeta,
    saveNow: saveNowPublic,
    restoreRecovery,
    dismissRecovery,
    reload,
    forget,
  };
}
