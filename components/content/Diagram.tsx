// An Anatomy figure (an interactive isometric drawing built with the anatomy
// skill) embedded in a post or project. The figure is its own standalone HTML
// page under public/<kind>/<slug>/figures/, so its script and styles stay
// sealed off from the article; this component gives it the text's width, sizes
// the frame to the page inside it, and adds the same caption as <Figure>.
//
// The figure page owns everything that happens inside it, including stopping
// its motion under prefers-reduced-motion and when it scrolls offscreen.

import { useCallback, useEffect, useRef, useState } from "react";

import { Caption } from "./Figure";

// Shape of the frame before the figure page has loaded (or if it can't be
// measured). Close to the kit's default 600 × 380 card, so the swap to the
// measured height is small.
const FALLBACK_RATIO = "16 / 10";

type DiagramProps = {
  /** The built figure page, e.g. /blog/my-post/figures/fig-1.html. */
  src: string;
  /** What the figure shows, for screen readers. Falls back to the caption. */
  title?: string;
  caption?: React.ReactNode;
  /**
   * "figure" (default) or "hero" for a large centrepiece. Media on the site is
   * always exactly as wide as the text, so a hero keeps that width and gets
   * more air above and below instead.
   */
  size?: "figure" | "hero";
};

/**
 * An interactive figure page in a frame the width of the text.
 *
 *   <Diagram src="/blog/x/figures/fig-1.html" title="The teleop loop" caption="One frame, end to end" />
 *   <Diagram src="/projects/x/figures/rig.html" size="hero" />
 */
export default function Diagram({ src, title, caption, size = "figure" }: DiagramProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const detach = useRef<(() => void) | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  // Follow the height of the page inside the frame. The figure is served from
  // the same origin, so its document can be read directly; anything else
  // (a cross-origin src, or the blank document a lazy frame starts with)
  // keeps the fallback ratio.
  const attach = useCallback(() => {
    detach.current?.();
    detach.current = null;

    const iframe = frame.current;
    let doc: Document | null = null;
    try {
      doc = iframe?.contentDocument ?? null;
    } catch {
      doc = null;
    }
    const win = iframe?.contentWindow as (Window & typeof globalThis) | null;
    if (!doc || !win || doc.URL === "about:blank" || !doc.documentElement) return;

    // The root element's own box is the content height (unlike scrollHeight,
    // which never reports less than the frame), so the frame can shrink as
    // well as grow when the text column narrows or widens.
    const root = doc.documentElement;
    const measure = () => {
      const next = Math.ceil(root.getBoundingClientRect().height);
      if (next > 0) setHeight((previous) => (previous === next ? previous : next));
    };
    measure();

    // Create the observer in the frame's own window: observing elements of
    // another document from this one isn't reliable across browsers.
    const Observer = win.ResizeObserver ?? window.ResizeObserver;
    if (Observer) {
      const observer = new Observer(measure);
      observer.observe(root);
      if (doc.body) observer.observe(doc.body);
      detach.current = () => observer.disconnect();
    } else {
      win.addEventListener("resize", measure);
      detach.current = () => win.removeEventListener("resize", measure);
    }
  }, []);

  // A frame that finished loading before hydration never fires onLoad for
  // React, so try once on mount (and again whenever the source changes).
  useEffect(() => {
    setHeight(null);
    attach();
    return () => {
      detach.current?.();
      detach.current = null;
    };
  }, [src, attach]);

  const label = title ?? (typeof caption === "string" ? caption : "Interactive figure");
  const measured = height !== null;

  return (
    <figure className={size === "hero" ? "my-14" : "my-10"}>
      <iframe
        ref={frame}
        src={src}
        title={label}
        loading="lazy"
        onLoad={attach}
        // A quiet placeholder box until the figure has loaded and been sized.
        className={`block w-full border-0 ${
          measured ? "bg-transparent" : "rounded bg-white/[0.03]"
        }`}
        style={{
          // Match the figure page's dark color-scheme, or the browser paints an
          // opaque backdrop behind it when the site is in light mode.
          colorScheme: "dark",
          ...(measured ? { height } : { aspectRatio: FALLBACK_RATIO }),
        }}
      />
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}
