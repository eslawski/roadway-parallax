import * as THREE from 'three';
import { SEGMENT_LENGTH as L, SEGMENT_COUNT, BACK_MARGIN, TRANSITION_DISTANCE } from './constants.js';
import { Segment } from './Segment.js';
import { PROFILES } from './profiles.js';
import { createAssets } from '../scenery/assets.js';

// Owns the treadmill of road segments and the list of profile "spans" along
// the route. A road-type change appends a span whose start is snapped to a
// segment boundary at least TRANSITION_DISTANCE ahead; only segments beyond
// that point rebuild, so the change materializes in the fog and scrolls in.
export class SegmentManager {
  constructor(scene, initialType = 'highway') {
    this.S = 2 * L; // route distance traveled; start with two segments behind us
    this.spans = [{ start: -Infinity, type: initialType }];
    this.listeners = { transitionstart: [], transitioncomplete: [] };

    const assets = createAssets();
    this.terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });

    this.segments = [];
    for (let k = 0; k < SEGMENT_COUNT; k++) {
      const seg = new Segment(assets, this.terrainMaterial);
      seg.rebuild(k, (r) => this.profileAt(r));
      seg.setScroll(this.S);
      scene.add(seg.group);
      this.segments.push(seg);
    }
    this.nextK = SEGMENT_COUNT;
  }

  on(event, cb) {
    this.listeners[event].push(cb);
  }

  emit(event, payload) {
    for (const cb of this.listeners[event]) cb(payload);
  }

  profileAt(r) {
    let type = this.spans[0].type;
    for (const span of this.spans) {
      if (span.start <= r) type = span.type;
      else break;
    }
    return PROFILES[type];
  }

  get currentType() {
    return this.profileAt(this.S).name;
  }

  get targetType() {
    return this.spans[this.spans.length - 1].type;
  }

  get transitioning() {
    return this.spans.some((s) => s.start > this.S);
  }

  setRoadType(type) {
    const boundary = Math.ceil((this.S + TRANSITION_DISTANCE) / L) * L;
    return this.setSpan(type, boundary);
  }

  // Scripted variant: land the change as close as possible to an absolute
  // route distance. Snapped to the segment grid (the blend is baked
  // per-segment), and never closer than TRANSITION_DISTANCE ahead so it still
  // materializes in the fog.
  setRoadTypeAt(type, absDistance) {
    const minBoundary = Math.ceil((this.S + TRANSITION_DISTANCE) / L) * L;
    const boundary = Math.max(Math.round(absDistance / L) * L, minBoundary);
    return this.setSpan(type, boundary);
  }

  setSpan(type, boundary) {
    if (!PROFILES[type]) throw new Error(`Unknown road type: ${type}`);
    if (this.targetType === type) return false;

    this.spans = this.spans.filter((s) => s.start < boundary);
    this.spans.push({ start: boundary, type });

    // Rebuild the blend segment (ends exactly at the boundary) and everything
    // beyond it. All of it sits deep in the fog.
    for (const seg of this.segments) {
      if (seg.routeEnd() >= boundary) seg.rebuild(seg.k, (r) => this.profileAt(r));
    }
    this.emit('transitionstart', { from: this.currentType, to: type, distance: boundary - this.S });
    return true;
  }

  // Instantly snap the whole world to one road type (no transition, no
  // events). Meant to run while an overlay masks the rebuild pop, e.g. when a
  // scripted route starts on a different type than the welcome default.
  resetType(type) {
    if (!PROFILES[type]) throw new Error(`Unknown road type: ${type}`);
    if (this.spans.length === 1 && this.spans[0].type === type) return;
    this.spans = [{ start: -Infinity, type }];
    for (const seg of this.segments) seg.rebuild(seg.k, (r) => this.profileAt(r));
  }

  update(distance) {
    const before = this.S;
    this.S += distance;

    // fire transition completions when the driver crosses a span boundary
    for (const span of this.spans) {
      if (span.start > before && span.start <= this.S) {
        this.emit('transitioncomplete', { type: span.type });
      }
    }
    // drop spans that are fully behind us (keep the active one as base)
    while (this.spans.length > 1 && this.spans[1].start <= this.S) {
      this.spans.shift();
    }

    // recycle segments that have fallen behind the camera
    for (const seg of this.segments) {
      while (seg.routeEnd() < this.S - BACK_MARGIN) {
        seg.rebuild(this.nextK++, (r) => this.profileAt(r));
      }
    }
    for (const seg of this.segments) seg.setScroll(this.S);
  }
}
