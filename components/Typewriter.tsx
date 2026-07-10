import { useState, useEffect } from "react";

type Props = {
  /** The text to type out. */
  text: string;
  /** Milliseconds per character. */
  speed?: number;
  /** Delay before typing begins, in ms. */
  startDelay?: number;
  /** Extra classes for the wrapper span. */
  className?: string;
  /** Show a blinking caret. */
  caret?: boolean;
};

/**
 * Minimal, tasteful typing effect. Respects prefers-reduced-motion by
 * rendering the full text immediately. The full string is always exposed
 * to assistive tech via aria-label, while the animated glyphs are hidden.
 */
export default function Typewriter({
  text,
  speed = 85,
  startDelay = 350,
  className = "",
  caret = true,
}: Props) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setCount(text.length);
      setStarted(true);
      return;
    }
    const startTimer = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(startTimer);
  }, [text, startDelay]);

  useEffect(() => {
    if (!started || count >= text.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), speed);
    return () => clearTimeout(t);
  }, [started, count, text.length, speed]);

  const done = count >= text.length;

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      {caret && (
        <span
          aria-hidden="true"
          className={`typewriter-caret ${
            done ? "typewriter-caret--blink" : ""
          }`}
        >
          |
        </span>
      )}
    </span>
  );
}
