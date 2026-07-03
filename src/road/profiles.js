// Road profile definitions. All x coordinates are in "road space" where
// x = 0 is the center of the camera's driving lane, +x is to the driver's
// right, and forward is -z (world) / increasing route distance r.

export const LINE = {
  DASHED_WHITE: 0,
  SOLID_WHITE: 1,
  SOLID_YELLOW: 2,
  DOUBLE_YELLOW: 3,
};

export const MAX_LINES = 8;

export const PROFILES = {
  // 4 lanes one direction; camera in second lane from the right.
  // Median concrete barrier on the left, opposing carriageway beyond it.
  mega: {
    name: 'mega',
    laneWidth: 3.7,
    // [mainLeft, mainRight, opposingLeft, opposingRight] paved extents
    paved: [-12.25, 8.55, -27.0, -14.6],
    lines: [
      { x: -9.25, type: LINE.SOLID_YELLOW },
      { x: -5.55, type: LINE.DASHED_WHITE },
      { x: -1.85, type: LINE.DASHED_WHITE },
      { x: 1.85, type: LINE.DASHED_WHITE },
      { x: 5.55, type: LINE.SOLID_WHITE },
      { x: -15.2, type: LINE.SOLID_YELLOW },
      { x: -26.4, type: LINE.SOLID_WHITE },
    ],
    // wheel-track wear: [leftEdgeOfLanes, laneWidth, laneCount]
    wear: [-9.25, 3.7, 4],
    roughness: 0.55,
  },

  // 2 lanes one direction, divided highway; grass median with the opposing
  // carriageway visible across it.
  highway: {
    name: 'highway',
    laneWidth: 3.7,
    paved: [-6.75, 4.35, -25.5, -18.3],
    lines: [
      { x: -5.55, type: LINE.SOLID_YELLOW },
      { x: -1.85, type: LINE.DASHED_WHITE },
      { x: 1.85, type: LINE.SOLID_WHITE },
      { x: -18.9, type: LINE.SOLID_YELLOW },
      { x: -24.9, type: LINE.SOLID_WHITE },
    ],
    wear: [-5.55, 3.7, 2],
    roughness: 0.85,
  },

  // Rural back road: one lane each way, double yellow center line.
  backroad: {
    name: 'backroad',
    laneWidth: 3.2,
    paved: [-5.4, 2.2, 0, 0],
    lines: [
      { x: -1.6, type: LINE.DOUBLE_YELLOW },
      { x: 1.6, type: LINE.SOLID_WHITE },
      { x: -4.8, type: LINE.SOLID_WHITE },
    ],
    wear: [-4.8, 3.2, 2],
    roughness: 1.7,
  },
};

export const ROAD_TYPES = Object.keys(PROFILES);

// Build the fixed-size line slot list (Vector4-compatible arrays) for a
// profile: [x, type, alpha, unused]. Sorted by x so transition pairing between
// two profiles lerps neighbors into each other smoothly.
export function buildLineSlots(profile) {
  const sorted = [...profile.lines].sort((a, b) => a.x - b.x);
  const slots = [];
  for (let i = 0; i < MAX_LINES; i++) {
    if (i < sorted.length) slots.push([sorted[i].x, sorted[i].type, 1, 0]);
    else slots.push([0, 0, 0, 0]);
  }
  return slots;
}

// Pair the line slots of two profiles for a transition segment. Matched
// slots slide between positions; unmatched ones fade in place.
export function matchLineSlots(slotsA, slotsB) {
  const a = slotsA.map((s) => [...s]);
  const b = slotsB.map((s) => [...s]);
  for (let i = 0; i < MAX_LINES; i++) {
    const hasA = a[i][2] > 0;
    const hasB = b[i][2] > 0;
    if (hasA && !hasB) {
      b[i][0] = a[i][0];
      b[i][1] = a[i][1];
    } else if (!hasA && hasB) {
      a[i][0] = b[i][0];
      a[i][1] = b[i][1];
    }
  }
  return [a, b];
}
