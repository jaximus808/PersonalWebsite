import { useState, useEffect } from "react";
import { placeForGeo, randomWelcome, randomInvite } from "../lib/greetingConfig";
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
 * Hero: a welcome message types in and erases, then a lax, location-aware
 * opener types in and stays, and an invitation fades in beneath it.
 *
 * The welcome/invite are random per visit, so they are chosen only AFTER mount
 * (never during SSR) to avoid hydration mismatches — the server and first
 * client paint both render the neutral caret placeholder below.
 */
export default function LivingGreeting() {
  const [mounted, setMounted] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [invite, setInvite] = useState("");
  const [place, setPlace] = useState<string | null>(null);
  const [revealInvite, setRevealInvite] = useState(false);

  useEffect(() => {
    setWelcome(randomWelcome());
    const chosenInvite = randomInvite();
    setInvite(chosenInvite);
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
      // Pass the invite so a generic opener won't echo a word from it.
      if (!cancelled) setPlace(placeForGeo(geo, countryName, chosenInvite));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 md:gap-7 px-4 text-center">
      <div className="font-cormorant font-light text-white leading-[1.1] tracking-[0.005em] md:text-[5.6vw] text-[40px] max-w-[20ch] [text-shadow:0_0_32px_rgba(255,255,255,0.14)]">
        {mounted ? (
          <TypeErase
            intro={welcome}
            finalText={place}
            onDone={() => setRevealInvite(true)}
          />
        ) : (
          <span className="typewriter-caret typewriter-caret--blink">|</span>
        )}
      </div>

      <div
        className={`font-cormorant italic text-white/70 md:text-[1.7vw] text-xl transition-all duration-[800ms] ease-out motion-reduce:transition-none ${
          revealInvite ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {invite}
      </div>
    </div>
  );
}
