import { MAX_SPEED, MPS_PER_MPH, MPH_PER_MPS } from '../sim/Simulation.js';
import { ROAD_TYPES, PROFILES } from '../road/profiles.js';

// How far inside the right paved edge the parked eye point rests, meters.
const SHOULDER_INSET = 0.6;

// Public control surface for the host cockpit. Exposed as window.roadway and
// mirrored over postMessage (see PostMessageBridge). All speeds here are in
// mph; the simulation itself runs in m/s.
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

  setSpeed(mph) {
    this.sim.setTargetSpeed(Number(mph) * MPS_PER_MPH);
    this.emit('statechange', this.getState());
  }

  getSpeed() {
    return this.sim.speed * MPH_PER_MPS;
  }

  get maxSpeed() {
    return MAX_SPEED * MPH_PER_MPS;
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

  // Irreversible: ease onto the right shoulder and park. Speed and road-type
  // controls are locked out afterward; only a page refresh returns to driving.
  pullOver() {
    const shoulderX = PROFILES[this.segments.currentType].paved[1] - SHOULDER_INSET;
    if (this.sim.startPullOver(shoulderX)) {
      this.emit('pullover');
      this.emit('statechange', this.getState());
    }
  }

  setRoadType(type) {
    if (this.sim.pullingOver) return; // road type is locked once parking
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
      speed: this.sim.speed * MPH_PER_MPS,
      targetSpeed: this.sim.targetSpeed * MPH_PER_MPS,
      paused: this.sim.paused,
      pullingOver: this.sim.pullingOver,
      pullPhase: this.sim.pullPhase,
      parked: this.sim.parked,
      roadType: this.segments.currentType,
      targetRoadType: this.segments.targetType,
      transitioning: this.segments.transitioning,
    };
  }
}
