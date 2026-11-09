// The graphic kit: flat, numbered step-by-step figures for when Anatomy is
// overkill. A graphic is the same kind of page as an Anatomy figure (a
// standalone dark page that <Diagram> embeds and sizes to its height), in the
// same card (Fig n, title, hint, live readout), but the drawing is plain flat
// SVG: boxes, arrows, labels and tokens that appear, light up and move as the
// figure steps through 1, 2, 3 …
//
// Steps are declarative. Give any element (or group) data attributes and the
// runtime does the rest, with calm CSS transitions:
//
//   show="2-4"    visible only during steps 2–4 ("2", "2-", "-3", "1,3")
//   lit="2"       bright (ink or accent) during those steps, dim otherwise
//   at={ 1: [0, 0], 3: [140, 0] }   moves to that offset from step 1, 3, …
//                 (the last key at or before the current step wins)
//   draw="2-"     a line draws itself in when the step arrives
//   dur=2600      how long this element's move/fade takes, in ms (default 900 / 420)
//   linear        move at an even pace (conveyors, bars) instead of easing out
//   snap="1"      jump with no transition when the figure enters these steps
//                 (loop resets: a conveyor going back to the start, a bar emptying)
//   stagger=60    on a group: each child starts that many ms after the one before
//
// Readability: lay out ~480 wide and pass size: 14 (or more) to node, label
// and badge. The bare defaults are smaller and read too small on a phone.
// mono labels are uppercase unless you pass upper: false.
// Usage from tools/writer/drafts/<kind>/<slug>/figures/<id>/build.mjs:
//
//   import * as g from "../../../../../../../.claude/skills/write/graphic-kit.mjs";
//   const svg = [
//     g.node({ x: 20, y: 60, w: 150, h: 64, title: "Sensors", sub: "lidar · camera", lit: "1" }),
//     g.arrow({ points: [[170, 92], [230, 92]], lit: "2", draw: "2-" }),
//     g.badge({ x: 30, y: 50, n: 1, lit: "1" }),
//     g.dot({ x: 180, y: 92, at: { 1: [0, 0], 2: [50, 0] }, show: "1-2" }),
//   ].join("");
//   g.writeFigure(import.meta.url, g.graphicPage({
//     fig: "Fig 2", title: "Sense, decide, move", viewBox: [0, 0, 600, 220], svg,
//     steps: [
//       { label: "Read the sensors", readout: "Step 1 · reading the sensors" },
//       { label: "Decide · System 2" },
//       { label: "Move · System 1", hold: 3400 },
//     ],
//   }));
//
// The runtime auto-plays (each step holds `hold` ms, default 2800, then loops),
// pauses offscreen, steps on click / → / Space / Enter, goes back on ←,
// restarts on Home, jumps when a rail step is clicked, and resumes after a
// few idle seconds. Under prefers-reduced-motion it doesn't auto-play, has no
// transitions, and opens on step `still` (default 1).
//
// Capturing with the anatomy skill's drive.mjs: start with ["key","Home"] so
// autoplay holds on step 1, then ["key","ArrowRight"] + ["wait",1200] per step.
// An arrow whose target only appears at a later step needs the same `show`.
//
// Every number shown comes from the draft or the author; step numbers are the
// only digits the kit adds.

import { plateHtml } from "../anatomy/kit/iso-kit.mjs";
import { figurePage, writeFigure } from "./figure-page.mjs";

export { writeFigure };

// ---------------------------------------------------------------------------
// Primitives. Each returns an SVG string. `show`, `lit`, `at` and `draw` are
// the step attributes above; `cls` adds classes; `accent` uses the site's
// soft blue when lit instead of white.

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function stepAttrs({ show, lit, at, draw, accent, dur, linear, snap, stagger, cls = "" } = {}) {
  const parts = [];
  const classes = ["gx-el", accent ? "gx-accent" : "", cls].filter(Boolean).join(" ");
  parts.push(`class="${classes}"`);
  if (show != null) parts.push(`data-show="${esc(show)}"`);
  if (lit != null) parts.push(`data-lit="${esc(lit)}"`);
  if (draw != null) parts.push(`data-draw="${esc(draw)}"`);
  if (snap != null) parts.push(`data-snap="${esc(snap)}"`);
  if (stagger != null) parts.push(`data-stagger="${Number(stagger)}"`);
  const style = [];
  if (dur != null) style.push(`--gx-move:${Number(dur)}ms;--gx-t:${Number(dur)}ms`);
  if (linear) style.push("--gx-curve:linear");
  if (style.length) parts.push(`style="${style.join(";")}"`);
  if (at) {
    const spec = Object.entries(at)
      .map(([step, [dx, dy]]) => `${step}:${dx},${dy}`)
      .join(";");
    parts.push(`data-at="${spec}"`);
  }
  return parts.join(" ");
}

