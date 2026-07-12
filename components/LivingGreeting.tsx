import { useState, useEffect } from "react";
import {
  placeForGeo,
  randomWelcome,
  identityLine,
} from "../lib/greetingConfig";
import type { GeoInfo } from "../pages/api/geo";
import TypeErase from "./TypeErase";

/** Resolve visitor geo, but don't stall the hero if it's slow. */
async function loadGeo(capMs: number): Promise<GeoInfo> {
  const fetchGeo = fetch("/api/geo")
    .then((r) => (r.ok ? (r.json() as Promise<GeoInfo>) : ({} as GeoInfo)))
    .catch(() => ({} as GeoInfo));
  const timeout = new Promise<GeoInfo>((res) =>
    setTimeout(() => res({} as GeoInfo), capMs)
  );
  return Promise.race([fetchGeo, timeout]);
}

/**
 * Hero: a small headshot, then a welcome message types in and erases, a lax,
 * location-aware opener types in and stays, and a fixed one-line "who I am"
 * statement fades in beneath it.
 *
 * The welcome is random per visit, so it's chosen only AFTER mount (never
 * during SSR) to avoid hydration mismatches — the server and first client paint
 * both render the neutral caret placeholder. The identity line is fixed and
 * consistent every visit.
 */
export default function LivingGreeting() {
  const [mounted, setMounted] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [place, setPlace] = useState<string | null>(null);
  const [revealIdentity, setRevealIdentity] = useState(false);

  const identity = identityLine();
  // Break the identity onto two lines at "previously".
  const idBreak = identity.indexOf("pre");
  const idLine1 = idBreak > 0 ? identity.slice(0, idBreak).trimEnd() : identity;
  const idLine2 = idBreak > 0 ? identity.slice(idBreak) : "";

  useEffect(() => {
    setWelcome(randomWelcome());
    setMounted(true);

    let cancelled = false;
    (async () => {
      const geo = await loadGeo(1100);
      let countryName: string | undefined;
      if (geo.countryCode) {
        try {
          countryName =
            new Intl.DisplayNames(["en"], { type: "region" }).of(
              geo.countryCode
            ) ?? undefined;
        } catch {
          /* ignore */
        }
      }
      // Pass the identity line so a generic opener won't echo a word from it.
      if (!cancelled) setPlace(placeForGeo(geo, countryName, identity));
    })();
    return () => {
      cancelled = true;
    };
  }, [identity]);

  return (
    <div className="flex flex-col items-center gap-5 md:gap-6 px-4 text-center">
      <div className="font-cormorant font-light text-white leading-[1.1] tracking-[0.005em] md:text-[5.6vw] text-[40px] max-w-[20ch] [text-shadow:0_0_32px_rgba(255,255,255,0.14)]">
        {mounted ? (
          <TypeErase
            intro={welcome}
            finalText={place}
            onIntroDone={() => setRevealIdentity(true)}
          />
        ) : (
          <span className="typewriter-caret typewriter-caret--blink">|</span>
        )}
      </div>

      {/* Small headshot to the left of the line — an "I'm the one saying this"
          pairing. Swap the src for a real photo (e.g. /headshot.jpg) whenever
          you have one; the placeholder SVG lives in public/. */}
      <div
        className={`flex items-center justify-center gap-3 max-w-[92vw] transition-all duration-[800ms] ease-out motion-reduce:transition-none ${
          revealIdentity ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="group relative h-10 w-10 md:h-12 md:w-12 flex-none">
          {/* A blue "comet" of light sweeps around the ring on hover. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[3px] rounded-full opacity-0 blur-[3px] transition-opacity duration-500 group-hover:opacity-100 motion-safe:group-hover:animate-[spin_3s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg 210deg, rgba(163,203,255,0.85) 320deg, transparent 360deg)",
            }}
          />
          <div className="relative h-full w-full overflow-hidden rounded-full ring-1 ring-white/15 shadow-[0_0_18px_rgba(163,203,255,0.12)] transition-all duration-500 ease-out group-hover:ring-blue-300/60 group-hover:shadow-[0_0_26px_rgba(163,203,255,0.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/headshot.jpg"
              alt="Jaxon"
              className="h-full w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-110"
            />
          </div>
        </div>
        <p className="font-cormorant font-light text-white/70 md:text-[1.7vw] text-lg leading-snug text-left">
          {idLine1}
          {idLine2 && (
            <>
              <br />
              {idLine2}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
