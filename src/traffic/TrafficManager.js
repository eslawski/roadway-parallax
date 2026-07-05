import { buildVehicle, pickBodyColor, pickTrailerColor } from './vehicles.js';

// AI traffic. Vehicles live in route space like Bigfoot (r = route distance,
// x = road-space lateral) and are placed each frame at z = S - r, so they
// scroll with the world plus their own ground speed. Two streams per road
// type: oncoming (all types) and same-direction (only where a second
// same-direction lane exists). The player's lane, x = 0, never appears in
// any lane list below.

const MPH = 0.44704; // m/s per mph

// Lane centers per profile (see src/road/profiles.js). Oncoming centers are
// derived from the opposing carriageway's painted edge lines — that roadway
// is drawn compressed for parallax, so these are not multiples of laneWidth.
const TRAFFIC_LANES = {
  backroad: { same: [], oncoming: [-3.2] },
  highway: { same: [-3.7], oncoming: [-20.4, -23.4] },
  mega: { same: [-7.4, -3.7, 3.7], oncoming: [-17.05, -20.8, -24.5] },
};

const SPAWN_AHEAD = 660; // just past the fog far plane (640) — fades in
const SPAWN_BEHIND = 60; // z = +60, behind the camera, for overtaking traffic
const DESPAWN_BEHIND = 80; // z beyond which a vehicle is released
const DESPAWN_AHEAD = 700; // r - S beyond which a vehicle is released

const SPEED_MIN = 20 * MPH; // traffic keeps flowing even if the player stops
const SPEED_MAX = 85 * MPH;
const SPEED_JITTER = 10 * MPH; // ± around the player's speed at spawn time
const DEAD_ZONE = 2 * MPH; // same-direction traffic never hovers alongside
const SEMI_BIAS = -4 * MPH;

const MIN_SPAWN_GAP = 60; // m of clear lane required around a spawn point
const MAX_VEHICLES = 30;
const POOL = { car: 15, pickup: 9, semi: 6 };

const FOLLOW_MARGIN = 14; // m; follow threshold is this + 1s of headway
const RECOVER_ACCEL = 1.5; // m/s^2 easing back to cruise speed

// Randomized headway per stream, seconds. null = stream doesn't exist there.
const SPAWN_INTERVALS = {
  backroad: { oncoming: [3, 9], same: null },
  highway: { oncoming: [2, 5.5], same: [3, 8] },
  mega: { oncoming: [1.2, 4], same: [2, 5.5] },
};

const TYPE_WEIGHTS = {
  backroad: { car: 0.6, pickup: 0.34, semi: 0.06 },
  highway: { car: 0.62, pickup: 0.23, semi: 0.15 },
  mega: { car: 0.62, pickup: 0.2, semi: 0.18 },
};

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function pickWeighted(weights) {
  let roll = Math.random();
  let last;
  for (const [key, w] of Object.entries(weights)) {
    roll -= w;
    last = key;
    if (roll <= 0) return key;
  }
  return last;
}

export class TrafficManager {
  constructor(scene, segments, sim) {
    this.segments = segments;
    this.sim = sim;
    this.active = [];
    this.free = { car: [], pickup: [], semi: [] };
    for (const [type, count] of Object.entries(POOL)) {
      for (let i = 0; i < count; i++) {
        const v = buildVehicle(type);
        v.root.visible = false;
        scene.add(v.root);
        this.free[type].push(v);
      }
    }
    this.timers = { oncoming: rand(0.5, 2), same: rand(0.5, 2) };

    // Everything beyond the new-profile boundary sits deep in the fog; cull
    // it before the new road type materializes under it.
    segments.on('transitionstart', ({ distance }) => {
      const boundary = segments.S + distance;
      for (let i = this.active.length - 1; i >= 0; i--) {
        if (this.active[i].r > boundary) this.release(i);
      }
    });
  }

  release(i) {
    const v = this.active[i];
    v.root.visible = false;
    this.free[v.type].push(v);
    this.active.splice(i, 1);
  }

  laneIsClear(lane, dir, spawnR) {
    for (const o of this.active) {
      if (o.x === lane && o.dir === dir && Math.abs(o.r - spawnR) < MIN_SPAWN_GAP + o.length) {
        return false;
      }
    }
    return true;
  }