/** A group whose children share step attributes. */
export function group(opts, inner) {
  return `<g ${stepAttrs(opts)}>${inner}</g>`;
}

/** A rounded box with a title and an optional mono subtitle. */
export function node({ x, y, w, h, title = "", sub = "", r = 8, dashed = false, size, subSize, ...opts }) {
  const cx = x + w / 2;
  const fs = size ?? 14;
  const ss = subSize ?? (size ? Math.max(12, size - 2) : 10);
  const ty = sub ? y + h / 2 - ss * 0.3 : y + h / 2 + fs * 0.32;
  const st = (n, given) => (given ? ` style="font-size:${n}px"` : "");
  return group(
    opts,
    `<rect class="gx-box${dashed ? " gx-dashed" : ""}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>` +
      (title ? `<text class="gx-title" x="${cx}" y="${ty}" text-anchor="middle"${st(fs, size)}>${esc(title)}</text>` : "") +
      (sub ? `<text class="gx-sub" x="${cx}" y="${ty + ss + 8}" text-anchor="middle"${st(ss, size || subSize)}>${esc(sub)}</text>` : ""),
  );
}

/** A line through `points` ([[x, y], …]) with an arrowhead at the end (head: false for none). */
export function arrow({ points, head = true, dashed = false, ...opts }) {
  const d = points.map(([px, py], i) => `${i ? "L" : "M"}${px} ${py}`).join(" ");
  let tip = "";
  if (head && points.length > 1) {
    const [ax, ay] = points[points.length - 2];
    const [bx, by] = points[points.length - 1];
    const a = Math.atan2(by - ay, bx - ax);
    const s = 7;
    const p1 = [bx - s * Math.cos(a - 0.45), by - s * Math.sin(a - 0.45)];
    const p2 = [bx - s * Math.cos(a + 0.45), by - s * Math.sin(a + 0.45)];
    tip = `<path class="gx-head" d="M${p1[0].toFixed(2)} ${p1[1].toFixed(2)} L${bx} ${by} L${p2[0].toFixed(2)} ${p2[1].toFixed(2)}"/>`;
  }
  const draw = opts.draw != null;
  return group(
    { ...opts, draw: undefined },
    `<path class="gx-line${dashed ? " gx-dashed" : ""}" d="${d}"${draw ? ` pathLength="1" data-draw="${esc(opts.draw)}"` : ""}/>` +
      (tip ? (draw ? `<g data-show="${esc(opts.draw)}" class="gx-el">${tip}</g>` : tip) : ""),
  );
}

/** A numbered step badge: a small circle with the digit. */
export function badge({ x, y, n, r, size, ...opts }) {
  const fs = size ?? 11;
  const rr = r ?? (size ? Math.round(fs * 0.85) : 10);
  return group(
    { ...opts, cls: `gx-badge ${opts.cls ?? ""}`.trim() },
    `<circle cx="${x}" cy="${y}" r="${rr}"/><text x="${x}" y="${y + fs * 0.35}" text-anchor="middle"${size ? ` style="font-size:${fs}px"` : ""}>${esc(n)}</text>`,
  );
}

/** Free text. `mono` for small uppercase labels, otherwise the sans body face. */
export function label({ x, y, text, anchor = "start", mono = false, upper = true, size, ...opts }) {
  const style = size ? ` style="font-size:${size}px"` : "";
  const cls = mono ? `gx-mono${upper ? "" : " gx-case"}` : "gx-text";
  return group(opts, `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}"${style}>${esc(text)}</text>`);
}

