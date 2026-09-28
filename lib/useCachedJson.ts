import { useCallback, useEffect, useLayoutEffect, useState } from "react";

// Stale-while-revalidate for JSON endpoints: show the last known copy at
// once, refetch in the background, and only touch the screen and the cache
// when the server's answer differs.

const PREFIX = "jp-cache:v1:";

/** localStorage key for a cached endpoint, for code that reads it directly. */
export function cacheKey(url: string): string {
  return PREFIX + url;
}

// Survives client-side navigations; localStorage survives reloads.
const memory = new Map<string, string>();

// False until the first page has hydrated. Until then the cache must not be
// read during render, or the client's first render would not match the HTML.
let hydrated = false;

function readStored(url: string | null): string | null {
  if (!url || typeof window === "undefined") return null;
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

function dropStored(url: string) {
  memory.delete(url);
  try {
    window.localStorage.removeItem(cacheKey(url));
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

function usable(raw: string | null, isUsable: (data: any) => boolean) {
  if (!raw) return false;
  try {
    return isUsable(JSON.parse(raw));
  } catch {
    return false;
  }
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type Options = {
  /** Rejects answers that must not replace a good cached copy, such as
   *  `{ fail: true }` from a database hiccup. Must be a stable function. */
  isUsable?: (data: any) => boolean;
  /** Read the cache during the very first render, even while hydrating. Only
   *  for subtrees that tolerate differing from the server's HTML. */
  eager?: boolean;
};

type State = {
  url: string | null;
  raw: string | null;
  settled: boolean;
  failed: boolean;
  notFound: boolean;
};

type Result = {
  /** The JSON text as the server sent it, or null when nothing is known. */
  raw: string | null;
  /** Nothing to show yet and the request has not settled. */
  loading: boolean;
  /** The request settled without a usable answer and nothing is cached. */
  failed: boolean;
  /** The server answered 404; any cached copy has been dropped. */
  notFound: boolean;
  /** Run the request again. */
  retry: () => void;
};

const accept = () => true;

/** @param url endpoint returning JSON, also the cache key; null waits. */
export function useCachedJson(url: string | null, options: Options = {}): Result {
  const isUsable = options.isUsable ?? accept;
  const eager = options.eager ?? false;

  const fresh = (next: string | null, read: boolean): State => ({
    url: next,
    raw: read ? readStored(next) : null,
    settled: false,
    failed: false,
    notFound: false,
  });

  const [state, setState] = useState<State>(() =>
    fresh(url, eager || hydrated),
  );
  const [attempt, setAttempt] = useState(0);

  // A different endpoint (moving between posts): switch to its cached copy in
  // the same render, so the previous entry never shows under the new address.
  let current = state;
  if (state.url !== url) {
    current = fresh(url, true);
    setState(current);
  }

  // First load of the site: pick up the cache right after hydration, before
  // the browser paints the hydrated page.
  useIsomorphicLayoutEffect(() => {
    hydrated = true;
    const stored = readStored(url);
    if (!stored) return;
    setState((prev) =>
      prev.url === url && prev.raw === null ? { ...prev, raw: stored } : prev,
    );
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const apply = (change: (prev: State) => State) => {
      if (controller.signal.aborted) return;
      setState((prev) => (prev.url === url ? change(prev) : prev));
    };

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          dropStored(url);
          apply((prev) => ({
            ...prev,
            raw: null,
            settled: true,
            failed: false,
            notFound: true,
          }));
          return;
        }
        const text = res.ok ? await res.text() : null;
        if (!usable(text, isUsable)) {
          apply((prev) => ({ ...prev, settled: true, failed: true }));
          return;
        }
        if (text !== readStored(url)) writeStored(url, text as string);
        apply((prev) => ({
          ...prev,
          raw: text,
          settled: true,
          failed: false,
          notFound: false,
        }));
      })
      .catch(() => {
        apply((prev) => ({ ...prev, settled: true, failed: true }));
      });

    return () => controller.abort();
    // isUsable is stable by contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, attempt]);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, settled: false, failed: false }));
    setAttempt((n) => n + 1);
  }, []);

  const hasData = current.raw !== null;
  return {
    raw: current.raw,
    loading: !hasData && !current.settled,
    failed: !hasData && current.settled && current.failed,
    notFound: current.notFound,
    retry,
  };
}
