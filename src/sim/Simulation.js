// The simulation and world geometry run in meters/seconds (three.js units);
// the public surface (RoadwayAPI, postMessage, keyboard, UI) speaks mph.
// Convert at that boundary only.
export const MPS_PER_MPH = 0.44704;
export const MPH_PER_MPS = 1 / MPS_PER_MPH;

export const MAX_SPEED = 120 * MPS_PER_MPH; // m/s (120 mph)
export const DEFAULT_SPEED = 55 * MPS_PER_MPH; // m/s (55 mph)

const MAX_ACCEL = 3.5; // m/s^2
const MAX_DECEL = 5.0;

// Pull-over maneuver tuning. Brake toward a stop; the lateral drift onto the
// shoulder runs across a speed band so it is gradual and, crucially, completes
// while the car is still rolling — the final crawl to a stop is straight-line.
const MERGE_START_SPEED = 40 * MPS_PER_MPH; // begin drifting to the shoulder once down to ~40 mph
const MERGE_END_SPEED = 10 * MPS_PER_MPH; // fully on the shoulder by ~10 mph, still moving

// Drives speed with eased acceleration and exposes pause state. The render
// loop keeps running while paused; only the scroll distance freezes.
export class Simulation {
  constructor() {
    this.speed = 0;
    this.targetSpeed = DEFAULT_SPEED;
    this.paused = false;

    // One-way "pull over to the shoulder and park" maneuver. Once engaged it
    // is never cleared (only a page refresh resets the sim). It brakes to a
    // stop; the lateral drift runs during the 'merging' phase, tied to speed so
    // it lands on the shoulder exactly as the car stops. `parked` latches then.
    this.pullingOver = false;
    this.parked = false;
    this.pullPhase = null;
    this.lateralOffset = 0; // current camera-x shoulder offset, meters
    this.shoulderTarget = 0;
    this.mergeStartSpeed = 0; // speed at which the lateral drift began
  }

  setTargetSpeed(mps) {
    if (this.pullingOver) return; // speed is locked out for the terminal maneuver
    this.targetSpeed = Math.min(MAX_SPEED, Math.max(0, mps));
  }

  // Begins the irreversible pull-over. Idempotent: a second call is a no-op.
  // Brakes toward a full stop; the lateral drift kicks in once slowed enough.
  startPullOver(shoulderX) {
    if (this.pullingOver) return false;
    this.pullingOver = true;
    this.shoulderTarget = shoulderX;
    this.pullPhase = 'slowing';
    this.targetSpeed = 0;
    return true;
  }

  // Returns the distance traveled this frame.
  step(dt) {
    if (this.paused) return 0;
    const diff = this.targetSpeed - this.speed;
    const dv = Math.max(-MAX_DECEL * dt, Math.min(MAX_ACCEL * dt, diff));
    this.speed += dv;
    if (Math.abs(this.targetSpeed - this.speed) < 0.01) this.speed = this.targetSpeed;

    if (this.pullingOver && !this.parked) {
      // Hold the lane while braking; once down to the merge-start speed, drift
      // onto the shoulder across the speed band [MERGE_END_SPEED, start] so the
      // move completes while still rolling — never sliding sideways near a stop.
      if (this.pullPhase === 'slowing' && this.speed <= MERGE_START_SPEED) {
        this.pullPhase = 'merging';
        this.mergeStartSpeed = this.speed;
      }
      if (this.pullPhase === 'merging') {
        const span = this.mergeStartSpeed - MERGE_END_SPEED;
        const frac =
          span > 0
            ? Math.min(1, Math.max(0, (this.mergeStartSpeed - this.speed) / span))
            : this.mergeStartSpeed > 0
              ? Math.min(1, 1 - this.speed / this.mergeStartSpeed) // engaged already below the band
              : 1;
        this.lateralOffset = this.shoulderTarget * frac;
      }
      if (this.speed === 0) {
        this.lateralOffset = this.shoulderTarget;
        this.parked = true;
      }
    }

    return this.speed * dt;
  }
}