/**
 * A progress bar that fills from 0 to 1 over the steps in `fills`
 * ({ 2: 1 } fills during step 2; { 2: 0.5, 3: 1 } half then full). Pair with
 * linear + dur for an even fill, and snap on the step where it should empty.
 */
export function bar({ x, y, w, h = 10, fills = {}, r, ...opts }) {
  const rr = r ?? h / 2;
  const at = Object.fromEntries(Object.entries(fills).map(([step, f]) => [step, [Math.round(w * f), 0]]));
  const id = `gx-clip-${x}-${y}-${w}`.replace(/\./g, "_");
  return group(
    opts,
    `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}"/></clipPath>` +
      `<rect class="gx-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}"/>` +
      `<g clip-path="url(#${id})">${group({ at, linear: opts.linear, dur: opts.dur, snap: opts.snap, cls: "gx-fill" }, `<rect x="${x - w}" y="${y}" width="${w}" height="${h}"/>`)}</g>`,
  );
}

/** A token (a request, a packet, a car, a decision) that moves with `at`. */
export function dot({ x, y, r = 6, ...opts }) {
  return group({ ...opts, cls: `gx-dot ${opts.cls ?? ""}`.trim() }, `<circle cx="${x}" cy="${y}" r="${r}"/>`);
}

/** Raw SVG markup with step attributes (any shape you draw yourself). */
export function shape(markup, opts = {}) {
  return group(opts, markup);
}

// ---------------------------------------------------------------------------
// The page

const GX_CSS = `
.gx{--gx-ink:#ededed;--gx-text:#a3a3a3;--gx-dim:#4d4d4d;--gx-hair:#333;--gx-fill:#161616;--gx-lit-fill:#1f1f1f;--gx-accent:#a3cbff;--gx-ease:cubic-bezier(.22,.61,.36,1);--gx-t:420ms;outline:none}
.gx-svg{display:block;width:100%;height:auto;overflow:visible;font-family:Montserrat,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.gx-el{transition:opacity var(--gx-t) var(--gx-curve,var(--gx-ease)),transform var(--gx-move,900ms) var(--gx-curve,var(--gx-ease));transform-box:view-box}
.gx-el.gx-snapping,.gx-el.gx-snapping *{transition:none!important}
.gx-fill rect{fill:var(--gx-dim)}
.gx-lit .gx-fill rect,.gx-lit.gx-fill rect{fill:var(--gx-ink)}
.gx-accent.gx-lit .gx-fill rect{fill:var(--gx-accent)}
.gx-mono.gx-case,.gx-sub.gx-case{text-transform:none}
.gx-el.gx-hidden{opacity:0}
.gx-box{fill:var(--gx-fill);stroke:var(--gx-dim);stroke-width:1;transition:stroke var(--gx-t) var(--gx-ease),fill var(--gx-t) var(--gx-ease)}
.gx-title{fill:var(--gx-text);font-size:14px;font-weight:400;letter-spacing:.01em;transition:fill var(--gx-t) var(--gx-ease)}
.gx-sub,.gx-mono{fill:var(--gx-dim);font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;transition:fill var(--gx-t) var(--gx-ease)}
.gx-text{fill:var(--gx-text);font-size:13px;transition:fill var(--gx-t) var(--gx-ease)}
.gx-line,.gx-head{fill:none;stroke:var(--gx-dim);stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;transition:stroke var(--gx-t) var(--gx-ease)}
.gx-dashed{stroke-dasharray:3 4}
.gx-line[data-draw]{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 900ms var(--gx-ease),stroke var(--gx-t) var(--gx-ease)}
.gx-line[data-draw].gx-drawn{stroke-dashoffset:0}
.gx-badge circle{fill:var(--gx-fill);stroke:var(--gx-dim);stroke-width:1;transition:all var(--gx-t) var(--gx-ease)}
.gx-badge text{fill:var(--gx-dim);font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:11px;transition:fill var(--gx-t) var(--gx-ease)}
.gx-dot circle{fill:var(--gx-dim);transition:fill var(--gx-t) var(--gx-ease)}
.gx-lit .gx-box{stroke:var(--gx-ink);fill:var(--gx-lit-fill)}
.gx-lit .gx-title,.gx-lit .gx-text{fill:var(--gx-ink)}
.gx-lit .gx-sub,.gx-lit .gx-mono{fill:var(--gx-text)}
.gx-lit .gx-line,.gx-lit .gx-head{stroke:var(--gx-ink)}
.gx-lit.gx-badge circle{fill:var(--gx-ink);stroke:var(--gx-ink)}
.gx-lit.gx-badge text{fill:#111}
.gx-lit.gx-dot circle{fill:var(--gx-ink)}
.gx-accent.gx-lit .gx-box,.gx-accent.gx-lit .gx-line,.gx-accent.gx-lit .gx-head{stroke:var(--gx-accent)}
.gx-accent.gx-lit .gx-title,.gx-accent.gx-lit .gx-text,.gx-accent.gx-lit .gx-mono,.gx-accent.gx-lit .gx-sub,.gx-accent.gx-lit.gx-mono{fill:var(--gx-accent)}
.gx-accent.gx-lit.gx-badge circle,.gx-accent.gx-lit.gx-dot circle{fill:var(--gx-accent);stroke:var(--gx-accent)}
.gx-rail{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 4px;margin:22px 0 0;padding:0;list-style:none;font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:11px;letter-spacing:.04em}
.gx-rail li{display:flex;align-items:center;gap:4px}
.gx-rail button{display:inline-flex;align-items:center;gap:7px;padding:5px 9px;border:1px solid transparent;border-radius:999px;background:none;color:var(--gx-dim);font:inherit;cursor:pointer;transition:color var(--gx-t) var(--gx-ease),border-color var(--gx-t) var(--gx-ease)}
.gx-rail .gx-n{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;border:1px solid currentColor;font-size:10px}
.gx-rail li.is-done button{color:var(--gx-text)}
.gx-rail li.is-active button{color:var(--gx-ink);border-color:var(--gx-hair)}
.gx-rail li.is-active .gx-n{background:var(--gx-ink);border-color:var(--gx-ink);color:#111}
.gx-rail .gx-sep{color:var(--gx-dim)}
.gx-reduced *{transition:none!important}
@media (max-width:520px){.gx-rail{font-size:10px}.gx-rail button{padding:4px 6px}}
`;

