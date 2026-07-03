import { mulberry32, terrainHeight } from '../utils/noise.js';
import { SEGMENT_LENGTH as L } from '../road/constants.js';

// Fills a segment's instance pools with scenery appropriate to a road
// profile. Deterministic per absolute segment index so a segment rebuilds
// identically. Positions are segment-local: x in road space, z relative to
// the segment center (route r maps to z = r0 + L/2 - r).

function groundY(x, r) {
  return terrainHeight(x, r) - 0.15;
}

function treeTint(rng) {
  const v = 0.75 + rng() * 0.45;
  return [v * (0.9 + rng() * 0.2), v, v * (0.85 + rng() * 0.2)];
}

function placeTree(pools, rng, x, r, zOf) {
  const pool = rng() < 0.45 ? pools.conifer : pools.deciduous;
  const s = 0.65 + rng() * 0.75;
  pool.add(x, groundY(x, r) - 0.25, zOf(r), rng() * Math.PI * 2, s, s * (0.85 + rng() * 0.3), s, treeTint(rng));
}

function scatterMega(pools, rng, r0, zOf) {
  // continuous median jersey barrier
  pools.barrier.add(-13.6, 0, zOf(r0 + L / 2), 0, 1, 1, L + 0.4);

  // median light poles, arm reaching over the main carriageway (+x)
  for (const dr of [10, 43]) {
    pools.lightPole.add(-14.7, 0, zOf(r0 + dr), 0, 1, 1, 1, [0.9, 0.9, 0.92]);
  }
  // right-side pole at offset phase, arm reaching left (-x)
  pools.lightPole.add(10.2, 0, zOf(r0 + 27), Math.PI, 1, 1, 1, [0.9, 0.9, 0.92]);

  // right shoulder guardrail
  for (let dr = 2; dr < L; dr += 4) {
    pools.guardrailPost.add(9.4, 0, zOf(r0 + dr), 0);
  }
  pools.guardrailRail.add(9.4, 0, zOf(r0 + L / 2), 0, 1, 1, L + 0.2);

  // occasional noise wall on the right
  if (rng() < 0.38) {
    const wx = 17 + rng() * 5;
    pools.noiseWall.add(wx, groundY(wx, r0 + L / 2), zOf(r0 + L / 2), 0, 1, 4.2 + rng() * 1.4, L * 0.85);
  }

  // boxy buildings in the middle distance on both sides
  const n = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const side = rng() < 0.6 ? 1 : -1;
    const x = side > 0 ? 42 + rng() * 100 : -(48 + rng() * 100);
    const r = r0 + rng() * L;
    const h = 7 + rng() * rng() * 26;
    const w = 10 + rng() * 22;
    const d = 10 + rng() * 22;
    const g = 0.55 + rng() * 0.4;
    pools.building.add(x, groundY(x, r) - 0.6, zOf(r), rng() * 0.3 - 0.15, w, h, d, [g, g * (0.95 + rng() * 0.1), g]);
  }

  // sparse trees between the buildings
  for (let i = 0; i < 6; i++) {
    if (rng() < 0.5) continue;
    const side = rng() < 0.5 ? 1 : -1;
    const x = side * (34 + rng() * 90);
    placeTree(pools, rng, x, r0 + rng() * L, zOf);
  }

  for (const dr of [8, 33]) pools.delineator.add(8.95, 0, zOf(r0 + dr), 0);
}

function scatterHighway(pools, rng, r0, zOf) {
  for (const dr of [5, 30]) pools.delineator.add(4.75, 0, zOf(r0 + dr), 0);

  // fence line along the right-of-way
  if (rng() < 0.85) {
    for (let dr = 1 + rng() * 2; dr < L; dr += 4.2) {
      const x = 13.5 + Math.sin((r0 + dr) * 0.01) * 1.5;
      pools.fencePost.add(x, groundY(x, r0 + dr), zOf(r0 + dr), 0);
    }
  }

  // utility poles
  pools.utilityPole.add(11.8, groundY(11.8, r0 + 20), zOf(r0 + rng() * L), 0, 1, 1, 1, null);

  // tree clusters in the fields
  const clusters = Math.floor(rng() * 3);
  for (let c = 0; c < clusters; c++) {
    const side = rng() < 0.6 ? 1 : -1;
    const cx = side > 0 ? 24 + rng() * 70 : -(32 + rng() * 60);
    const cr = r0 + rng() * L;
    const count = 3 + Math.floor(rng() * 5);
    for (let i = 0; i < count; i++) {
      placeTree(pools, rng, cx + (rng() - 0.5) * 22, cr + (rng() - 0.5) * 26, zOf);
    }
  }

  // occasional farm building
  if (rng() < 0.16) {
    const side = rng() < 0.7 ? 1 : -1;
    const x = side * (40 + rng() * 55);
    const r = r0 + rng() * L;
    pools.barn.add(x, groundY(x, r) - 0.4, zOf(r), rng() * Math.PI, 0.8 + rng() * 0.5, 0.8 + rng() * 0.4, 0.8 + rng() * 0.5);
  }

  // median bushes now and then
  if (rng() < 0.4) {
    for (let i = 0; i < 3; i++) {
      const x = -12.5 + (rng() - 0.5) * 4;
      pools.bush.add(x, 0, zOf(r0 + rng() * L), rng() * 3, 0.6 + rng() * 0.6, 0.55 + rng() * 0.45, 0.6 + rng() * 0.6, treeTint(rng));
    }
  }
}

function scatterBackroad(pools, rng, r0, zOf) {
  // dense treeline close to the road on both sides
  const n = 24 + Math.floor(rng() * 12);
  for (let i = 0; i < n; i++) {
    const side = rng() < 0.52 ? 1 : -1;
    // density skewed toward the road edge
    const dist = 4.5 + Math.pow(rng(), 1.6) * 55;
    const x = side > 0 ? 3.6 + dist * 0.9 : -6.2 - dist * 0.9;
    placeTree(pools, rng, x, r0 + rng() * L, zOf);
  }

  // undergrowth right at the edge
  const nb = 8 + Math.floor(rng() * 8);
  for (let i = 0; i < nb; i++) {
    const side = rng() < 0.5 ? 1 : -1;
    const x = side > 0 ? 3.2 + rng() * 3 : -6 - rng() * 3;
    const r = r0 + rng() * L;
    pools.bush.add(x, groundY(x, r) + 0.1, zOf(r), rng() * 3, 0.45 + rng() * 0.55, 0.5 + rng() * 0.5, 0.45 + rng() * 0.55, treeTint(rng));
  }

  // utility poles along the right
  if (rng() < 0.85) {
    pools.utilityPole.add(4.4, 0, zOf(r0 + 8 + rng() * 34), 0);
  }

  if (rng() < 0.22) {
    pools.mailbox.add(3.1, 0, zOf(r0 + rng() * L), Math.PI / 2);
  }
}

const SCATTERERS = {
  mega: scatterMega,
  highway: scatterHighway,
  backroad: scatterBackroad,
};

export function scatterSegment(pools, profileName, segmentIndex, r0) {
  const rng = mulberry32((segmentIndex * 2654435761) ^ 0x9e3779b9);
  const zOf = (r) => r0 + L / 2 - r;
  for (const pool of Object.values(pools)) pool.begin();
  SCATTERERS[profileName](pools, rng, r0, zOf);
  for (const pool of Object.values(pools)) pool.end();
}
