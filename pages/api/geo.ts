import type { NextApiRequest, NextApiResponse } from "next";

export type GeoInfo = {
  city?: string;
  regionCode?: string; // e.g. "HI", "CA", "MO"
  regionName?: string;
  countryCode?: string; // e.g. "US"
  timezone?: string;
  lat?: number;
  lon?: number;
};

const str = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;
const num = (v: string | string[] | undefined): number | undefined => {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Resolves the visitor's approximate location.
 *
 * Prod (Vercel): reads the edge geolocation headers attached to every request
 * — no third-party call, no key, reflects the actual visitor.
 * Dev / non-Vercel: the server runs on your machine, so a public-IP lookup
 * resolves to *your* location, which is handy for previewing the hero.
 * Any failure returns {} so the hero degrades to a time-only greeting.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeoInfo>
) {
  res.setHeader("Cache-Control", "no-store");
  const h = req.headers;

  const vercelCity = str(h["x-vercel-ip-city"]);
  if (vercelCity) {
    return res.status(200).json({
      city: safeDecode(vercelCity),
      regionCode: str(h["x-vercel-ip-country-region"]),
      countryCode: str(h["x-vercel-ip-country"]),
      timezone: str(h["x-vercel-ip-timezone"]),
      lat: num(h["x-vercel-ip-latitude"]),
      lon: num(h["x-vercel-ip-longitude"]),
    });
  }

  try {
    const r = await fetch("https://ipwho.is/", {
      signal: AbortSignal.timeout(2500),
    });
    if (r.ok) {
      const d: any = await r.json();
      if (d && d.success !== false) {
        return res.status(200).json({
          city: d.city,
          regionCode: d.region_code,
          regionName: d.region,
          countryCode: d.country_code,
          timezone: d.timezone?.id ?? d.timezone,
          lat: d.latitude,
          lon: d.longitude,
        });
      }
    }
  } catch {
    /* fall through to empty */
  }

  return res.status(200).json({});
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
