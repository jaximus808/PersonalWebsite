import * as THREE from "three"

/**
 * Two i2rt YAM arms on a dotted bench, passing a small cube back and forth,
 * drawn with the same dots as the hero cloud. Link lengths follow i2rt's
 * MuJoCo model (yam.xml): 0.264 m upper arm, 0.245 m forearm, ~0.075 m
 * wrist. Everything here is in meters; the background scales it into its
 * scene and blends each dot from the cloud into its place on an arm.
 */

type V3 = [number, number, number]

const SHOULDER_H = 0.11
const L1 = 0.264
const L2 = 0.245
const L3 = 0.075
const FINGER_X = 0.058 // wrist roll → finger root
const REACH = L3 + FINGER_X + 0.035 // wrist pitch → where a held object sits

const GAP = { open: 0.1, idle: 0.075, hold: 0.058 }
const CUBE = 0.05
const DOWN = -Math.PI / 2
const HOME_PHI = -0.9

const BASES: [V3, V3] = [
  [-0.34, 0, -0.06],
  [0.34, 0, -0.06],
]
// Picks and the handover sit between the arms rather than out in front, so
// the reaches read side-on from the camera instead of foreshortened.
const SPOTS: [V3, V3] = [
  [-0.1, CUBE / 2, 0.08],
  [0.1, CUBE / 2, 0.08],
]
const HOMES: [V3, V3] = [
  [-0.25, 0.3, 0.04],
  [0.25, 0.3, 0.04],
]
const HANDOVER: V3 = [0, 0.26, 0.02]

/** Seconds for one pass, left to right; the next pass runs it back. */
const CYCLE = 12

// ---------------------------------------------------------------------------
// The dots: each one belongs to a link (or the cube, or the bench) and keeps
// a fixed point on that part's surface.

type Prim =
  | { link: number; box: V3; c: V3; w?: number }
  | { link: number; cyl: [radius: number, length: number]; axis: 0 | 1 | 2; c: V3; w?: number }

// Links: 0 base, 1 turret (yaw), 2 upper arm, 3 forearm, 4 wrist, 5 palm
// (roll), 6 and 7 fingers. Arms reach along their link's local +x.
const ARM: Prim[] = [
  { link: 0, box: [0.12, 0.015, 0.12], c: [0, 0.0075, 0] },
  { link: 0, cyl: [0.045, 0.03], axis: 1, c: [0, 0.03, 0] },
  { link: 1, box: [0.06, 0.07, 0.06], c: [0, 0.075, 0] },
  { link: 2, cyl: [0.038, 0.075], axis: 2, c: [0, 0, 0] },
  { link: 2, box: [L1, 0.032, 0.042], c: [L1 / 2, 0, 0] },
  { link: 3, cyl: [0.032, 0.065], axis: 2, c: [0, 0, 0] },
  { link: 3, box: [L2, 0.028, 0.036], c: [L2 / 2, 0, 0] },
  { link: 4, cyl: [0.026, 0.055], axis: 2, c: [0, 0, 0] },
  { link: 4, box: [L3, 0.03, 0.03], c: [L3 / 2, 0, 0] },
  { link: 5, cyl: [0.024, 0.024], axis: 0, c: [0.012, 0, 0] },
  { link: 5, box: [0.035, 0.035, 0.1], c: [0.04, 0, 0] },
  // Fingers are small; weight them up so the gripper still reads.
  { link: 6, box: [0.06, 0.022, 0.01], c: [0.03, 0, 0], w: 2.5 },
  { link: 7, box: [0.06, 0.022, 0.01], c: [0.03, 0, 0], w: 2.5 },
]
const LINKS_PER_ARM = 8

/** Marks a dot as part of the bench (world space) or the cube. */
export const BENCH = -1
export const CUBE_PART = -2

function area(p: Prim): number {
  if ("box" in p) {
    const [x, y, z] = p.box
    return 2 * (x * y + y * z + x * z)
  }
  const [r, l] = p.cyl
  return 2 * Math.PI * r * l + 2 * Math.PI * r * r
}

function sample(p: Prim): V3 {
  const out: V3 = [p.c[0], p.c[1], p.c[2]]
  if ("box" in p) {
    const s = p.box
    const faces = [s[0] * s[1], s[1] * s[2], s[0] * s[2]]
    let pick = Math.random() * (faces[0] + faces[1] + faces[2])
    // Face normal axis: the one not spanned by the chosen face.
    const normal = pick < faces[0] ? 2 : (pick -= faces[0]) < faces[1] ? 0 : 1
    for (let a = 0; a < 3; a++) {
      out[a] += a === normal ? (Math.random() < 0.5 ? -0.5 : 0.5) * s[a] : (Math.random() - 0.5) * s[a]
    }
    return out
  }
  const [r, l] = p.cyl
  const [u, v] = [(p.axis + 1) % 3, (p.axis + 2) % 3]
  const side = 2 * Math.PI * r * l
  const t = Math.random() * 2 * Math.PI
  if (Math.random() * (side + 2 * Math.PI * r * r) < side) {
    out[p.axis] += (Math.random() - 0.5) * l
    out[u] += r * Math.cos(t)
    out[v] += r * Math.sin(t)
  } else {
    const rr = r * Math.sqrt(Math.random())
    out[p.axis] += (Math.random() < 0.5 ? -0.5 : 0.5) * l
    out[u] += rr * Math.cos(t)
    out[v] += rr * Math.sin(t)
  }
  return out
}

