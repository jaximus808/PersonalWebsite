// A post on X (Twitter), embedded with X's own widget so long posts, quoted
// posts and media render the way they do on X. Dark theme, "do not track",
// centred in the text column.
//
// Until the widget loads (or if it never does: blocked script, no network,
// deleted post) a quiet card links to the post, so the page never shows an
// empty hole.
//
//   <Tweet id="2116727410972590380" />
//   <Tweet id="2116727410972590380" caption="Where this started" />

import { useEffect, useRef, useState } from "react";

import { Caption } from "./Figure";

type TwttrWidgets = {
  widgets: {
    createTweet(
      id: string,
      target: HTMLElement,
      options?: Record<string, string | number | boolean>,
    ): Promise<HTMLElement | undefined>;
  };
};

declare global {
  interface Window {
    twttr?: TwttrWidgets;
  }
}

const SCRIPT_SRC = "https://platform.twitter.com/widgets.js";
let scriptPromise: Promise<TwttrWidgets> | null = null;

/** Loads X's widget script once per page, however many posts embed it. */
function loadWidgets(): Promise<TwttrWidgets> {
  if (window.twttr?.widgets) return Promise.resolve(window.twttr);
  if (!scriptPromise) {
    scriptPromise = new Promise<TwttrWidgets>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => (window.twttr?.widgets ? resolve(window.twttr) : reject(new Error("no twttr")));
      script.onerror = () => reject(new Error("widgets.js failed to load"));
      document.head.appendChild(script);
    }).catch((err) => {
      scriptPromise = null; // let a later embed try again
      throw err;
    });
  }
  return scriptPromise;
}

type TweetProps = {
  /** The post's id: the number at the end of its x.com/…/status/<id> link. */
  id: string;
  caption?: React.ReactNode;
};

export default function Tweet({ id, caption }: TweetProps) {
  const target = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const href = `https://x.com/i/status/${id}`;

  useEffect(() => {
    const host = target.current;
    if (!host) return;
    // Each run renders into its own child, removed on cleanup: a widget that
    // finishes after a re-run (or React's double effect in dev) lands in a
    // detached node instead of doubling up on the page.
    const el = document.createElement("div");
    el.style.width = "100%";
    el.style.maxWidth = "550px";
    host.appendChild(el);
    let cancelled = false;
    setState("loading");
    loadWidgets()
      .then((twttr) =>
        twttr.widgets.createTweet(id, el, { theme: "dark", dnt: true, align: "center", conversation: "none" }),
      )
      .then((node) => {
        if (!cancelled) setState(node ? "ready" : "failed");
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
      el.remove();
    };
  }, [id]);

  return (
    <figure className="my-10">
      {/* Always laid out: X's widget won't render into a hidden container. Empty, it has no height. */}
      <div ref={target} className="flex justify-center [&>*]:!my-0" />
      {state !== "ready" ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto flex max-w-[550px] items-center justify-between gap-4 rounded-xl px-5 py-4 text-sm text-white/60 ring-1 ring-white/10 transition-colors duration-300 hover:text-blue-300"
        >
          <span>{state === "loading" ? "Loading the post from X…" : "View the post on X"}</span>
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}
