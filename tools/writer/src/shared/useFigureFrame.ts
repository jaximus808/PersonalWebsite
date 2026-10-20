// Sizes an <iframe> holding a built Anatomy figure page to the page's own
// height, the same way the site's components/content/Diagram.tsx does, so the
// editor's figure block and the preview show the frame exactly as the
// published page will.
//
// The measure is the root element's box: unlike scrollHeight, which never
// reports less than the frame itself, it is the content's height, so the frame
// shrinks as well as grows when the column narrows or widens. It also counts a
// last child's bottom margin that collapses through <body>, which measuring
// the body misses (the figure card's bottom edge was clipped that way).

import { useCallback, useEffect, useRef, useState } from "react";

export interface FigureFrame {
  ref: React.RefObject<HTMLIFrameElement | null>;
  /** Measured height in px, or null until the page has loaded. */
  height: number | null;
  /** Pass to the iframe's onLoad. */
  onLoad(): void;
}

export function useFigureFrame(src: string): FigureFrame {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const detach = useRef<(() => void) | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const attach = useCallback(() => {
    detach.current?.();
    detach.current = null;

    const frame = ref.current;
    let doc: Document | null = null;
    try {
      doc = frame?.contentDocument ?? null;
    } catch {
      doc = null; // cross-origin: keep the fallback shape
    }
    const win = frame?.contentWindow as (Window & typeof globalThis) | null;
    // A lazy frame starts on about:blank; its real load calls this again.
    if (!doc || !win || doc.URL === "about:blank" || !doc.documentElement) return;

    const root = doc.documentElement;
    const measure = () => {
      const next = Math.ceil(root.getBoundingClientRect().height);
      if (next > 0) setHeight((previous) => (previous === next ? previous : next));
    };
    measure();

    // Created in the frame's own window: observing another document's
    // elements from this one isn't reliable across browsers.
    const Observer = win.ResizeObserver ?? window.ResizeObserver;
    const observer = new Observer(measure);
    observer.observe(root);
    if (doc.body) observer.observe(doc.body);
    detach.current = () => observer.disconnect();
  }, []);

  // A frame that loaded before React attached its handler never reports the
  // load, so try once on mount and again whenever the source changes.
  useEffect(() => {
    setHeight(null);
    attach();
    return () => {
      detach.current?.();
      detach.current = null;
    };
  }, [src, attach]);

  return { ref, height, onLoad: attach };
}
