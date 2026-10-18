// Tandem's landing-page demo, ported from agentcanvas
// (apps/tandem-next/src/components/landing/HeroBoardDemo.tsx) and restyled for
// this site's dark stage.
//
// Two Claude Code sessions drain one Tandem task queue in parallel next to a
// live board. The beat that matters: session-B tries the task session-A just
// claimed, gets `claimed: false`, and moves on to the next one. Loops every
// ~20s; under prefers-reduced-motion it holds a single finished frame.

import { useEffect, useState } from "react";
import { GitCommit, Layers, Zap } from "lucide-react";

import { usePrefersReducedMotion } from "../../../lib/usePrefersReducedMotion";

const TOTAL = 20_000; // full loop length
const STATIC_T = 18_000; // frame shown under prefers-reduced-motion (all done)

type LineKind = "cmd" | "ok" | "warn" | "dim";

type TermLine = {
  start: number;
  kind: LineKind;
  text: string;
  dur?: number;
};

// Session A wins the contested claim.
const LINES_A: TermLine[] = [
  { start: 500, kind: "cmd", text: "task_claim TDM-7", dur: 900 },
  { start: 1_600, kind: "ok", text: "{ claimed: true }  # TDM-7" },
  { start: 2_100, kind: "dim", text: "→ working: ticket prefix check" },
  { start: 6_200, kind: "cmd", text: "task_complete TDM-7", dur: 900 },
  { start: 7_400, kind: "ok", text: "✓ done · TDM-7: prefix check · a3f8c21" },
  { start: 8_300, kind: "cmd", text: "task_claim TDM-9", dur: 900 },
  { start: 9_400, kind: "ok", text: "{ claimed: true }  # TDM-9" },
  { start: 13_900, kind: "cmd", text: "task_complete TDM-9", dur: 950 },
  { start: 15_000, kind: "ok", text: "✓ done · TDM-9: claim age · c76d1b4" },
  { start: 17_600, kind: "dim", text: "queue empty — 4/4 done" },
];

// Session B loses the race on TDM-7 and takes the next task.
const LINES_B: TermLine[] = [
  { start: 1_200, kind: "cmd", text: "task_claim TDM-7", dur: 900 },
  { start: 2_700, kind: "warn", text: "claimed: false" },
  { start: 2_750, kind: "warn", text: '→ already claimed by "session-A"' },
  { start: 3_800, kind: "dim", text: "→ claiming TDM-8 instead" },
  { start: 4_700, kind: "cmd", text: "task_claim TDM-8", dur: 900 },
  { start: 5_800, kind: "ok", text: "{ claimed: true }  # TDM-8" },
  { start: 10_300, kind: "cmd", text: "task_complete TDM-8", dur: 950 },
  { start: 11_500, kind: "ok", text: "✓ done · TDM-8: queue sort · 9d41e07" },
  { start: 12_300, kind: "cmd", text: "task_claim TDM-10", dur: 950 },
  { start: 13_400, kind: "ok", text: "{ claimed: true }  # TDM-10" },
  { start: 15_700, kind: "cmd", text: "task_complete TDM-10", dur: 950 },
  { start: 16_900, kind: "ok", text: "✓ done · TDM-10: sort tests · 5b2fa9c" },
];

const REJECTED_GLOW: [number, number] = [2_600, 5_600];
const CONTESTED: [number, number] = [2_700, 4_400];

type DemoTask = {
  id: string;
  title: string;
  claimant: string;
  hash: string;
  workAt: number;
  doneAt: number;
};

const TASKS: DemoTask[] = [
  { id: "TDM-7", title: "Prefix check", claimant: "session-A", hash: "a3f8c21", workAt: 1_700, doneAt: 7_500 },
  { id: "TDM-8", title: "Queue ordering", claimant: "session-B", hash: "9d41e07", workAt: 5_900, doneAt: 11_600 },
  { id: "TDM-9", title: "Stale claims", claimant: "session-A", hash: "c76d1b4", workAt: 9_500, doneAt: 15_100 },
  { id: "TDM-10", title: "Queue sort tests", claimant: "session-B", hash: "5b2fa9c", workAt: 13_500, doneAt: 17_000 },
];

const SESSIONS = [
  { name: "session-A", activeAt: 1_600 },
  { name: "session-B", activeAt: 2_700 },
];

type TaskState = "ready" | "working" | "done";

function taskStateAt(task: DemoTask, t: number): TaskState {
  if (t >= task.doneAt) return "done";
  if (t >= task.workAt) return "working";
  return "ready";
}