export type ArmCloud = {
  /** Link index (arm * 8 + link), or BENCH / CUBE_PART. */
  part: Int8Array
  /** Each dot's fixed point in its part's local frame, xyz. */
  local: Float32Array
}

/** Lays `n` dots over the bench, the cube, and both arms, in random order. */
export function buildArmCloud(n: number): ArmCloud {
  const part = new Int8Array(n)
  const local = new Float32Array(n * 3)
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  let k = 0
  const put = (p: number, at: V3) => {
    if (k >= n) return
    const i = order[k++]
    part[i] = p
    local[i * 3] = at[0]
    local[i * 3 + 1] = at[1]
    local[i * 3 + 2] = at[2]
  }

  // A sparse grid for the bench, so the arms stand on something.
  for (let x = -0.48; x <= 0.481; x += 0.04) {
    for (let z = -0.24; z <= 0.321; z += 0.04) put(BENCH, [x, 0, z])
  }
  const cube: Prim = { link: 0, box: [CUBE, CUBE, CUBE], c: [0, 0, 0] }
  const cubeDots = Math.round(n * 0.04)
  for (let c = 0; c < cubeDots; c++) put(CUBE_PART, sample(cube))

  const weights = ARM.map((p) => area(p) * (p.w ?? 1))
  const total = weights.reduce((a, b) => a + b, 0)
  for (let arm = 0; k < n; arm = 1 - arm) {
    let pick = Math.random() * total
    let j = 0
    while (j < ARM.length - 1 && (pick -= weights[j]) > 0) j++
    put(arm * LINKS_PER_ARM + ARM[j].link, sample(ARM[j]))
  }
  return { part, local }
}

// ---------------------------------------------------------------------------
// Motion: each arm follows keyframed targets for the point between its
// fingers; a small IK solve turns that into joint angles every frame.

type ArmPose = { yaw: number; q2: number; q3: number; q4: number; gap: number }

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** Joint angles that put the grasp point at `g`, tool pitched at `phi`, elbow up. */
function solve(arm: 0 | 1, g: V3, phi: number, gap: number): ArmPose {
  const b = BASES[arm]
  const vx = g[0] - b[0]
  const vz = g[2] - b[2]
  const yaw = Math.atan2(-vz, vx)
  const wr = Math.hypot(vx, vz) - REACH * Math.cos(phi)
  const wz = g[1] - b[1] - REACH * Math.sin(phi) - SHOULDER_H
  const d = clamp(Math.hypot(wr, wz), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3)
  const q3 = -Math.acos(clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1))
  const q2 = Math.atan2(wz, wr) - Math.atan2(L2 * Math.sin(q3), L1 + L2 * Math.cos(q3))
  return { yaw, q2, q3, q4: phi - q2 - q3, gap }
}

type Key = [t: number, at: V3, phi: number, gap: number]

const above = (p: V3): V3 => [p[0], 0.16, p[2]]

/** `p`, pulled back toward the arm's base by `dist` (for approaching sideways). */
function back(arm: 0 | 1, p: V3, dist: number): V3 {
  const b = BASES[arm]
  const dx = p[0] - b[0]
  const dz = p[2] - b[2]
  const l = Math.hypot(dx, dz)
  return [p[0] - (dx / l) * dist, p[1], p[2] - (dz / l) * dist]
}

type Pass = { giver: 0 | 1; keys: [Key[], Key[]] }

/** One pass: `giver` picks the cube off its side, hands it over, the other arm sets it down. */
function pass(giver: 0 | 1): Pass {
  const taker = (1 - giver) as 0 | 1
  const P = SPOTS[giver]
  const Q = SPOTS[taker]
  const H = HANDOVER
  const give: Key[] = [
    [0, HOMES[giver], HOME_PHI, GAP.idle],
    [1.4, above(P), DOWN, GAP.open],
    [2.2, P, DOWN, GAP.open],
    [2.6, P, DOWN, GAP.hold],
    [3.4, above(P), DOWN, GAP.hold],
    [4.8, H, 0, GAP.hold],
    [6.2, H, 0, GAP.hold],
    [6.6, H, 0, GAP.open],
    [7.6, back(giver, H, 0.09), 0, GAP.open],
    [9.0, HOMES[giver], HOME_PHI, GAP.idle],
    [CYCLE, HOMES[giver], HOME_PHI, GAP.idle],
  ]
  const take: Key[] = [
    [0, HOMES[taker], HOME_PHI, GAP.idle],
    [3.6, HOMES[taker], HOME_PHI, GAP.idle],
    [5.0, back(taker, H, 0.09), 0, GAP.open],
    [5.8, H, 0, GAP.open],
    [6.2, H, 0, GAP.hold],
    [6.6, H, 0, GAP.hold],
    [7.8, above(Q), DOWN, GAP.hold],
    [8.6, Q, DOWN, GAP.hold],
    [9.0, Q, DOWN, GAP.open],
    [9.8, above(Q), DOWN, GAP.open],
    [11.2, HOMES[taker], HOME_PHI, GAP.idle],
    [CYCLE, HOMES[taker], HOME_PHI, GAP.idle],
  ]
  return { giver, keys: giver === 0 ? [give, take] : [take, give] }
}

