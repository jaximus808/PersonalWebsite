import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";

import Header from "../components/header";
import Footer from "../components/footer";
import ChessBoard from "../components/chess/ChessBoard";
import { CURATED_OPENINGS, type CuratedOpening } from "../lib/openings";
import {
  fetchExplorer,
  pickBestReply,
  type ExplorerMove,
  type ExplorerResponse,
  type Database,
} from "../lib/lichessExplorer";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "your-turn" }
  | { kind: "opponent-thinking" }
  | { kind: "pick-opponent-move" }
  | { kind: "out-of-book"; bookMoves: ExplorerMove[] }
  | { kind: "wrong"; played: string; bookMoves: ExplorerMove[] }
  | { kind: "right"; san: string; bookMoves: ExplorerMove[] };

type Database_ = Database;

const ChessPracticePage: NextPage = () => {
  const [opening, setOpening] = useState<CuratedOpening | null>(null);
  const [database, setDatabase] = useState<Database_>("masters");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  // Single linear "mainline" of SAN moves played in this practice session.
  // cursor = number of mainline moves applied to reach the displayed position.
  // Playing a new move while cursor < mainline.length truncates the future
  // moves and replaces them — chess.com style branching.
  const [mainline, setMainline] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [bookForCurrentPos, setBookForCurrentPos] = useState<ExplorerResponse | null>(null);
  const [openingName, setOpeningName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [boardSize, setBoardSize] = useState<number>(480);
  const [autoOpponent, setAutoOpponent] = useState<boolean>(false);

  // Derive the chess.js game and last-move highlight from (mainline, cursor).
  const { game, lastMove } = useMemo(() => {
    const g = new Chess();
    let last: { from: Square; to: Square } | null = null;
    for (let i = 0; i < cursor; i++) {
      try {
        const m = g.move(mainline[i]);
        if (i === cursor - 1) {
          last = { from: m.from as Square, to: m.to as Square };
        }
      } catch {
        break;
      }
    }
    return { game: g, lastMove: last };
  }, [mainline, cursor]);

  const setupLen = opening?.setupMoves.length ?? 0;
  const navLocked =
    status.kind === "opponent-thinking" || status.kind === "loading";

  // Responsive board sizing.
  useEffect(() => {
    const compute = () => {
      const vw = Math.min(window.innerWidth, 1400);
      const vh = window.innerHeight;
      // Reserve space for sidebar on large screens.
      const target = vw >= 1024 ? Math.min(vw * 0.5, vh - 220) : Math.min(vw - 48, vh - 280);
      setBoardSize(Math.max(280, Math.floor(target)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // Load explorer data whenever the position changes (and an opening is selected).
  useEffect(() => {
    if (!opening) return;
    const fen = game.fen();
    const ctrl = new AbortController();
    setError(null);
    fetchExplorer(fen, database, ctrl.signal)
      .then((r) => {
        setBookForCurrentPos(r);
        if (r.opening?.name) setOpeningName(r.opening.name);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === "AbortError") return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(`Lichess request failed — ${msg}`);
      });
    return () => ctrl.abort();
  }, [game, opening, database]);

  function startOpening(o: CuratedOpening) {
    setOpening(o);
    setOrientation(o.color);
    setMainline([...o.setupMoves]);
    setCursor(o.setupMoves.length);
    setOpeningName(null);
    setStatus({ kind: "your-turn" });
  }

  function resetOpening() {
    if (!opening) return;
    startOpening(opening);
  }

  // Append a move at the current cursor, truncating any "future" mainline moves.
  // Returns the new mainline + new cursor index.
  function commitMove(san: string): { newMainline: string[]; newCursor: number } {
    const newMainline = [...mainline.slice(0, cursor), san];
    const newCursor = newMainline.length;
    setMainline(newMainline);
    setCursor(newCursor);
    return { newMainline, newCursor };
  }

  function handleAttemptMove(req: { from: Square; to: Square; promotion?: string }) {
    if (!opening) return false;
    if (navLocked) return false;
    if (status.kind === "pick-opponent-move") return false;
    if (game.turn() !== (orientation === "white" ? "w" : "b")) return false;

    const preFen = game.fen();
    const trial = new Chess(preFen);
    let played;
    try {
      played = trial.move({
        from: req.from,
        to: req.to,
        promotion: req.promotion ?? "q",
      });
    } catch {
      return false;
    }
    if (!played) return false;

    // Commit immediately so the board updates (truncating any forward-history).
    commitMove(played.san);

    void (async () => {
      let book = bookForCurrentPos;
      // bookForCurrentPos refers to the pre-move position only if the cursor
      // was at the end of mainline before this move. Always refetch if unsure.
      if (!book) {
        try {
          book = await fetchExplorer(preFen, database);
        } catch {
          setError("Couldn't reach Lichess. Showing your move without book check.");
          book = { white: 0, draws: 0, black: 0, moves: [], opening: null };
        }
      }
      const bookSans = new Set(book.moves.map((m) => m.san));
      const isBook = bookSans.has(played.san);

      if (!isBook) {
        if (book.moves.length === 0) {
          setStatus({ kind: "out-of-book", bookMoves: [] });
        } else {
          setStatus({ kind: "wrong", played: played.san, bookMoves: book.moves });
        }
        return;
      }

      setStatus({ kind: "right", san: played.san, bookMoves: book.moves });

      if (trial.turn() === (orientation === "white" ? "w" : "b")) {
        return;
      }

      if (!autoOpponent) {
        setStatus({ kind: "pick-opponent-move" });
        return;
      }

      setStatus({ kind: "opponent-thinking" });
      try {
        const reply = await fetchExplorer(trial.fen(), database);
        const best = pickBestReply(reply, trial.turn());
        if (!best) {
          setStatus({ kind: "out-of-book", bookMoves: [] });
          return;
        }
        const after = new Chess(trial.fen());
        const m = after.move(best.san);
        if (!m) {
          setStatus({ kind: "out-of-book", bookMoves: [] });
          return;
        }
        setMainline((prev) => {
          // Append opponent reply only if the user hasn't navigated/branched away
          // since we committed our move.
          if (prev.length === 0 || prev[prev.length - 1] !== played.san) return prev;
          const next = [...prev, m.san];
          setCursor(next.length);
          return next;
        });
        setStatus({ kind: "your-turn" });
      } catch {
        setError("Couldn't fetch opponent's book reply. You can still keep playing.");
        setStatus({ kind: "your-turn" });
      }
    })();
    return true;
  }

  function playOpponentReply(san: string) {
    if (status.kind !== "pick-opponent-move") return;
    const after = new Chess(game.fen());
    let m;
    try {
      m = after.move(san);
    } catch {
      return;
    }
    if (!m) return;
    commitMove(m.san);
    setStatus({ kind: "your-turn" });
  }

  // chess.com-style navigation through the mainline.
  function jumpTo(idx: number) {
    if (navLocked) return;
    const clamped = Math.max(0, Math.min(mainline.length, idx));
    setCursor(clamped);
    if (status.kind === "pick-opponent-move") {
      setStatus({ kind: "your-turn" });
    } else if (status.kind === "wrong" || status.kind === "right") {
      setStatus({ kind: "your-turn" });
    }
  }
  function goBack() { jumpTo(cursor - 1); }
  function goForward() { jumpTo(cursor + 1); }
  function goToStart() { jumpTo(0); }
  function goToEnd() { jumpTo(mainline.length); }

  // Keyboard arrows: ←/→ to navigate, Home/End to jump to ends.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!opening) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goForward();
      } else if (e.key === "Home") {
        e.preventDefault();
        goToStart();
      } else if (e.key === "End") {
        e.preventDefault();
        goToEnd();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening, cursor, mainline.length, navLocked, status.kind]);

  const sideToMove = game.turn() === "w" ? "white" : "black";
  const myTurn = sideToMove === orientation;

  // Build (move-number, white-half-move, black-half-move) rows from the mainline.
  // Each half-move carries its mainline index so a click can jump to it.
  type PlyCell = { san: string; index: number };
  type PairRow = { num: number; white?: PlyCell; black?: PlyCell };
  const movePairs = useMemo<PairRow[]>(() => {
    const pairs: PairRow[] = [];
    // chess.js move numbers start at 1 from the standard starting position.
    // Setup moves are part of the mainline so the row numbering still works.
    for (let i = 0; i < mainline.length; i += 2) {
      pairs.push({
        num: i / 2 + 1,
        white: { san: mainline[i], index: i + 1 },
        black:
          i + 1 < mainline.length
            ? { san: mainline[i + 1], index: i + 2 }
            : undefined,
      });
    }
    return pairs;
  }, [mainline]);

  return (
    <>
      <Head>
        <title>Chess Opening Trainer · Jaxon Poentis</title>
        <meta
          name="description"
          content="Practice chess openings with Lichess opening explorer data."
        />
      </Head>
      <Header />
      <main
        className="min-h-screen w-full pt-28 pb-16 text-white"
        style={{ background: "#0e1116" }}
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex flex-col gap-1">
            <h1 className="text-4xl md:text-5xl font-thin">Chess Opening Trainer</h1>
            <p className="text-white/70 max-w-2xl">
              Pick an opening and practice moves against the Lichess opening
              explorer. Book moves are accepted; off-book attempts show what the
              theory actually plays and why.
            </p>
            <p className="text-white/40 text-sm">
              Data:{" "}
              <Link
                href="https://lichess.org/api#tag/Opening-Explorer"
                className="underline hover:text-blue-300"
                target="_blank"
              >
                lichess.org opening explorer
              </Link>
              {" — "}free, no auth.
            </p>
          </div>

          {!opening ? (
            <OpeningPicker onSelect={startOpening} />
          ) : (
            <div
              className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8"
              style={{ ["--sq" as never]: `${Math.floor(boardSize / 8)}px` }}
            >
              <div className="flex flex-col items-center">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-white/80">
                    {opening.name}
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/60">{opening.eco}</span>
                  {openingName && openingName !== opening.name && (
                    <>
                      <span className="text-white/40">·</span>
                      <span className="text-white/60 italic">{openingName}</span>
                    </>
                  )}
                </div>
                <ChessBoard
                  game={game}
                  orientation={orientation}
                  onAttemptMove={handleAttemptMove}
                  lastMove={lastMove}
                  disabled={
                    status.kind === "opponent-thinking" ||
                    status.kind === "pick-opponent-move"
                  }
                />
                <div className="mt-4 flex items-center gap-1 justify-center">
                  <NavButton
                    onClick={goToStart}
                    disabled={navLocked || cursor === 0}
                    label="Jump to start (Home)"
                  >
                    ⏮
                  </NavButton>
                  <NavButton
                    onClick={goBack}
                    disabled={navLocked || cursor === 0}
                    label="Back one move (←)"
                  >
                    ◀
                  </NavButton>
                  <NavButton
                    onClick={goForward}
                    disabled={navLocked || cursor >= mainline.length}
                    label="Forward one move (→)"
                  >
                    ▶
                  </NavButton>
                  <NavButton
                    onClick={goToEnd}
                    disabled={navLocked || cursor >= mainline.length}
                    label="Jump to end (End)"
                  >
                    ⏭
                  </NavButton>
                  <span className="ml-3 text-xs text-white/50 tabular-nums">
                    {cursor} / {mainline.length}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={resetOpening}
                    className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
                  >
                    Reset opening
                  </button>
                  <button
                    onClick={() => {
                      setOpening(null);
                      setStatus({ kind: "idle" });
                      setMainline([]);
                      setCursor(0);
                      setOpeningName(null);
                    }}
                    className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
                  >
                    Pick another
                  </button>
                  <select
                    value={database}
                    onChange={(e) => setDatabase(e.target.value as Database_)}
                    className="px-2 py-1.5 rounded bg-white/10 text-sm"
                  >
                    <option value="masters">Masters DB (2200+)</option>
                    <option value="lichess">Lichess players DB</option>
                  </select>
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/10 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoOpponent}
                      onChange={(e) => setAutoOpponent(e.target.checked)}
                    />
                    Auto-play opponent
                  </label>
                </div>
              </div>

              <SidePanel
                opening={opening}
                myTurn={myTurn}
                onPickOpponent={playOpponentReply}
                status={status}
                error={error}
                book={bookForCurrentPos}
                movePairs={movePairs}
                cursor={cursor}
                onJump={jumpTo}
              />
            </div>
          )}
        </div>
      </main>
      <Footer authSense={false} authenticated={false} />
    </>
  );
};

function OpeningPicker({
  onSelect,
}: {
  onSelect: (o: CuratedOpening) => void;
}) {
  const [color, setColor] = useState<"all" | "white" | "black">("all");
  const filtered = CURATED_OPENINGS.filter(
    (o) => color === "all" || o.color === color
  );

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["all", "white", "black"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`px-3 py-1.5 rounded text-sm capitalize ${
              color === c
                ? "bg-blue-500 text-white"
                : "bg-white/10 hover:bg-white/20 text-white/80"
            }`}
          >
            {c === "all" ? "All openings" : `Play as ${c}`}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o)}
            className="text-left rounded-lg p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold">{o.name}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  o.color === "white"
                    ? "bg-white/80 text-black"
                    : "bg-black/70 text-white border border-white/30"
                }`}
              >
                as {o.color}
              </span>
            </div>
            <div className="mt-1 text-xs text-white/50">{o.eco}</div>
            <p className="mt-3 text-sm text-white/70">{o.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlyButton({
  ply,
  cursor,
  onJump,
}: {
  ply: { san: string; index: number } | undefined;
  cursor: number;
  onJump: (idx: number) => void;
}) {
  if (!ply) return <span />;
  const isCurrent = cursor === ply.index;
  return (
    <button
      type="button"
      onClick={() => onJump(ply.index)}
      className={`text-left px-1.5 py-0.5 rounded ${
        isCurrent
          ? "bg-blue-500/30 text-white ring-1 ring-blue-300"
          : "hover:bg-white/10 text-white/90"
      }`}
    >
      {ply.san}
    </button>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none"
    >
      {children}
    </button>
  );
}

type PlyCell = { san: string; index: number };
type PairRow = { num: number; white?: PlyCell; black?: PlyCell };

function SidePanel({
  opening,
  myTurn,
  status,
  error,
  book,
  movePairs,
  onPickOpponent,
  cursor,
  onJump,
}: {
  opening: CuratedOpening;
  myTurn: boolean;
  status: Status;
  error: string | null;
  book: ExplorerResponse | null;
  movePairs: PairRow[];
  onPickOpponent: (san: string) => void;
  cursor: number;
  onJump: (idx: number) => void;
}) {
  const pickingOpponent = status.kind === "pick-opponent-move";
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-lg border p-4 ${
          pickingOpponent
            ? "border-amber-300/40 bg-amber-300/5"
            : "border-white/10 bg-white/5"
        }`}
      >
        <h2 className="text-lg font-semibold mb-2">Status</h2>
        <StatusLine myTurn={myTurn} status={status} />
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>

      <div
        className={`rounded-lg border p-4 ${
          pickingOpponent
            ? "border-amber-300/40 bg-amber-300/5"
            : "border-white/10 bg-white/5"
        }`}
      >
        <h2 className="text-lg font-semibold mb-2">
          {pickingOpponent
            ? "Pick the opponent's reply"
            : myTurn
              ? "Book moves here"
              : "Their book moves"}
        </h2>
        {!book ? (
          <p className="text-sm text-white/60">Loading…</p>
        ) : book.moves.length === 0 ? (
          <p className="text-sm text-white/60">
            No games reach this position. You're past theory — play on general
            principles.
          </p>
        ) : (
          <BookMovesList
            book={book}
            onPick={pickingOpponent ? onPickOpponent : undefined}
          />
        )}
        {pickingOpponent && (
          <p className="mt-3 text-xs text-amber-200/70">
            Click a candidate to face that line. Top rows are most popular at
            the database's rating range.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Game moves</h2>
          <button
            onClick={() => onJump(0)}
            className="text-xs text-white/50 hover:text-white underline"
          >
            jump to start
          </button>
        </div>
        {movePairs.length === 0 ? (
          <p className="text-sm text-white/60">No moves yet.</p>
        ) : (
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm font-mono">
            {movePairs.map((p) => (
              <div key={p.num} className="contents">
                <span className="text-white/50 self-center">{p.num}.</span>
                <PlyButton ply={p.white} cursor={cursor} onJump={onJump} />
                <PlyButton ply={p.black} cursor={cursor} onJump={onJump} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-semibold mb-1">About this opening</h2>
        <p className="text-sm text-white/70">{opening.description}</p>
      </div>
    </div>
  );
}

function StatusLine({ myTurn, status }: { myTurn: boolean; status: Status }) {
  switch (status.kind) {
    case "idle":
      return <p className="text-sm text-white/70">Pick an opening to start.</p>;
    case "loading":
      return <p className="text-sm text-white/70">Loading book data…</p>;
    case "opponent-thinking":
      return (
        <p className="text-sm text-amber-200">Opponent is replying with theory…</p>
      );
    case "pick-opponent-move":
      return (
        <p className="text-sm text-amber-200">
          Choose the opponent's reply from the list →
        </p>
      );
    case "your-turn":
      return (
        <p className="text-sm text-emerald-300">
          {myTurn
            ? "Your move — pick a book reply from the list to the right, or try one yourself."
            : "Waiting…"}
        </p>
      );
    case "right":
      return (
        <p className="text-sm text-emerald-300">
          ✔ <span className="font-mono">{status.san}</span> is a book move.
        </p>
      );
    case "wrong":
      return (
        <p className="text-sm text-red-300">
          <span className="font-mono">{status.played}</span> isn't a top theory
          move. Try one of the moves listed →
        </p>
      );
    case "out-of-book":
      return (
        <p className="text-sm text-white/70">
          You're past book — no more master games reached this position.
        </p>
      );
  }
}

function BookMovesList({
  book,
  onPick,
}: {
  book: ExplorerResponse;
  onPick?: (san: string) => void;
}) {
  const total = book.white + book.draws + book.black;
  const sorted = [...book.moves].sort(
    (a, b) => b.white + b.draws + b.black - (a.white + a.draws + a.black)
  );
  const Row = onPick ? "button" : "div";
  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map((m) => {
        const games = m.white + m.draws + m.black;
        const sharePct = total > 0 ? Math.round((games / total) * 100) : 0;
        const wPct = games > 0 ? Math.round((m.white / games) * 100) : 0;
        const dPct = games > 0 ? Math.round((m.draws / games) * 100) : 0;
        const bPct = Math.max(0, 100 - wPct - dPct);
        return (
          <Row
            key={m.uci}
            type={onPick ? "button" : undefined}
            onClick={onPick ? () => onPick(m.san) : undefined}
            className={`w-full flex items-center gap-3 text-sm text-left ${
              onPick
                ? "px-2 py-1 -mx-2 rounded hover:bg-amber-300/10 hover:ring-1 hover:ring-amber-300/40 cursor-pointer transition-colors"
                : ""
            }`}
            title={`${games.toLocaleString()} games`}
          >
            <span className="font-mono w-14 shrink-0">{m.san}</span>
            <div className="flex-1 h-4 rounded overflow-hidden flex bg-black/40">
              <div
                style={{ width: `${wPct}%`, background: "#f6f6f6" }}
                title={`White wins ${wPct}%`}
              />
              <div
                style={{ width: `${dPct}%`, background: "#9ca3af" }}
                title={`Draws ${dPct}%`}
              />
              <div
                style={{ width: `${bPct}%`, background: "#1f2937" }}
                title={`Black wins ${bPct}%`}
              />
            </div>
            <span className="w-12 text-right text-white/60 tabular-nums text-xs">
              {sharePct}%
            </span>
          </Row>
        );
      })}
    </div>
  );
}

export default ChessPracticePage;
