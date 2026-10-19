import { useEffect, useSyncExternalStore, type RefObject } from "react";

/**
 * Which idea the About section is on: robots (the YAM arms) or infrastructure
 * (the request fan-out). The lead line and the background's dots both follow
 * it, so they always switch together.
 */
export type AboutScene = "robots" | "infra";

// The arms usually get cut off partway through a hand-off; they pick it back
// up where they left off next time (see backgroundThree.tsx).
const HOLD: Record<AboutScene, number> = { robots: 8500, infra: 9500 };

let scene: AboutScene = "robots";
const listeners = new Set<() => void>();

function set(next: AboutScene) {
  if (next === scene) return;
  scene = next;
  listeners.forEach((l) => l());
}

/** Read without subscribing (the background reads this every frame). */
export function getAboutScene(): AboutScene {
  return scene;
}

export function useAboutScene(): AboutScene {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => scene,
    () => "robots",
  );
}

/**
 * Alternates the scene while `ref` is on screen, starting from robots each
 * time it comes into view. Holds on robots under reduced motion.
 */
export function useAboutCycle(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      timer = setTimeout(() => {
        set(scene === "robots" ? "infra" : "robots");
        run();
      }, HOLD[scene]);
    };
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !timer) {
          set("robots");
          run();
        } else if (!entry.isIntersecting) {
          stop();
          set("robots");
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
      set("robots");
    };
  }, [ref]);
}