// Fade in at the start of each loop and out at the end.
function loopOpacity(t: number): number {
  if (t < 450) return t / 450;
  if (t > 19_200) return Math.max(0, 1 - (t - 19_200) / 650);
  return 1;
}

const LINE_CLASS: Record<LineKind, string> = {
  cmd: "text-white/90",
  ok: "text-emerald-300/90",
  warn: "text-amber-200",
  dim: "text-white/40",
};

const FADE_TOP = {
  maskImage: "linear-gradient(to bottom, transparent 0, black 28px)",
  WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 28px)",
};

function TerminalPane({
  name,
  lines,
  t,
  glow,
  animate,
  contentOpacity,
}: {
  name: string;
  lines: TermLine[];
  t: number;
  glow: boolean;
  animate: boolean;
  contentOpacity: number;
}) {
  const visible = lines.filter((line) => t >= line.start);
  const last = visible[visible.length - 1];
  const typing = !!last && last.kind === "cmd" && !!last.dur && t < last.start + last.dur;
  return (
    <div
      className={`overflow-hidden rounded border bg-[#0c0c0e] transition-colors duration-500 ${
        glow ? "border-amber-300/50 ring-1 ring-amber-300/20" : "border-white/10"
      }`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="ml-2 truncate font-mono text-[10px] text-white/40">{name} — claude</span>
      </div>
      <div
        className="flex h-40 flex-col justify-end overflow-hidden px-3 pb-2.5 pt-1 font-mono text-[12px] leading-[1.55] sm:h-44 sm:text-[12.5px]"
        style={{ ...FADE_TOP, opacity: contentOpacity }}
      >
        {visible.map((line) => {
          const isCmd = line.kind === "cmd";
          const shown =
            isCmd && line.dur
              ? line.text.slice(0, Math.max(1, Math.ceil(((t - line.start) / line.dur) * line.text.length)))
              : line.text;
          return (
            <div key={line.start} className={`whitespace-pre-wrap break-words ${LINE_CLASS[line.kind]}`}>
              {isCmd && <span className="text-blue-300">❯ </span>}
              {shown}
              {typing && line === last && animate && <span className="text-white/70">▍</span>}
            </div>
          );
        })}
        {!typing && (
          <div className="whitespace-pre text-white/90">
            <span className="text-blue-300">❯ </span>
            <span className={animate ? "tandem-demo-blink text-white/70" : "text-white/70"}>▍</span>
          </div>
        )}
      </div>
    </div>
  );
}

const COLUMNS: { key: TaskState; label: string; dot: string }[] = [
  { key: "ready", label: "Ready", dot: "bg-sky-400" },
  { key: "working", label: "Working", dot: "bg-violet-400" },
  { key: "done", label: "Done", dot: "bg-emerald-400" },
];

function BoardCard({
  task,
  state,
  contested,
  animate,
}: {
  task: DemoTask;
  state: TaskState;
  contested: boolean;
  animate: boolean;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-md border bg-white/[0.04] p-2 ${
        animate ? "tandem-demo-card-in" : ""
      } ${contested ? "border-amber-300/60 ring-1 ring-amber-300/20" : "border-white/10"}`}
    >
      <span className="block font-mono text-[9.5px] text-white/40">{task.id}</span>
      <span
        className={`mt-0.5 block truncate text-[11px] font-medium leading-snug ${
          state === "done" ? "text-white/45" : "text-white/90"
        }`}
      >
        {task.title}
      </span>
      {state === "working" && (
        <span className="mt-1 inline-flex max-w-full items-center gap-1 text-[10.5px] text-violet-300">
          <Zap size={10} className="shrink-0" />
          <span className="truncate">{task.claimant}</span>
        </span>
      )}
      {state === "done" && (
        <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-[4px] bg-emerald-400/10 px-1 py-px font-mono text-[9.5px] text-emerald-300/90">
          <GitCommit size={9} className="shrink-0" />
          <span className="truncate">{task.hash}</span>
        </span>
      )}
    </div>
  );
}

function BoardPane({ t, animate, contentOpacity }: { t: number; animate: boolean; contentOpacity: number }) {
  const states = TASKS.map((task) => ({ task, state: taskStateAt(task, t) }));
  const done = states.filter((s) => s.state === "done").length;
  const working = states.filter((s) => s.state === "working").length;
  const activeSessions = SESSIONS.filter((s) => t >= s.activeAt);
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded border border-white/10 bg-white/[0.025] p-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="shrink-0 text-[12px] font-medium text-white">Board</span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[10px] text-white/40">4 tasks · 1 epic</span>
        <span className="ml-auto flex shrink-0 items-center gap-1" style={{ opacity: contentOpacity }}>
          {activeSessions.map((s) => (
            <span
              key={s.name}
              className="tandem-demo-card-in inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] bg-blue-300/10 px-1.5 py-px font-mono text-[9.5px] text-blue-300"
            >
              <span className="h-1.5 w-1.5 rounded-[2px] bg-blue-300" />
              {s.name}
            </span>
          ))}
        </span>
      </div>
      <div className="mt-2" style={{ opacity: contentOpacity }}>
        <div className="flex items-center gap-1.5">
          <Layers size={11} className="shrink-0 text-white/40" />
          <span className="min-w-0 truncate text-[11px] text-white/65">Task queue quality-of-life</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-white/40">{done}/4 done</span>
        </div>
        <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-white/[0.08]">
          {done > 0 && (
            <div
              className="h-full bg-emerald-400/80 transition-[width] duration-500"
              style={{ width: `${(done / TASKS.length) * 100}%` }}
            />
          )}
          {working > 0 && (
            <div
              className="h-full bg-violet-400/60 transition-[width] duration-500"
              style={{ width: `${(working / TASKS.length) * 100}%` }}
            />
          )}
        </div>
      </div>
      <div className="mt-2.5 grid min-h-0 flex-1 grid-cols-3 gap-2">
        {COLUMNS.map((column) => {
          const cards = states.filter((s) => s.state === column.key);
          return (
            <div key={column.key} className="flex min-h-0 flex-col">
              <div className="mb-1.5 flex items-center gap-1 px-0.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${column.dot}`}
                  style={{ opacity: cards.length ? 1 : 0.35 }}
                />
                <span className="truncate text-[9px] uppercase tracking-[0.14em] text-white/45">
                  {column.label}
                </span>
                <span className="shrink-0 font-mono text-[9px] text-white/30">{cards.length}</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-dashed border-white/[0.07] p-1">
                <div className="flex flex-col gap-1.5" style={{ opacity: contentOpacity }}>
                  {cards.map(({ task, state }) => (
                    <BoardCard
                      key={`${task.id}-${state}`}
                      task={task}
                      state={state}
                      contested={task.id === "TDM-7" && t >= CONTESTED[0] && t < CONTESTED[1]}
                      animate={animate}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Live recreation of two agent sessions sharing one Tandem queue.
 *
 *   <TandemBoardDemo />
 */
export default function TandemBoardDemo() {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(STATIC_T);

  useEffect(() => {
    if (reduced) {
      setT(STATIC_T);
      return;
    }
    let frame = 0;
    const origin = performance.now();
    const tick = (now: number) => {
      // ~30fps is plenty for typing and card moves.
      setT(Math.floor(((now - origin) % TOTAL) / 33) * 33);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const animate = !reduced;
  const glowB = animate && t >= REJECTED_GLOW[0] && t < REJECTED_GLOW[1];
  const contentOpacity = animate ? loopOpacity(t) : 1;

  return (
    <figure className="my-12 font-montserrat">
      <style>{`
        @keyframes tandem-demo-card-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .tandem-demo-card-in { animation: tandem-demo-card-in 0.35s ease-out; }
        @keyframes tandem-demo-blink { 50% { opacity: 0; } }
        .tandem-demo-blink { animation: tandem-demo-blink 1.1s steps(2, jump-none) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tandem-demo-card-in, .tandem-demo-blink { animation: none; }
        }
      `}</style>
      <div
        role="img"
        aria-label='Animated demo: two Claude Code sessions drain a shared Tandem task queue in parallel. Session B tries a task session A already claimed, gets "claimed: false, already claimed by session-A", and takes the next task instead. Finished tasks land on the board with commit hashes.'
        className="select-none rounded bg-white/[0.02] p-3 ring-1 ring-white/10 sm:p-4"
      >
        <div aria-hidden="true" className="grid gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <TerminalPane name="session-A" lines={LINES_A} t={t} glow={false} animate={animate} contentOpacity={contentOpacity} />
            <TerminalPane name="session-B" lines={LINES_B} t={t} glow={glowB} animate={animate} contentOpacity={contentOpacity} />
          </div>
          <div className="hidden min-w-0 sm:block">
            <BoardPane t={t} animate={animate} contentOpacity={contentOpacity} />
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[0.8rem] font-light leading-relaxed text-white/55">
        Claims are one atomic update in the database. Race two sessions or two hundred,{" "}
        <span className="text-white/80">exactly one wins</span>.
      </figcaption>
    </figure>
  );
}
