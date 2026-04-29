// Curated list of popular chess openings for practice.
// Each entry encodes the SAN move list that defines the main line entry into the opening.
// The Lichess Opening Explorer is then used live to suggest book continuations.

export type OpeningColor = "white" | "black";

export type CuratedOpening = {
  id: string;
  name: string;
  eco: string;
  // The color the practitioner plays. Practice goal is to know responses for this color.
  color: OpeningColor;
  // Setup moves in SAN that lead to the diagram before the practitioner's first decision.
  // For "white" openings this is empty (you start move 1).
  // For "black" openings this typically includes white's first move.
  setupMoves: string[];
  description: string;
};

export const CURATED_OPENINGS: CuratedOpening[] = [
  {
    id: "italian-game",
    name: "Italian Game",
    eco: "C50",
    color: "white",
    setupMoves: [],
    description:
      "Classic open game starting 1.e4 e5 2.Nf3 Nc6 3.Bc4 — fast development and quick king safety.",
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez (Spanish)",
    eco: "C60",
    color: "white",
    setupMoves: [],
    description:
      "1.e4 e5 2.Nf3 Nc6 3.Bb5 — pressures the c6 knight defending e5; deep strategic main lines.",
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    eco: "D06",
    color: "white",
    setupMoves: [],
    description:
      "1.d4 d5 2.c4 — challenges the d5 pawn to fight for central control.",
  },
  {
    id: "london-system",
    name: "London System",
    eco: "D02",
    color: "white",
    setupMoves: [],
    description:
      "1.d4 followed by Nf3, Bf4, e3, c3 — a solid system you can play vs almost anything.",
  },
  {
    id: "english-opening",
    name: "English Opening",
    eco: "A10",
    color: "white",
    setupMoves: [],
    description: "1.c4 — flank opening, often transposes to many structures.",
  },
  {
    id: "kings-indian-attack",
    name: "King's Indian Attack",
    eco: "A07",
    color: "white",
    setupMoves: [],
    description:
      "1.Nf3 followed by g3, Bg2, O-O, d3, Nbd2, e4 — a flexible system for white.",
  },
  {
    id: "sicilian-defense",
    name: "Sicilian Defense",
    eco: "B20",
    color: "black",
    setupMoves: ["e4"],
    description:
      "1.e4 c5 — the most popular reply to e4. Asymmetrical play, fights for the center indirectly.",
  },
  {
    id: "french-defense",
    name: "French Defense",
    eco: "C00",
    color: "black",
    setupMoves: ["e4"],
    description: "1.e4 e6 — solid, often leads to closed positions with chain pawns.",
  },
  {
    id: "caro-kann",
    name: "Caro-Kann Defense",
    eco: "B10",
    color: "black",
    setupMoves: ["e4"],
    description: "1.e4 c6 — solid and resilient, prepares ...d5 with a strong pawn structure.",
  },
  {
    id: "kings-indian-defense",
    name: "King's Indian Defense",
    eco: "E60",
    color: "black",
    setupMoves: ["d4"],
    description:
      "1.d4 Nf6 2.c4 g6 — hypermodern: cede the center early, then strike back.",
  },
  {
    id: "nimzo-indian",
    name: "Nimzo-Indian Defense",
    eco: "E20",
    color: "black",
    setupMoves: ["d4"],
    description: "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 — pin the c3 knight; deeply strategic lines.",
  },
  {
    id: "scandinavian",
    name: "Scandinavian Defense",
    eco: "B01",
    color: "black",
    setupMoves: ["e4"],
    description: "1.e4 d5 — direct challenge to the e4 pawn from move 1.",
  },
];
