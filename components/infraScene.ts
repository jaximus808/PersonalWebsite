import { BENCH, type ArmCloud } from "./yamArms"

/**
 * The other half of the About background: the same dots as a small data
 * center on the same bench. Requests stream in from the left, converge on a
 * gateway, rise into overhead cable trays and drop into two rows of server
 * racks. Racks are drawn as dotted edges with blade lines, so they read as
 * hardware rather than solid blocks. Everything is in meters, in the same
 * frame as the YAM arms, so the bench stays put while the rest swaps.
 */

type V3 = [number, number, number]

const GATE = { x: -0.24, w: 0.045, h: 0.3, d: 0.2 }
const RACK = { w: 0.09, h: 0.34, d: 0.12 }
const RACK_X = [-0.08, 0.06, 0.2, 0.34]
const RACK_Z = [-0.13, 0.11]
const TRAY_Y = 0.42
const TRAY_START = -0.17
const PACKETS = 60
const PACKET_DOTS = 12
/** Seconds for a request to get from the edge of the scene into a rack. */
const TRIP = 3.2

/** Dot kinds. Hidden dots sit this scene out (it needs fewer than the arms). */
export const FIXED = 0
export const PACKET = 1
export const HIDDEN = 2

type Path = { pts: V3[]; cum: number[] }

function pathOf(pts: V3[]): Path {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]]
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]))
  }
  return { pts, cum }
}

function along(p: Path, u: number, out: V3) {
  const s = u * p.cum[p.cum.length - 1]
  let i = 1
  while (i < p.cum.length - 1 && p.cum[i] < s) i++
  const t = (s - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1] || 1)
  const [a, b] = [p.pts[i - 1], p.pts[i]]
  out[0] = a[0] + (b[0] - a[0]) * t
  out[1] = a[1] + (b[1] - a[1]) * t
  out[2] = a[2] + (b[2] - a[2]) * t
}

// A tiny seeded random, so every visitor sees the same traffic pattern.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

/** Each request: in from the left edge, through the gateway, up, along a tray, down into a rack. */
const PACKET_PATHS: Path[] = (() => {
  const r = rng(7)
  return Array.from({ length: PACKETS }, (_, p) => {
    const row = p % 2
    const rack = Math.floor(r() * RACK_X.length)
    const y = 0.05 + r() * 0.32
    const z = -0.22 + r() * 0.48
    const gy = 0.06 + r() * 0.2
    const gz = (r() - 0.5) * (GATE.d - 0.04)
    const rz = RACK_Z[row]
    return pathOf([
      [-0.62, y, z],
      [GATE.x - GATE.w / 2, gy, gz],
      [GATE.x + GATE.w / 2, gy, gz],
      [TRAY_START, TRAY_Y, rz],
      [RACK_X[rack], TRAY_Y, rz],
      [RACK_X[rack], RACK.h, rz],
    ])
  })
})()

export type InfraCloud = {
  /** BENCH (left where the arms had it), FIXED, PACKET or HIDDEN. */
  kind: Int8Array
  /** Fixed: world position. Packet dot: its offset from the packet's center. */
  pos: Float32Array
  packet: Int16Array
  /** Relative dot size for fixed dots (edges read stronger than blades). */
  weight: Float32Array
}

/** Dotted segment from a to b, `step` meters apart. */
function dotted(a: V3, b: V3, step: number): V3[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const n = Math.max(1, Math.round(len / step))
  const out: V3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
  }
  return out
}

/** The 12 edges of a box standing on the floor at (x, z). */
function boxEdges(x: number, z: number, w: number, h: number, d: number, step: number): V3[] {
  const xs = [x - w / 2, x + w / 2]
  const ys = [0, h]
  const zs = [z - d / 2, z + d / 2]
  const out: V3[] = []
  for (const y of ys) for (const zz of zs) out.push(...dotted([xs[0], y, zz], [xs[1], y, zz], step))
  for (const xx of xs) for (const zz of zs) out.push(...dotted([xx, 0, zz], [xx, h, zz], step))
  for (const xx of xs) for (const y of ys) out.push(...dotted([xx, y, zs[0]], [xx, y, zs[1]], step))
  return out
}

