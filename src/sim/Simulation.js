// The simulation and world geometry run in meters/seconds (three.js units);
// the public surface (RoadwayAPI, postMessage, keyboard, UI) speaks mph.
// Convert at that boundary only.
export const MPS_PER_MPH = 0.44704;
export const MPH_PER_MPS = 1 / MPS_PER_MPH;

export const MAX_SPEED = 120 * MPS_PER_MPH; // m/s (120 mph)
export const DEFAULT_SPEED = 55 * MPS_PER_MPH; // m/s (55 mph)

const MAX_ACCEL = 3.5; // m/s^2
const MAX_DECEL = 5.0;

// Drives speed with eased acceleration and exposes pause state. The render
// loop keeps running while paused; only the scroll distance freezes.
export class Simulation {
  constructor() {
    this.speed = 0;
    this.targetSpeed = DEFAULT_SPEED;
    this.paused = false;
  }

  setTargetSpeed(mps) {
    this.targetSpeed = Math.min(MAX_SPEED, Math.max(0, mps));
  }

  // Returns the distance traveled this frame.
  step(dt) {
    if (this.paused) return 0;
    const diff = this.targetSpeed - this.speed;
    const dv = Math.max(-MAX_DECEL * dt, Math.min(MAX_ACCEL * dt, diff));
    this.speed += dv;
    if (Math.abs(this.targetSpeed - this.speed) < 0.01) this.speed = this.targetSpeed;
    return this.speed * dt;
  }
}
