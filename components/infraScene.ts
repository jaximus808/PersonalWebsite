import { BENCH, CUBE_PART, makeLinkMatrices, poseArms, type ArmCloud } from "./yamArms"

/**
 * The other half of the About background: the same dots as a small
 * distributed system on the same bench. Three regions, each a platform with a
 * gateway, two services and a database, all drawn as dotted wireframes.
 * Requests come in to each region from its own side, hop gateway → service →
 * database, and the databases replicate to each other along the floor. Partway
 * through, the back region goes down: it dims, replication to it stops, and
 * its traffic fails over to the other two until it recovers.
 *
 * Everything is in meters, in the same frame as the YAM arms, so the bench
 * stays put while the rest morphs.
 */

type V3 = [number, number, number]

/** Dot kinds. Hidden dots sit this scene out (it needs fewer than the arms). */
export const FIXED = 0
export const PACKET = 1
export const HIDDEN = 2

type Region = { x: number; z: number; entry: V3 }

const REGIONS: Region[] = [
  { x: -0.27, z: 0.11, entry: [-0.64, 0.03, 0.11] },
  { x: 0.03, z: -0.13, entry: [0.03, 0.03, -0.5] },
  { x: 0.31, z: 0.11, entry: [0.66, 0.03, 0.11] },
]
const PLATFORM = { w: 0.26, d: 0.2 }

// Inside a region, relative to its center.
const GATEWAY = { x: -0.085, z: 0, w: 0.045, h: 0.12, d: 0.12 }
const SERVICES = [
  { x: 0.005, z: -0.05, w: 0.05, h: 0.2, d: 0.05 },
  { x: 0.005, z: 0.05, w: 0.05, h: 0.26, d: 0.05 },
]
const DB = { x: 0.085, z: 0, r: 0.035, h: 0.14 }

/** Seconds the back region (index 1) is down, within each showing. */
const OUTAGE: [number, number] = [3.2, 7.2]
const DOWN = 1

const REQUESTS_PER_REGION = 14
const REPLICAS_PER_LINK = 6
const PACKETS = REQUESTS_PER_REGION * REGIONS.length + REPLICAS_PER_LINK * 3
const PACKET_DOTS = 12
const TRIP = 2.6

const LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 2],
]

const at = (r: number, x: number, y: number, z: number): V3 => [REGIONS[r].x + x, y, REGIONS[r].z + z]
const gatewayOf = (r: number) => at(r, GATEWAY.x, 0.05, GATEWAY.z)
const serviceOf = (r: number, s: number) => at(r, SERVICES[s].x, 0.05, SERVICES[s].z)
const dbOf = (r: number) => at(r, DB.x, 0.05, DB.z)

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

// A tiny seeded random, so the layout and traffic are the same every visit.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

/** A request from `home`'s side, served by region `to` through service `s`. */
const request = (home: number, to: number, s: number, spread: number) => {
  const e = REGIONS[home].entry
  // Spread the entry point sideways a little so streams read as many users.
  const entry: V3 = home === 1 ? [e[0] + spread, e[1], e[2]] : [e[0], e[1], e[2] + spread]
  return pathOf([entry, gatewayOf(to), serviceOf(to, s), dbOf(to)])
}

type Packet =
  | { kind: "request"; home: number; fallback: number; paths: Path[] }
  | { kind: "replica"; a: number; b: number; path: Path }

const PACKET_LIST: Packet[] = (() => {
  const r = rng(5)
  const out: Packet[] = []
  for (let home = 0; home < REGIONS.length; home++) {
    for (let p = 0; p < REQUESTS_PER_REGION; p++) {
      const spread = (r() - 0.5) * 0.12
      const fallback = home === DOWN ? (p % 2 === 0 ? 0 : 2) : home
      out.push({
        kind: "request",
        home,
        fallback,
        // [home via service 0, home via 1, fallback via 0, fallback via 1]
        paths: [request(home, home, 0, spread), request(home, home, 1, spread), request(home, fallback, 0, spread), request(home, fallback, 1, spread)],
      })
    }
  }
  for (const [a, b] of LINKS) {
    for (let p = 0; p < REPLICAS_PER_LINK; p++) {
      const [from, to] = p % 2 === 0 ? [a, b] : [b, a]
      out.push({ kind: "replica", a, b, path: pathOf([dbOf(from), dbOf(to)]) })
    }
  }
  return out
})()

