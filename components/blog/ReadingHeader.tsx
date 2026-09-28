import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Distance scrolled (px) before the bar gains a backdrop and may hide.
const SOLID_AFTER = 24;
const HIDE_AFTER = 160;
// Ignore tiny scroll jitters so the bar does not flicker.
const DELTA = 6;

// Slim header for long-form reading: stays out of the way while scrolling
// down, returns as soon as the reader scrolls up.
const ReadingHeader: React.FC = () => {
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;
    setSolid(window.scrollY > SOLID_AFTER);

    const update = () => {
      ticking.current = false;
      const y = window.scrollY;
      const diff = y - lastY.current;

      setSolid(y > SOLID_AFTER);
      if (y <= HIDE_AFTER) {
        setHidden(false);
      } else if (Math.abs(diff) > DELTA) {
        setHidden(diff > 0);
      }
      if (Math.abs(diff) > DELTA || y <= HIDE_AFTER) lastY.current = y;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      // Keep the bar visible for keyboard users tabbing into it.
      onFocus={() => setHidden(false)}
      className={`fixed inset-x-0 top-0 z-50 h-12 border-b transition-[transform,background-color,border-color] duration-500 ease-out motion-reduce:transition-none ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${
        solid
          ? "border-white/[0.06] bg-[#121212]/80 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <nav className="flex h-full items-center justify-between px-[2vw]">
        <Link
          href="/"
          className="font-cormorant text-xl font-light tracking-[0.01em] text-white/90 transition-colors duration-300 hover:text-blue-300"
        >
          Jaxon Poentis
        </Link>
        <div className="flex items-center gap-8 font-montserrat text-[0.7rem] uppercase tracking-[0.18em] text-white/60">
          <Link
            href="/blog"
            className="transition-colors duration-300 hover:text-blue-300"
          >
            Blog
          </Link>
          <Link
            href="/projects"
            className="transition-colors duration-300 hover:text-blue-300"
          >
            Projects
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default ReadingHeader;