const RUNTIME = String.raw`
const cfg = JSON.parse(document.getElementById("gx-config").textContent);
const root = document.querySelector(".gx");
const readout = document.querySelector("[data-readout]");
const rail = [...root.querySelectorAll(".gx-rail li[data-n]")];
const N = cfg.steps.length;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced) root.classList.add("gx-reduced");

function inRange(spec, s) {
  return String(spec).split(",").some((part) => {
    part = part.trim();
    if (!part) return false;
    if (!part.includes("-")) return Number(part) === s;
    const [a, b] = part.split("-");
    return s >= (a === "" ? 1 : Number(a)) && s <= (b === "" ? Infinity : Number(b));
  });
}
const els = {
  show: [...root.querySelectorAll("[data-show]")],
  lit: [...root.querySelectorAll("[data-lit]")],
  at: [...root.querySelectorAll("[data-at]")].map((el) => ({
    el,
    keys: el.dataset.at.split(";").map((kv) => { const [k, v] = kv.split(":"); const [x, y] = v.split(",").map(Number); return [Number(k), x, y]; }).sort((a, b) => a[0] - b[0]),
  })),
  draw: [...root.querySelectorAll("[data-draw]")],
  snap: [...root.querySelectorAll("[data-snap]")],
};
for (const g of root.querySelectorAll("[data-stagger]")) {
  const gap = Number(g.dataset.stagger) || 0;
  [...g.children].forEach((child, i) => { child.style.transitionDelay = (i * gap) + "ms"; });
}

let step = Math.min(Math.max(cfg.still || 1, 1), N);
function apply(s) {
  step = s;
  const snapping = els.snap.filter((el) => inRange(el.dataset.snap, s));
  for (const el of snapping) el.classList.add("gx-snapping");
  root.dataset.step = String(s);
  for (const el of els.show) el.classList.toggle("gx-hidden", !inRange(el.dataset.show, s));
  for (const el of els.lit) el.classList.toggle("gx-lit", inRange(el.dataset.lit, s));
  for (const { el, keys } of els.at) {
    let pos = [0, 0];
    for (const [k, x, y] of keys) if (k <= s) pos = [x, y];
    el.style.transform = "translate(" + pos[0] + "px," + pos[1] + "px)";
  }
  for (const el of els.draw) el.classList.toggle("gx-drawn", inRange(el.dataset.draw, s));
  rail.forEach((li) => {
    const n = Number(li.dataset.n);
    li.classList.toggle("is-active", n === s);
    li.classList.toggle("is-done", n < s);
    li.querySelector("button").setAttribute("aria-current", n === s ? "step" : "false");
  });
  if (snapping.length) {
    root.getBoundingClientRect(); // commit the jump before transitions come back
    requestAnimationFrame(() => { for (const el of snapping) el.classList.remove("gx-snapping"); });
  }
  const info = cfg.steps[s - 1];
  if (readout) readout.textContent = info.readout || "Step " + s + " · " + info.label;
}

let timer = 0, idle = 0, visible = true, held = false;
function schedule() {
  clearTimeout(timer);
  if (reduced || held || !visible) return;
  const info = cfg.steps[step - 1];
  timer = setTimeout(() => { apply(step % N + 1); schedule(); }, info.hold || cfg.hold);
}
function hold() {
  held = true;
  clearTimeout(timer);
  clearTimeout(idle);
  if (!reduced) idle = setTimeout(() => { held = false; schedule(); }, cfg.idle);
}
function go(s) { apply(((s - 1 + N) % N) + 1); hold(); }

root.addEventListener("click", (e) => {
  const li = e.target.closest(".gx-rail li[data-n]");
  go(li ? Number(li.dataset.n) : step + 1);
});
root.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); go(step + 1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); go(step - 1); }
  else if (e.key === "Home") { e.preventDefault(); go(1); }
});
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else clearTimeout(timer); }).observe(root);

// Start from step 1 so the first transitions play; reduced motion opens on the still step.
apply(reduced ? step : 1);
schedule();
`;

