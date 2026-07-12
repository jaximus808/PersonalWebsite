const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Genuinely-3D parametric point clouds for the landing-page background.
//
// The old generator could only sample height fields z = f(x, y) — a bumpy
// sheet — so shapes like "klein bottle" or "helix" were fakes. This version
// samples true (u, v) parametric surfaces and space curves, so we get real
// 3D forms: knots, a Mobius strip, a seashell, a superformula supershape,
// spherical harmonics, a Lorenz attractor, and so on.
//
// Every shape emits EXACTLY N points (no duplicate-padding), and each is
// recentered + scaled to a common visual radius so morphs stay balanced.
// ---------------------------------------------------------------------------

const N = 10800; // matches the instanced-mesh count the component expects
const TARGET_RADIUS = 6; // 95th-percentile radius each shape is scaled to
const TAU = Math.PI * 2;

// Deterministic PRNG so regenerating the file is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard-normal via Box-Muller, seeded.
function makeGaussian(rng) {
  return () => {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
}

// --- small vector helpers -------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// Sweep a circular tube of radius `rt` (with `ring` points around) along a
// space curve of `along` samples, using a parallel-ish frame. along*ring = N.
function tube(curve, along, ring, rt) {
  const pts = [];
  const eps = 1e-4;
  for (let i = 0; i < along; i++) {
    const t = (i / along) * TAU;
    const c = curve(t);
    const tangent = norm(sub(curve(t + eps), curve(t - eps)));
    // Reference axis: whichever unit axis is least aligned with the tangent.
    let ref = Math.abs(tangent[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const nrm = norm(sub(ref, [
      tangent[0] * dot(ref, tangent),
      tangent[1] * dot(ref, tangent),
      tangent[2] * dot(ref, tangent),
    ]));
    const bin = cross(tangent, nrm);
    for (let j = 0; j < ring; j++) {
      const a = (j / ring) * TAU;
      const ca = Math.cos(a) * rt;
      const sa = Math.sin(a) * rt;
      pts.push([
        c[0] + ca * nrm[0] + sa * bin[0],
        c[1] + ca * nrm[1] + sa * bin[1],
        c[2] + ca * nrm[2] + sa * bin[2],
      ]);
    }
  }
  return pts;
}

// Sample a (u, v) surface on an nu*nv grid (= N). `uWrap`/`vWrap` control
// whether the last row/col is a duplicate seam (exclude) or an endpoint (keep).
function surface(fn, nu, nv, uRange, vRange, uWrap, vWrap) {
  const pts = [];
  const uDen = uWrap ? nu : nu - 1;
  const vDen = vWrap ? nv : nv - 1;
  for (let iu = 0; iu < nu; iu++) {
    const u = uRange[0] + (uRange[1] - uRange[0]) * (iu / uDen);
    for (let iv = 0; iv < nv; iv++) {
      const v = vRange[0] + (vRange[1] - vRange[0]) * (iv / vDen);
      pts.push(fn(u, v));
    }
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Shapes. Each returns exactly N points as [x, y, z]. y is "up" (camera looks
// roughly horizontally from y=20), so disk-like forms read as seen-from-above.
// ---------------------------------------------------------------------------
const SHAPES = {
  sphere: () =>
    surface(
      (u, v) => [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)],
      120, 90, [0, TAU], [0, Math.PI], true, false
    ),

  torus: () =>
    surface(
      (u, v) => {
        const R = 3, r = 1.15;
        return [(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)];
      },
      120, 90, [0, TAU], [0, TAU], true, true
    ),

  // Trefoil (p=2,q=3) as a swept tube — a real knot, not a bumpy sheet.
  trefoilKnot: () =>
    tube(
      (t) => [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)],
      360, 30, 0.45
    ),

  // Double helix (DNA-ish): two phase-offset helical tubes, axis = y.
  helix: () => {
    const pts = [];
    const along = 360, ring = 15, turns = 3, R = 1.6, rt = 0.32;
    for (let strand = 0; strand < 2; strand++) {
      const phase = strand * Math.PI;
      const center = (t) => [R * Math.cos(t + phase), (t / (TAU * turns) - 0.5) * 10, R * Math.sin(t + phase)];
      for (let i = 0; i < along; i++) {
        const t = (i / along) * TAU * turns;
        const c = center(t);
        const tan = norm(sub(center(t + 1e-3), center(t - 1e-3)));
        let ref = Math.abs(tan[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        const nr = norm(sub(ref, [tan[0] * dot(ref, tan), tan[1] * dot(ref, tan), tan[2] * dot(ref, tan)]));
        const bn = cross(tan, nr);
        for (let j = 0; j < ring; j++) {
          const a = (j / ring) * TAU;
          const ca = Math.cos(a) * rt, sa = Math.sin(a) * rt;
          pts.push([c[0] + ca * nr[0] + sa * bn[0], c[1] + ca * nr[1] + sa * bn[1], c[2] + ca * nr[2] + sa * bn[2]]);
        }
      }
    }
    return pts;
  },

  mobius: () =>
    surface(
      (u, v) => {
        const half = u / 2;
        const s = 1 + (v / 2) * Math.cos(half);
        return [s * Math.cos(u), s * Math.sin(u), (v / 2) * Math.sin(half)];
      },
      200, 54, [0, TAU], [-1, 1], true, false
    ),

  // Figure-8 immersion of the Klein bottle — a genuine self-intersecting form.
  kleinBottle: () =>
    surface(
      (u, v) => {
        const r = 2;
        const t = (Math.cos(u / 2) * Math.sin(v)) - (Math.sin(u / 2) * Math.sin(2 * v));
        return [(r + t) * Math.cos(u), Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v), (r + t) * Math.sin(u)];
      },
      120, 90, [0, TAU], [0, TAU], true, true
    ),

  // Logarithmic seashell: a tube spiraling up a growing coil.
  seashell: () => {
    const pts = [];
    const along = 300, ring = 36, turns = 3.6;
    for (let i = 0; i < along; i++) {
      const t = (i / along) * TAU * turns;
      const r = Math.exp(0.18 * t);
      const tubeR = 0.28 * r;
      for (let j = 0; j < ring; j++) {
        const phi = (j / ring) * TAU;
        pts.push([
          (r + tubeR * Math.cos(phi)) * Math.cos(t),
          0.9 * t + tubeR * Math.sin(phi),
          (r + tubeR * Math.cos(phi)) * Math.sin(t),
        ]);
      }
    }
    return pts;
  },

  // Gielis superformula, spherical product of two profiles → a "supershape".
  supershape: () => {
    const sf = (angle, m, n1, n2, n3) => {
      const t = (m * angle) / 4;
      const r = Math.pow(Math.abs(Math.cos(t)), n2) + Math.pow(Math.abs(Math.sin(t)), n3);
      return Math.pow(r, -1 / n1);
    };
    return surface(
      (phi, theta) => {
        const r1 = sf(theta, 7, 0.2, 1.7, 1.7);
        const r2 = sf(phi, 7, 0.2, 1.7, 1.7);
        return [r2 * Math.cos(phi) * r1 * Math.cos(theta), r1 * Math.sin(theta), r2 * Math.sin(phi) * r1 * Math.cos(theta)];
      },
      120, 90, [-Math.PI, Math.PI], [-Math.PI / 2, Math.PI / 2], true, false
    );
  },

  // Spherical harmonic surface (classic m = [4,3,2,3,6,2,6,4]).
  sphericalHarmonic: () => {
    const m = [4, 3, 2, 3, 6, 2, 6, 4];
    return surface(
      (phi, theta) => {
        let r = 0;
        r += Math.pow(Math.sin(m[0] * phi), m[1]);
        r += Math.pow(Math.cos(m[2] * phi), m[3]);
        r += Math.pow(Math.sin(m[4] * theta), m[5]);
        r += Math.pow(Math.cos(m[6] * theta), m[7]);
        return [r * Math.sin(theta) * Math.cos(phi), r * Math.cos(theta), r * Math.sin(theta) * Math.sin(phi)];
      },
      120, 90, [0, TAU], [0, Math.PI], true, false
    );
  },

  // Three-armed logarithmic spiral galaxy with a soft bulge.
  spiralGalaxy: () => {
    const rng = mulberry32(1337);
    const gauss = makeGaussian(rng);
    const pts = [];
    const arms = 3;
    for (let i = 0; i < N; i++) {
      const arm = i % arms;
      const frac = i / N;
      const r = frac * 6;
      let angle = (arm * TAU) / arms + r * 0.85 + gauss() * 0.14 * (1 - 0.5 * frac);
      const y = gauss() * 0.5 * Math.exp(-r * 0.28);
      pts.push([r * Math.cos(angle), y, r * Math.sin(angle)]);
    }
    return pts;
  },

  // Lorenz attractor — the butterfly, traced as a dense point cloud.
  lorenzAttractor: () => {
    const pts = [];
    const sigma = 10, rho = 28, beta = 8 / 3, dt = 0.006;
    let x = 0.1, y = 0, z = 0;
    for (let i = 0; i < 2000; i++) {
      // burn in past the transient
      const dx = sigma * (y - x), dy = x * (rho - z) - y, dz = x * y - beta * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
    }
    for (let i = 0; i < N; i++) {
      const dx = sigma * (y - x), dy = x * (rho - z) - y, dz = x * y - beta * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
      // map so the wings face the camera: attractor's z (height) → world y
      pts.push([x, z - 25, y]);
    }
    return pts;
  },

  // One-sheet hyperboloid — a waist that flares at both ends.
  hyperboloid: () =>
    surface(
      (v, u) => [Math.cosh(u) * Math.cos(v), Math.sinh(u) * 2.2, Math.cosh(u) * Math.sin(v)],
      120, 90, [0, TAU], [-1.5, 1.5], true, false
    ),

  // Interference sheet (kept from the old set — people liked the ripples).
  waveReflection: () =>
    surface(
      (x, z) => [x, Math.sin(x * 0.9) * Math.cos(z * 0.9) * 1.7, z],
      120, 90, [-6, 6], [-6, 6], false, false
    ),

  ripple: () =>
    surface(
      (x, z) => {
        const d = Math.hypot(x, z);
        return [x, Math.sin(d * 1.5) * 1.8 * Math.exp(-d * 0.09), z];
      },
      120, 90, [-6, 6], [-6, 6], false, false
    ),

  doubleCone: () =>
    surface(
      (u, t) => {
        const r = Math.abs(t) * 3;
        return [r * Math.cos(u), t * 3, r * Math.sin(u)];
      },
      120, 90, [0, TAU], [-1, 1], true, false
    ),
};

// Recenter to centroid, then scale so the 95th-percentile radius = TARGET_RADIUS.
function normalize(pts) {
  let cx = 0, cy = 0, cz = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
  cx /= pts.length; cy /= pts.length; cz /= pts.length;
  const centered = pts.map((p) => [p[0] - cx, p[1] - cy, p[2] - cz]);
  const radii = centered.map((p) => Math.hypot(p[0], p[1], p[2])).sort((a, b) => a - b);
  const p95 = radii[Math.floor(radii.length * 0.95)] || 1;
  const s = TARGET_RADIUS / p95;
  return centered.map((p) => [
    +(p[0] * s).toFixed(3),
    +(p[1] * s).toFixed(3),
    +(p[2] * s).toFixed(3),
  ]);
}

console.log('Generating parametric shape positions...');
const shapesData = {};
for (const name of Object.keys(SHAPES)) {
  const pts = SHAPES[name]();
  if (pts.length !== N) {
    throw new Error(`Shape "${name}" produced ${pts.length} points, expected ${N}`);
  }
  shapesData[name] = normalize(pts);
}

const names = Object.keys(shapesData);
console.log(`Generated ${names.length} shapes with ${N} points each`);
console.log(`Cycle order: ${names.join(' -> ')}`);

const outputPath = path.join(__dirname, '..', 'components', 'shapePositions.json');
fs.writeFileSync(outputPath, JSON.stringify(shapesData));
const stats = fs.statSync(outputPath);
console.log(`Saved to ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
