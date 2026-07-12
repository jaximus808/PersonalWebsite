import { useState, useEffect, useRef } from "react";

type Phase = "intro" | "hold" | "erase" | "final" | "done";

type Props = {
  /** First message: typed, held, then erased. */
  intro: string;
  /** The message that types in and stays. May be null until it's ready
   * (e.g. still resolving location) — the erase step waits for it. */
  finalText: string | null;
  typeSpeed?: number;
  eraseSpeed?: number;
  holdMs?: number;
  className?: string;
  /** Fires once when `intro` finishes typing, before the hold/erase begins. */
  onIntroDone?: () => void;
  onDone?: () => void;
};

/**
 * Types `intro`, holds, erases it, then types `finalText` and stops. If
 * `finalText` isn't ready when the erase finishes, it waits (caret blinking)
 * until it arrives. Reduced motion: shows `finalText` immediately.
 */
export default function TypeErase({
  intro,
  finalText,
  typeSpeed = 65,
  eraseSpeed = 32,
  holdMs = 950,
  className = "",
  onIntroDone,
  onDone,
}: Props) {
  const [display, setDisplay] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onIntroDoneRef = useRef(onIntroDone);
  onIntroDoneRef.current = onIntroDone;
  const firedIntroRef = useRef(false);

  const fireIntroDone = () => {
    if (!firedIntroRef.current) {
      firedIntroRef.current = true;
      onIntroDoneRef.current?.();
    }
  };
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (phase === "done") return;

    if (reduced) {
      if (finalText != null) {
        setDisplay(finalText);
        setPhase("done");
        fireIntroDone();
        onDoneRef.current?.();
      }
      return;
    }

    let t: ReturnType<typeof setTimeout>;
    if (phase === "intro") {
      if (display.length < intro.length) {
        t = setTimeout(
          () => setDisplay(intro.slice(0, display.length + 1)),
          typeSpeed
        );
      } else {
        fireIntroDone();
        t = setTimeout(() => setPhase("hold"), 0);
      }
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("erase"), holdMs);
    } else if (phase === "erase") {
      if (display.length > 0) {
        t = setTimeout(
          () => setDisplay(display.slice(0, -1)),
          eraseSpeed
        );
      } else if (finalText != null) {
        t = setTimeout(() => setPhase("final"), 120);
      }
      // else: empty + no finalText yet → wait; effect re-runs when it arrives.
    } else if (phase === "final") {
      const target = finalText ?? "";
      if (display.length < target.length) {
        t = setTimeout(
          () => setDisplay(target.slice(0, display.length + 1)),
          typeSpeed
        );
      } else {
        setPhase("done");
        onDoneRef.current?.();
      }
    }
    return () => clearTimeout(t);
  }, [
    phase,
    display,
    intro,
    finalText,
    typeSpeed,
    eraseSpeed,
    holdMs,
    reduced,
  ]);

  const blinking =
    phase === "hold" ||
    phase === "done" ||
    (phase === "erase" && display.length === 0);

  return (
    <span className={className}>
      {display}
      <span
        className={`typewriter-caret ${
          blinking ? "typewriter-caret--blink" : ""
        }`}
      >
        |
      </span>
    </span>
  );
}
