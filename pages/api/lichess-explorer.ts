import type { NextApiRequest, NextApiResponse } from "next";

// Server-side proxy to the Lichess Opening Explorer.
// Public, no auth required by Lichess — but proxying lets us set a proper
// User-Agent (browsers can't), avoid client-side network issues, and cache.

const ALLOWED_DBS = new Set(["masters", "lichess"]);

const ALLOWED_PARAMS = new Set([
  "fen",
  "play",
  "moves",
  "topGames",
  "recentGames",
  "speeds",
  "ratings",
  "since",
  "until",
]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  const db = String(req.query.db ?? "masters");
  if (!ALLOWED_DBS.has(db)) {
    res.status(400).json({ error: "bad db" });
    return;
  }

  const upstream = new URL(`https://explorer.lichess.ovh/${db}`);
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "db") continue;
    if (!ALLOWED_PARAMS.has(k)) continue;
    if (Array.isArray(v)) {
      v.forEach((vv) => upstream.searchParams.append(k, String(vv)));
    } else if (v != null) {
      upstream.searchParams.set(k, String(v));
    }
  }
  if (!upstream.searchParams.has("fen")) {
    res.status(400).json({ error: "fen required" });
    return;
  }

  try {
    const r = await fetch(upstream.toString(), {
      headers: {
        "User-Agent": "jaxon-poentis-personal-site/1.0 (chess opening trainer)",
        Accept: "application/json",
      },
    });
    const text = await r.text();
    res.status(r.status);
    // Cache identical positions briefly on the edge to be polite to lichess.
    if (r.ok) res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    res.setHeader(
      "Content-Type",
      r.headers.get("content-type") ?? "application/json"
    );
    res.send(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: `upstream fetch failed: ${msg}` });
  }
}