  spawn(stream) {
    const { segments, sim } = this;
    const lanes = TRAFFIC_LANES[segments.currentType][stream];
    if (!lanes.length) return;
    const type = pickWeighted(TYPE_WEIGHTS[segments.currentType]);
    if (!this.free[type].length) return;
    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    // Cruise speed is set relative to the player once, at spawn — real
    // traffic doesn't mirror your speed changes afterwards.
    const base = clamp(sim.speed, SPEED_MIN, SPEED_MAX);
    let spd = clamp(
      base + rand(-1, 1) * SPEED_JITTER + (type === 'semi' ? SEMI_BIAS : 0),
      SPEED_MIN,
      SPEED_MAX
    );

    let dir, spawnR;
    if (stream === 'same') {
      if (Math.abs(spd - sim.speed) < DEAD_ZONE) {
        spd = clamp(sim.speed + rand(2, 10) * MPH, SPEED_MIN, SPEED_MAX);
        if (Math.abs(spd - sim.speed) < DEAD_ZONE) {
          spd = clamp(sim.speed - rand(2, 10) * MPH, SPEED_MIN, SPEED_MAX);
        }
      }
      dir = 1;
      // faster traffic overtakes from behind; slower traffic gets passed
      spawnR = spd > sim.speed ? segments.S - SPAWN_BEHIND : segments.S + SPAWN_AHEAD;
    } else {
      dir = -1;
      spawnR = segments.S + SPAWN_AHEAD;
    }
    if (!this.laneIsClear(lane, dir, spawnR)) return;

    const v = this.free[type].pop();
    v.bodyMat.color.setHex(pickBodyColor());
    if (v.trailerMat) v.trailerMat.color.setHex(pickTrailerColor());
    v.x = lane;
    v.r = spawnR;
    v.dir = dir;
    v.speed = v.curSpeed = spd;
    v.root.rotation.y = dir === -1 ? Math.PI : 0;
    v.root.position.set(v.x, 0, segments.S - v.r);
    v.root.visible = true;
    this.active.push(v);
  }

  // Prevent pass-through rear-ends: within each (direction, lane) group a
  // follower inside ~1s of headway clamps to its leader's speed, easing back
  // to its own cruise speed once the gap reopens.
  applyFollowRule(dt) {
    const groups = new Map();
    for (const v of this.active) {
      const key = v.dir + '|' + v.x;
      let arr = groups.get(key);
      if (!arr) groups.set(key, (arr = []));
      arr.push(v);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const dir = group[0].dir;
      group.sort((a, b) => (b.r - a.r) * dir); // leader first
      for (let i = 1; i < group.length; i++) {
        const leader = group[i - 1];
        const f = group[i];
        const gap = (leader.r - f.r) * dir - (leader.length + f.length) / 2;
        if (gap < FOLLOW_MARGIN + f.curSpeed) {
          f.curSpeed = Math.min(f.curSpeed, leader.curSpeed);
        } else if (f.curSpeed < f.speed) {
          f.curSpeed = Math.min(f.speed, f.curSpeed + RECOVER_ACCEL * dt);
        }
      }
    }
  }

  update(dt) {
    const { segments, sim } = this;
    if (sim.paused) return; // freeze with the world (unlike Bigfoot)
    const S = segments.S;

    this.applyFollowRule(dt);

    for (let i = this.active.length - 1; i >= 0; i--) {
      const v = this.active[i];
      v.r += v.dir * v.curSpeed * dt;
      const z = S - v.r;
      if (z > DESPAWN_BEHIND || v.r - S > DESPAWN_AHEAD) {
        this.release(i);
        continue;
      }
      // During a road-type change, drop any vehicle that drives onto a span
      // where its lane doesn't exist (it's at least TRANSITION_DISTANCE out,
      // heavily fogged).
      if (segments.transitioning) {
        const profile = segments.profileAt(v.r).name;
        const valid = TRAFFIC_LANES[profile][v.dir === 1 ? 'same' : 'oncoming'];
        if (!valid.includes(v.x)) {
          this.release(i);
          continue;
        }
      }
      v.root.position.set(v.x, 0, z);
    }

    for (const stream of ['oncoming', 'same']) {
      this.timers[stream] -= dt;
      if (this.timers[stream] > 0) continue;
      const interval = SPAWN_INTERVALS[segments.currentType][stream];
      this.timers[stream] = interval ? rand(interval[0], interval[1]) : 2;
      if (interval && !segments.transitioning && this.active.length < MAX_VEHICLES) {
        this.spawn(stream);
      }
    }
  }
}