const PASSES: [Pass, Pass] = [pass(0), pass(1)]

function at(keys: Key[], t: number): { p: V3; phi: number; gap: number } {
  let i = 0
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++
  const [t0, a, phi0, gap0] = keys[i]
  const [t1, b, phi1, gap1] = keys[i + 1]
  const s = clamp((t - t0) / (t1 - t0), 0, 1)
  const e = 0.5 - 0.5 * Math.cos(Math.PI * s)
  return {
    p: [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e],
    phi: phi0 + (phi1 - phi0) * e,
    gap: gap0 + (gap1 - gap0) * e,
  }
}

const _t = new THREE.Matrix4()
const _r = new THREE.Matrix4()
const _identity = new THREE.Matrix4()

/** Right-multiplies `m` by a translation and then a rotation about one axis. */
function step(m: THREE.Matrix4, from: THREE.Matrix4, x: number, y: number, z: number, axis: 0 | 1 | 2, angle: number) {
  _t.makeTranslation(x, y, z)
  if (axis === 0) _r.makeRotationX(angle)
  else if (axis === 1) _r.makeRotationY(angle)
  else _r.makeRotationZ(angle)
  m.multiplyMatrices(from, _t).multiply(_r)
}

/** One matrix per link for both arms, plus one for the cube (index 16). */
export function makeLinkMatrices(): THREE.Matrix4[] {
  return Array.from({ length: LINKS_PER_ARM * 2 + 1 }, () => new THREE.Matrix4())
}

/**
 * Poses both arms and the cube at time `t` (seconds since they assembled)
 * and writes each part's local → world (meters) matrix into `m`.
 */
export function poseArms(m: THREE.Matrix4[], t: number) {
  const n = Math.floor(Math.max(0, t) / CYCLE)
  const tc = Math.max(0, t) - n * CYCLE
  const run = PASSES[n % 2]

  const poses = ([0, 1] as const).map((arm) => {
    const k = at(run.keys[arm], tc)
    return solve(arm, k.p, k.phi, k.gap)
  })

  for (const arm of [0, 1] as const) {
    const q = poses[arm]
    const o = arm * LINKS_PER_ARM
    const b = BASES[arm]
    m[o].makeTranslation(b[0], b[1], b[2])
    step(m[o + 1], m[o], 0, 0, 0, 1, q.yaw)
    step(m[o + 2], m[o + 1], 0, SHOULDER_H, 0, 2, q.q2)
    step(m[o + 3], m[o + 2], L1, 0, 0, 2, q.q3)
    step(m[o + 4], m[o + 3], L2, 0, 0, 2, q.q4)
    step(m[o + 5], m[o + 4], L3, 0, 0, 0, 0)
    step(m[o + 6], m[o + 5], FINGER_X, 0, q.gap / 2, 0, 0)
    step(m[o + 7], m[o + 5], FINGER_X, 0, -q.gap / 2, 0, 0)
  }

  // The cube rests on the giver's side, rides in whichever gripper holds it,
  // and turns with that arm so it stays square to the fingers.
  const giver = run.giver
  const taker = (1 - giver) as 0 | 1
  let p: V3
  let yaw: number
  if (tc < 2.6) {
    p = SPOTS[giver]
    yaw = solve(giver, p, DOWN, 0).yaw
  } else if (tc < 6.4) {
    p = at(run.keys[giver], tc).p
    // Square to the taker's fingers by the time it lets go. A cube looks the
    // same every quarter turn, so take the short way round.
    const s = clamp((tc - 6.2) / 0.2, 0, 1)
    let d = poses[taker].yaw - poses[giver].yaw
    d -= (Math.PI / 2) * Math.round(d / (Math.PI / 2))
    yaw = poses[giver].yaw + d * s
  } else if (tc < 9.0) {
    p = at(run.keys[taker], tc).p
    yaw = poses[taker].yaw
  } else {
    p = SPOTS[taker]
    yaw = solve(taker, p, DOWN, 0).yaw
  }
  step(m[LINKS_PER_ARM * 2], _identity, p[0], p[1], p[2], 1, yaw)
}
