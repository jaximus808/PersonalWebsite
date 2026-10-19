import { useEffect, useRef } from "react";

/**
 * How far the visitor has scrolled past the landing hero, 0 → 1. Holds at 0
 * for the first sliver of a screen, then reaches 1 a little before the hero
 * has fully left, so the stage is gone by the time the content arrives.
 */
export function heroFadeProgress(): number {
  const h = window.innerHeight || 1;
  const p = (window.scrollY - 0.12 * h) / (0.7 * h);
  return Math.min(1, Math.max(0, p));
}

/**
 * Calls `onChange` with the hero fade progress on mount, scroll and resize,
 * at most once per frame. Off when `enabled` is false.
 */
export function useHeroFade(onChange: (progress: number) => void, enabled = true) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      cb.current(heroFadeProgress());
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);
}