/** 0–1: how up region `r` is at time `t`, easing over half a second. */
export function healthOf(r: number, t: number): number {
  if (r !== DOWN) return 1
  const ramp = 0.5
  const down = Math.min(1, Math.max(0, (t - OUTAGE[0]) / ramp)) * Math.min(1, Math.max(0, (OUTAGE[1] + ramp - t) / ramp))
  return 1 - down
}

export type InfraCloud = {
  /** BENCH (left where the arms had it), FIXED, PACKET or HIDDEN. */
  kind: Int8Array
  /** Fixed: world position. Packet dot: its offset from the packet's center. */
  pos: Float32Array
  packet: Int16Array
  /** Relative size for fixed dots (nodes read stronger than links). */
  weight: Float32Array
  /** The region a fixed dot belongs to (it dims when that region is down), or -1. */
  region: Int8Array
}

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

/** The 12 edges of a box standing on the floor at (x, z), plus a sparse lid. */
function boxOf(x: number, z: number, w: number, h: number, d: number): V3[] {
  const step = 0.005
  const xs = [x - w / 2, x + w / 2]
  const ys = [0, h]
  const zs = [z - d / 2, z + d / 2]
  const out: V3[] = []
  for (const y of ys) for (const zz of zs) out.push(...dotted([xs[0], y, zz], [xs[1], y, zz], step))
  for (const xx of xs) for (const zz of zs) out.push(...dotted([xx, 0, zz], [xx, h, zz], step))
  for (const xx of xs) for (const y of ys) out.push(...dotted([xx, y, zs[0]], [xx, y, zs[1]], step))
  for (let zz = zs[0] + 0.012; zz < zs[1] - 0.006; zz += 0.012) out.push(...dotted([xs[0], h, zz], [xs[1], h, zz], 0.012))
  return out
}

/** A database: rings at the bottom, middle and top, joined by a few staves. */
function cylinderOf(x: number, z: number, r: number, h: number): V3[] {
  const out: V3[] = []
  for (const y of [0, h * 0.5, h]) {
    for (let a = 0; a < 2 * Math.PI; a += 0.005 / r) out.push([x + r * Math.cos(a), y, z + r * Math.sin(a)])
  }
  for (let a = 0; a < 2 * Math.PI; a += Math.PI / 4) out.push(...dotted([x + r * Math.cos(a), 0, z + r * Math.sin(a)], [x + r * Math.cos(a), h, z + r * Math.sin(a)], 0.006))
  return out
}

/**
 * Assigns every dot of `arms` a place in the distributed system. Bench dots
 * keep their arm-scene positions so the floor doesn't move between scenes.
 */
