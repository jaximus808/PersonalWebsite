import { useMemo, useState, useEffect } from "react";
import type { Chess, Square, PieceSymbol, Color } from "chess.js";

type LegalMove = {
  from: Square;
  to: Square;
  promotion?: string;
  san: string;
};

type Props = {
  game: Chess;
  orientation: "white" | "black";
  onAttemptMove: (move: { from: Square; to: Square; promotion?: string }) => boolean;
  // Squares to render with a soft hint highlight (e.g. last book move squares).
  hintSquares?: Square[];
  // Last move (for "from"/"to" highlight).
  lastMove?: { from: Square; to: Square } | null;
  disabled?: boolean;
};

const PIECE_GLYPH: Record<Color, Record<PieceSymbol, string>> = {
  w: { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" },
  b: { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" },
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export default function ChessBoard({
  game,
  orientation,
  onAttemptMove,
  hintSquares,
  lastMove,
  disabled,
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);

  // Reset selection if board state changes.
  useEffect(() => {
    setSelected(null);
  }, [game.fen()]);

  const board = game.board();

  const legalFromSelected: LegalMove[] = useMemo(() => {
    if (!selected) return [];
    try {
      return game.moves({ square: selected, verbose: true }) as unknown as LegalMove[];
    } catch {
      return [];
    }
  }, [selected, game]);

  const legalTargets = useMemo(
    () => new Set(legalFromSelected.map((m) => m.to)),
    [legalFromSelected]
  );

  const filesOrdered = orientation === "white" ? FILES : [...FILES].reverse();
  const ranksOrdered = orientation === "white" ? RANKS : [...RANKS].reverse();

  const squareAt = (file: string, rank: number): Square => `${file}${rank}` as Square;

  const handleSquareClick = (sq: Square) => {
    if (disabled) return;
    const piece = pieceAt(sq);
    if (selected) {
      if (sq === selected) {
        setSelected(null);
        return;
      }
      // Try to move from selected -> sq
      const candidate = legalFromSelected.find((m) => m.to === sq);
      if (candidate) {
        const promotion = candidate.promotion;
        const accepted = onAttemptMove({ from: selected, to: sq, promotion });
        if (accepted) {
          setSelected(null);
          return;
        }
        // Move was rejected by parent — keep selection so user can try again.
        setSelected(null);
        return;
      }
      // If clicking on own piece, switch selection.
      if (piece && piece.color === game.turn()) {
        setSelected(sq);
        return;
      }
      setSelected(null);
      return;
    }
    if (piece && piece.color === game.turn()) {
      setSelected(sq);
    }
  };

  function pieceAt(sq: Square) {
    // board() returns rank 8 -> 1, file a -> h.
    const file = sq.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(sq[1], 10);
    const row = 8 - rank;
    return board[row][file];
  }

  const hintSet = new Set(hintSquares ?? []);

  return (
    <div className="inline-block select-none">
      <div className="grid grid-cols-[auto_repeat(8,minmax(0,1fr))] gap-0">
        {/* Top file labels intentionally omitted; we put labels inside corner cells of border row */}
        {ranksOrdered.map((rank) => (
          <RankRow
            key={rank}
            rank={rank}
            filesOrdered={filesOrdered}
            squareAt={squareAt}
            pieceAt={pieceAt}
            selected={selected}
            legalTargets={legalTargets}
            hintSet={hintSet}
            lastMove={lastMove ?? null}
            onSquareClick={handleSquareClick}
          />
        ))}
        {/* file labels row */}
        <div />
        {filesOrdered.map((f) => (
          <div
            key={f}
            className="text-center text-xs text-white/60 py-1"
            style={{ width: "var(--sq)" }}
          >
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function RankRow({
  rank,
  filesOrdered,
  squareAt,
  pieceAt,
  selected,
  legalTargets,
  hintSet,
  lastMove,
  onSquareClick,
}: {
  rank: number;
  filesOrdered: readonly string[] | string[];
  squareAt: (f: string, r: number) => Square;
  pieceAt: (sq: Square) => { color: Color; type: PieceSymbol } | null;
  selected: Square | null;
  legalTargets: Set<Square>;
  hintSet: Set<string>;
  lastMove: { from: Square; to: Square } | null;
  onSquareClick: (sq: Square) => void;
}) {
  return (
    <>
      <div
        className="flex items-center justify-center text-xs text-white/60 px-1"
        style={{ height: "var(--sq)" }}
      >
        {rank}
      </div>
      {filesOrdered.map((f) => {
        const sq = squareAt(f, rank);
        const piece = pieceAt(sq);
        const fileIdx = f.charCodeAt(0) - "a".charCodeAt(0);
        const isLight = (fileIdx + rank) % 2 === 1;
        const isSelected = selected === sq;
        const isLegal = legalTargets.has(sq);
        const isHint = hintSet.has(sq);
        const isLastFrom = lastMove?.from === sq;
        const isLastTo = lastMove?.to === sq;

        const baseColor = isLight ? "bg-[#ebe9d0]" : "bg-[#779556]";
        const selectedRing = isSelected ? "ring-2 ring-yellow-300 ring-inset" : "";
        const lastMoveBg = isLastTo
          ? "!bg-[#bbcb44]"
          : isLastFrom
            ? "!bg-[#cdd26a]"
            : "";
        const hintBg = isHint ? "!bg-[#7eb6e6]" : "";

        return (
          <button
            type="button"
            key={sq}
            onClick={() => onSquareClick(sq)}
            className={`relative flex items-center justify-center ${baseColor} ${lastMoveBg} ${hintBg} ${selectedRing} cursor-pointer transition-colors`}
            style={{ width: "var(--sq)", height: "var(--sq)" }}
            aria-label={sq}
          >
            {piece && (
              <span
                className="leading-none"
                style={{
                  fontSize: "calc(var(--sq) * 0.78)",
                  textShadow:
                    piece.color === "w"
                      ? "0 0 1px #000, 0 0 2px rgba(0,0,0,0.6)"
                      : "0 0 1px #fff, 0 0 1px rgba(255,255,255,0.4)",
                  color: piece.color === "w" ? "#fff" : "#111",
                }}
              >
                {PIECE_GLYPH[piece.color][piece.type]}
              </span>
            )}
            {isLegal && !piece && (
              <span className="absolute h-1/4 w-1/4 rounded-full bg-black/30" />
            )}
            {isLegal && piece && (
              <span className="absolute inset-0 rounded-full ring-4 ring-black/30" />
            )}
          </button>
        );
      })}
    </>
  );
}
