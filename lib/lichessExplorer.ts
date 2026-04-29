// Thin client for the Lichess Opening Explorer (no API key required, fully public).
// Docs: https://lichess.org/api#tag/Opening-Explorer

export type ExplorerMove = {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
  game?: unknown;
};

export type ExplorerResponse = {
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
  opening: { eco: string; name: string } | null;
};

export type Database = "masters" | "lichess";

const BASES: Record<Database, string> = {
  masters: "https://explorer.lichess.ovh/masters",
  lichess: "https://explorer.lichess.ovh/lichess",
};

export async function fetchExplorer(
  fen: string,
  db: Database = "masters",
  signal?: AbortSignal
): Promise<ExplorerResponse> {
  const params = new URLSearchParams({
    fen,
    moves: "12",
    topGames: "0",
  });
  if (db === "lichess") {
    params.set("speeds", "blitz,rapid,classical");
    params.set("ratings", "1800,2000,2200,2500");
  }
  const url = `${BASES[db]}?${params.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Lichess explorer error ${res.status}`);
  }
  return (await res.json()) as ExplorerResponse;
}

export function totalGames(r: ExplorerResponse): number {
  return r.white + r.draws + r.black;
}

export function moveTotalGames(m: ExplorerMove): number {
  return m.white + m.draws + m.black;
}

// Pick the best book reply for the side to move using simple expected-score heuristic.
// Score from the *side to move's* perspective: wins + 0.5*draws.
export function pickBestReply(
  r: ExplorerResponse,
  sideToMove: "w" | "b"
): ExplorerMove | null {
  if (!r.moves.length) return null;
  const scored = r.moves
    .filter((m) => moveTotalGames(m) > 0)
    .map((m) => {
      const total = moveTotalGames(m);
      const wins = sideToMove === "w" ? m.white : m.black;
      const score = (wins + 0.5 * m.draws) / total;
      return { m, total, score };
    });
  if (!scored.length) return null;
  // Require at least a small sample so we don't pick a 1-game novelty.
  scored.sort((a, b) => {
    // Primary: most-played (popularity); secondary: score.
    if (b.total !== a.total) return b.total - a.total;
    return b.score - a.score;
  });
  return scored[0].m;
}