export function buildInfraCloud(arms: ArmCloud): InfraCloud {
  const n = arms.part.length
  const kind = new Int8Array(n).fill(HIDDEN)
  const pos = new Float32Array(n * 3)
  const packet = new Int16Array(n)
  const weight = new Float32Array(n).fill(1)
  const region = new Int8Array(n).fill(-1)

  const free: number[] = []
  for (let i = 0; i < n; i++) {
    if (arms.part[i] === BENCH) {
      kind[i] = BENCH
      pos.set(arms.local.subarray(i * 3, i * 3 + 3), i * 3)
    } else free.push(i)
  }
  const r = rng(11)

  // Requests in flight take a random handful of dots; they fade in along
  // their routes anyway.
  for (let p = 0; p < PACKETS; p++) {
    for (let d = 0; d < PACKET_DOTS && free.length; d++) {
      const i = free.splice(Math.floor(r() * free.length), 1)[0]
      kind[i] = PACKET
      packet[i] = p
      pos[i * 3] = (r() - 0.5) * 0.014
      pos[i * 3 + 1] = (r() - 0.5) * 0.014
      pos[i * 3 + 2] = (r() - 0.5) * 0.014
    }
  }

  // Everything else is collected first, then matched to the arm dots by
  // where they sit, so in the morph each dot only travels a short way and
  // the shape changes in place instead of passing through a cloud.
  const points: { p: V3; w: number; reg: number }[] = []
  const put = (p: V3, w: number, reg: number) => points.push({ p, w, reg })
  for (let g = 0; g < REGIONS.length; g++) {
    const { x, z } = REGIONS[g]
    // The platform: a dotted outline on the floor.
    const [x0, x1, z0, z1] = [x - PLATFORM.w / 2, x + PLATFORM.w / 2, z - PLATFORM.d / 2, z + PLATFORM.d / 2]
    for (const [a, b] of [
      [[x0, 0, z0], [x1, 0, z0]],
      [[x1, 0, z0], [x1, 0, z1]],
      [[x1, 0, z1], [x0, 0, z1]],
      [[x0, 0, z1], [x0, 0, z0]],
    ] as [V3, V3][])
      for (const p of dotted(a, b, 0.008)) put(p, 0.8, g)

    for (const p of boxOf(x + GATEWAY.x, z + GATEWAY.z, GATEWAY.w, GATEWAY.h, GATEWAY.d)) put(p, 1, g)
    for (const s of SERVICES) for (const p of boxOf(x + s.x, z + s.z, s.w, s.h, s.d)) put(p, 1, g)
    for (const p of cylinderOf(x + DB.x, z + DB.z, DB.r, DB.h)) put(p, 1, g)

    // Links inside the region, on the floor.
    const floor = (v: V3): V3 => [v[0], 0.002, v[2]]
    for (let s = 0; s < SERVICES.length; s++) {
      for (const p of dotted(floor(gatewayOf(g)), floor(serviceOf(g, s)), 0.01)) put(p, 0.6, g)
      for (const p of dotted(floor(serviceOf(g, s)), floor(dbOf(g)), 0.01)) put(p, 0.6, g)
    }
  }

  // Replication links between regions, on the floor.
  for (const [a, b] of LINKS) {
    for (const p of dotted([dbOf(a)[0], 0.002, dbOf(a)[2]], [dbOf(b)[0], 0.002, dbOf(b)[2]], 0.012)) put(p, 0.6, -1)
  }

  // Where each remaining arm dot sits with the arms at rest.
  const m = makeLinkMatrices()
  poseArms(m, 0)
  const restX = (i: number) => {
    const e = m[arms.part[i] === CUBE_PART ? 16 : arms.part[i]].elements
    const [x, y, z] = [arms.local[i * 3], arms.local[i * 3 + 1], arms.local[i * 3 + 2]]
    return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13]]
  }
  // Pair left to right, and within each vertical slice, bottom to top.
  const key = (x: number, y: number) => Math.round(x / 0.04) * 10 + y
  const dots = free.map((i) => ({ i, k: key(...(restX(i) as [number, number])) })).sort((a, b) => a.k - b.k)
  points.sort((a, b) => key(a.p[0], a.p[1]) - key(b.p[0], b.p[1]))
  // Spread the points evenly over the dots; the dots in between sit this
  // scene out and shrink where they are.
  const take = Math.min(points.length, dots.length)
  for (let j = 0; j < take; j++) {
    const i = dots[Math.floor((j * dots.length) / take)].i
    const { p, w, reg } = points[j]
    kind[i] = FIXED
    weight[i] = w
    region[i] = reg
    pos[i * 3] = p[0]
    pos[i * 3 + 1] = p[1]
    pos[i * 3 + 2] = p[2]
  }

  return { kind, pos, packet, weight, region }
}

/**
 * Writes each packet's center at time `t` into `out` as xyz plus a 0–1 size,
 * four per packet. Requests that start while their region is down take their
 * fallback; replication to a down region stops.
 */
export function placePackets(out: Float32Array, t: number) {
  const tmp: V3 = [0, 0, 0]
  for (let p = 0; p < PACKETS; p++) {
    const pk = PACKET_LIST[p]
    const trip = TRIP * (0.85 + ((p * 7) % 5) * 0.08)
    const phase = p / PACKETS
    const u = t / trip + phase
    const leg = Math.floor(u)
    const f = u - leg
    const startedAt = (leg - phase) * trip
    let size = Math.min(1, f / 0.12, (1 - f) / 0.06)
    if (pk.kind === "request") {
      const up = healthOf(pk.home, startedAt) > 0.5
      along(pk.paths[(up ? 0 : 2) + (leg % 2)], f, tmp)
    } else {
      along(pk.path, f, tmp)
      if (healthOf(pk.a, startedAt) < 0.5 || healthOf(pk.b, startedAt) < 0.5) size = 0
    }
    out[p * 4] = tmp[0]
    out[p * 4 + 1] = tmp[1]
    out[p * 4 + 2] = tmp[2]
    out[p * 4 + 3] = size
  }
}

export const PACKET_COUNT = PACKETS
export const REGION_COUNT = REGIONS.length
