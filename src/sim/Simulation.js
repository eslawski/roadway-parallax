export const MAX_SPEED = 55; // m/s (~123 mph)
export const DEFAULT_SPEED = 25; // m/s (~56 mph)

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
