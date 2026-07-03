// Deterministic noise / RNG utilities shared by terrain, scenery scatter,
// and (re-implemented in GLSL) the road shader. Everything is a pure function
// of position so recycled segments rebuild identically for a given route index.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export function fbm2(x, y) {
  return (
    valueNoise2(x, y) * 0.6 +
    valueNoise2(x * 2.13 + 5.2, y * 2.13 + 1.3) * 0.28 +
    valueNoise2(x * 4.7 + 9.1, y * 4.7 + 3.7) * 0.12
  );
}

function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

// The flat corridor the road lives in. Kept profile-independent so terrain is
// continuous across road-type transitions.
export const CORRIDOR_L = -36;
export const CORRIDOR_R = 14;

// Rolling terrain height as a function of road-space x and route distance r.
export function terrainHeight(x, r) {
  let d = 0;
  if (x < CORRIDOR_L) d = CORRIDOR_L - x;
  else if (x > CORRIDOR_R) d = x - CORRIDOR_R;
  const mask = smoothstep(0, 26, d);
  const rolling = (fbm2(x * 0.015, r * 0.006) - 0.35) * 9;
  const detail = (fbm2(x * 0.08 + 13.7, r * 0.03) - 0.5) * 1.1;
  return (rolling + detail) * mask;
}
