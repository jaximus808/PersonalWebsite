// Smaller pieces of app state: built-figure status, uploads in progress,
// remembered layout preferences, and a media-query hook.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { FigureRequest, UploadResult } from "../shared/types";
import { api, errorMessage, isAbort, type UploadProgress } from "./api";
import { draftKey, type DraftRef } from "./paths";
import { browserStore } from "./recovery";

const FIGURE_POLL_MS = 4_000;

/**
 * The doc's anatomy requests, with `built` from the server. While any is
 * unbuilt it polls, so a figure Claude just built appears without a reload.
 */
export function useFigures(ref: DraftRef | null, requests: FigureRequest[]) {
  const [built, setBuilt] = useState<ReadonlySet<string>>(() => new Set());
  const key = ref ? draftKey(ref) : null;
  const anyUnbuilt = requests.some((request) => !built.has(request.id));
  const hasRequests = requests.length > 0;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!ref) return;
    try {
      // builtIds covers every page on disk, including ones whose request was
      // deleted: the editor reserves those ids for new requests.
      const { figures, builtIds } = await api.listFigures(ref.kind, ref.slug, signal);
      const next = new Set([...figures.filter((figure) => figure.built).map((figure) => figure.id), ...(builtIds ?? [])]);
      setBuilt((current) =>
        current.size === next.size && [...next].every((id) => current.has(id)) ? current : next,
      );
    } catch {
      // Quiet: a missed poll (or an aborted one) leaves the last known status.
    }
    // ref is identified by key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    setBuilt(new Set());
    if (!key) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [key, refresh]);

  useEffect(() => {
    if (!key || !hasRequests) return;
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    let timer: number | undefined;
    if (anyUnbuilt) {
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, FIGURE_POLL_MS);
    }
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [key, anyUnbuilt, hasRequests, refresh]);

  // A stable array while nothing changed, so the editor doesn't re-render.
  const signature = JSON.stringify(requests.map((r) => [r.id, r.title, r.prompt, r.caption, r.size, built.has(r.id)]));
  const figures = useMemo(
    () => requests.map((request) => ({ ...request, built: built.has(request.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );
  // Built pages with no request in the doc (deleted earlier).
  const builtKey = [...built].sort().join(",");
  const reservedIds = useMemo(
    () => [...built].filter((id) => !requests.some((request) => request.id === id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [builtKey, signature],
  );
  return { figures, reservedIds, refresh };
}

export type UploadItem = { id: number; name: string; loaded: number; total: number };

/** Uploads to the open draft, with progress for the top bar. */
export function useUploads(ref: DraftRef | null, onError: (message: string) => void) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const nextId = useRef(1);
  const refRef = useRef(ref);
  refRef.current = ref;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    const target = refRef.current;
    if (!target) throw new Error("No draft is open.");
    const id = nextId.current++;
    setUploads((list) => [...list, { id, name: file.name || "pasted file", loaded: 0, total: file.size }]);
    const onProgress = ({ loaded, total }: UploadProgress) =>
      setUploads((list) => list.map((item) => (item.id === id ? { ...item, loaded, total } : item)));
    try {
      return await api.uploadAsset(target.kind, target.slug, file, onProgress);
    } catch (error) {
      if (!isAbort(error)) onErrorRef.current(errorMessage(error));
      throw error;
    } finally {
      setUploads((list) => list.filter((item) => item.id !== id));
    }
  }, []);

  return { uploads, upload };
}

/** A layout preference remembered in this browser (rail open, panel tab, …). */
export function usePref<T>(name: string, fallback: T): [T, (value: T | ((current: T) => T)) => void] {
  const storageKey = `writer:pref:${name}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = browserStore()?.getItem(storageKey);
      return raw === null || raw === undefined ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  });
  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? (next as (c: T) => T)(current) : next;
        try {
          browserStore()?.setItem(storageKey, JSON.stringify(resolved));
        } catch {
          // A preference that doesn't stick is fine.
        }
        return resolved;
      });
    },
    [storageKey],
  );
  return [value, update];
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Re-render on an interval (for "4 min ago" labels). */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
