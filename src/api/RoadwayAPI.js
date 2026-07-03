import { MAX_SPEED } from '../sim/Simulation.js';
import { ROAD_TYPES } from '../road/profiles.js';

// Public control surface for the host cockpit. Exposed as window.roadway and
// mirrored over postMessage (see PostMessageBridge).
export class RoadwayAPI {
  constructor(sim, segmentManager) {
    this.sim = sim;
    this.segments = segmentManager;
    this.listeners = {};

    segmentManager.on('transitionstart', (e) => this.emit('transitionstart', e));
    segmentManager.on('transitioncomplete', (e) => {
      this.emit('transitioncomplete', e);
      this.emit('statechange', this.getState());
    });
  }

  on(event, cb) {
    (this.listeners[event] ??= []).push(cb);
    return this;
  }

  off(event, cb) {
    this.listeners[event] = (this.listeners[event] ?? []).filter((f) => f !== cb);
    return this;
  }

  emit(event, payload) {
    for (const cb of this.listeners[event] ?? []) cb(payload);
  }

  setSpeed(mps) {
    this.sim.setTargetSpeed(Number(mps));
    this.emit('statechange', this.getState());
  }

  getSpeed() {
    return this.sim.speed;
  }

  get maxSpeed() {
    return MAX_SPEED;
  }

  pause() {
    if (this.sim.paused) return;
    this.sim.paused = true;
    this.emit('pause');
    this.emit('statechange', this.getState());
  }

  resume() {
    if (!this.sim.paused) return;
    this.sim.paused = false;
    this.emit('resume');
    this.emit('statechange', this.getState());
  }

  toggle() {
    this.sim.paused ? this.resume() : this.pause();
  }

  setRoadType(type) {
    if (this.segments.setRoadType(type)) {
      this.emit('statechange', this.getState());
    }
  }

  getRoadType() {
    return this.segments.currentType;
  }

  get roadTypes() {
    return [...ROAD_TYPES];
  }

  getState() {
    return {
      speed: this.sim.speed,
      targetSpeed: this.sim.targetSpeed,
      paused: this.sim.paused,
      roadType: this.segments.currentType,
      targetRoadType: this.segments.targetType,
      transitioning: this.segments.transitioning,
    };
  }
}
