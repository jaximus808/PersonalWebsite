import { useEffect, useState } from "react";

// Stale-while-revalidate for small JSON lists: show the last known copy at
// once, refetch in the background, and only touch the screen and the cache
// when the server's answer differs.

const PREFIX = "jp-cache:v1:";

/** localStorage key for a cached endpoint, for code that reads it directly. */
export function cacheKey(url: string): string {
  return PREFIX + url;
}

// Survives client-side navigations; localStorage survives reloads.
const memory = new Map<string, string>();

function readStored(url: string): string | null {
  if (typeof window === "undefined") return null;
  const held = memory.get(url);
  if (held !== undefined) return held;
  try {
    const stored = window.localStorage.getItem(cacheKey(url));
    if (stored !== null) memory.set(url, stored);
    return stored;
  } catch {
    // Private mode or blocked storage: the memory copy is all there is.
    return null;
  }
}

function writeStored(url: string, raw: string) {
  memory.set(url, raw);
  try {
    window.localStorage.setItem(cacheKey(url), raw);
  } catch {
    // Storage full or unavailable; the memory copy still serves this visit.
  }
}

function parse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type Result = {
  /** The JSON text as the server sent it, or null when nothing is known. */
  raw: string | null;
  /** True until there is something to show or the request has settled. */
  loading: boolean;
};

/**
 * The cached copy is read during the first client render, so that render can
 * differ from the server's HTML. Callers must render the result in a subtree
 * that tolerates that (see ReadingSidebar, which fills the same markup from an
 * inline script before hydration).
 *
 * @param url      endpoint returning JSON; also the cache key
 * @param isUsable rejects answers that should not replace a good cached copy
 *                 (for example `{ fail: true }` from a database hiccup)
 */
export function useCachedJson<T>(
  url: string,
  isUsable: (data: T) => boolean = () => true,
): Result {
  const [raw, setRaw] = useState<string | null>(() => readStored(url));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let current = readStored(url);
    setRaw(current);
    setSettled(false);

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : null))
      .then((fresh) => {
        if (controller.signal.aborted) return;
        const data = parse<T>(fresh);
        if (fresh && data !== null && isUsable(data) && fresh !== current) {
          current = fresh;
          writeStored(url, fresh);
          setRaw(fresh);
        }
        setSettled(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled(true);
      });

    return () => controller.abort();
    // isUsable is a stable predicate by contract; keying on it would refetch
    // on every render for inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { raw, loading: raw === null && !settled };
}