/**
 * Assigns every dot of `arms` a place in the data center. Bench dots keep
 * their arm-scene positions so the floor doesn't move when the scenes swap.
 */
export function buildInfraCloud(arms: ArmCloud): InfraCloud {
  const n = arms.part.length
  const kind = new Int8Array(n).fill(HIDDEN)
  const pos = new Float32Array(n * 3)
  const packet = new Int16Array(n)
  const weight = new Float32Array(n).fill(1)

  const free: number[] = []
  for (let i = 0; i < n; i++) {
    if (arms.part[i] === BENCH) {
      kind[i] = BENCH
      pos.set(arms.local.subarray(i * 3, i * 3 + 3), i * 3)
    } else free.push(i)
  }
  let k = 0
  const put = (at: V3, w = 1) => {
    if (k >= free.length) return
    const i = free[k++]
    kind[i] = FIXED
    weight[i] = w
    pos[i * 3] = at[0]
    pos[i * 3 + 1] = at[1]
    pos[i * 3 + 2] = at[2]
  }

  // Requests in flight.
  const r = rng(11)
  for (let p = 0; p < PACKETS; p++) {
    for (let d = 0; d < PACKET_DOTS && k < free.length; d++) {
      const i = free[k++]
      kind[i] = PACKET
      packet[i] = p
      pos[i * 3] = (r() - 0.5) * 0.014
      pos[i * 3 + 1] = (r() - 0.5) * 0.014
      pos[i * 3 + 2] = (r() - 0.5) * 0.014
    }
  }

  // Racks: dotted edges, blade lines across the front, a few status lights.
  for (const z of RACK_Z) {
    for (const x of RACK_X) {
      for (const at of boxEdges(x, z, RACK.w, RACK.h, RACK.d, 0.005)) put(at)
      const front = z + RACK.d / 2
      for (let y = 0.03; y < RACK.h - 0.015; y += 0.03) {
        for (const at of dotted([x - RACK.w / 2 + 0.01, y, front], [x + RACK.w / 2 - 0.01, y, front], 0.007)) put(at, 0.7)
        put([x + RACK.w / 2 - 0.012, y + 0.01, front], 1.4)
      }
    }
  }

  // The gateway: a slim box with port lines on the side facing the traffic.
  for (const at of boxEdges(GATE.x, 0, GATE.w, GATE.h, GATE.d, 0.005)) put(at)
  for (let y = 0.04; y < GATE.h - 0.02; y += 0.04) {
    const x = GATE.x - GATE.w / 2
    for (const at of dotted([x, y, -GATE.d / 2 + 0.015], [x, y, GATE.d / 2 - 0.015], 0.008)) put(at, 0.7)
  }

  // Overhead cable trays: up from the gateway, along each row, down to each rack.
  for (const z of RACK_Z) {
    for (const at of dotted([GATE.x + GATE.w / 2, GATE.h, z * 0.5], [TRAY_START, TRAY_Y, z], 0.009)) put(at, 0.8)
    for (const at of dotted([TRAY_START, TRAY_Y, z], [RACK_X[RACK_X.length - 1], TRAY_Y, z], 0.008)) put(at, 0.8)
    for (const x of RACK_X) for (const at of dotted([x, TRAY_Y, z], [x, RACK.h, z], 0.01)) put(at, 0.8)
  }

  return { kind, pos, packet, weight }
}

/**
 * Writes each packet's center at time `t` into `out` as xyz plus a 0–1 size
 * (requests fade in at the edge and wink out as they land), four per packet.
 */
export function placePackets(out: Float32Array, t: number) {
  const tmp: V3 = [0, 0, 0]
  for (let p = 0; p < PACKETS; p++) {
    const speed = 0.85 + ((p * 7) % 5) * 0.08
    const u = (t / (TRIP * speed) + p / PACKETS) % 1
    along(PACKET_PATHS[p], u, tmp)
    out[p * 4] = tmp[0]
    out[p * 4 + 1] = tmp[1]
    out[p * 4 + 2] = tmp[2]
    out[p * 4 + 3] = Math.min(1, u / 0.12, (1 - u) / 0.04)
  }
}

export const PACKET_COUNT = PACKETS