/**
 * A standalone graphic page in the Anatomy card, ready for <Diagram>.
 *
 *   fig, title      the card corners ("Fig 2", short title)
 *   viewBox         [x, y, w, h] of the drawing
 *   svg             the drawing (primitives above, joined)
 *   steps           [{ label, readout?, hold? }], 1-based in the rail
 *   hint            bottom-left corner (default "Click or → to step")
 *   keys            optional legend keys, as plateHtml takes them
 *   still           the step shown under reduced motion (default 1)
 *   hold, idle      ms per step (2800) and idle time before resuming (6000)
 */
export function graphicPage({ fig, title, viewBox, svg, steps, hint = "Click or → to step", keys = [], still = 1, hold = 2800, idle = 6000 }) {
  const [vx, vy, vw, vh] = viewBox;
  const railHtml = steps
    .map(
      (s, i) =>
        `<li data-n="${i + 1}"><button type="button" tabindex="-1"><span class="gx-n">${i + 1}</span>${esc(s.label)}</button></li>` +
        (i < steps.length - 1 ? `<li class="gx-sep" aria-hidden="true">→</li>` : `<li class="gx-sep" aria-hidden="true">↺</li>`),
    )
    .join("");
  const config = JSON.stringify({ steps, still, hold, idle }).replace(/</g, "\\u003c");
  const body =
    `<style>${GX_CSS}</style>` +
    plateHtml({
      fig,
      title,
      hint,
      readout: steps[0] ? steps[0].readout || `Step 1 · ${steps[0].label}` : "",
      keys,
      body:
        `<div class="gx" tabindex="0" role="group" aria-label="${esc(title)}: ${steps.length} steps; click or use the arrow keys to step">` +
        `<svg class="gx-svg" viewBox="${vx} ${vy} ${vw} ${vh}" role="img" aria-label="${esc(title)}">${svg}</svg>` +
        `<ol class="gx-rail">${railHtml}</ol>` +
        `</div>` +
        `<script type="application/json" id="gx-config">${config}</script>`,
    });
  return figurePage({ title, body, script: RUNTIME });
}
