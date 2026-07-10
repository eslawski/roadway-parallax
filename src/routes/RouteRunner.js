import { SEGMENT_LENGTH, TRANSITION_DISTANCE } from '../road/constants.js';
import { PROFILES } from '../road/profiles.js';

export const METERS_PER_MILE = 1609.344;

// Roadway changes must be commanded early enough that the snapped span
// boundary (see SegmentManager.setRoadTypeAt) is still a full transition
// distance ahead when it is placed.
const SCHEDULE_LEAD = TRANSITION_DISTANCE + 2 * SEGMENT_LENGTH;

// Minimum spacing between roadway changes (and before the first one): the
// schedule lead plus one segment of slack for grid snapping.
const MIN_PROFILE_SPACING = SCHEDULE_LEAD + SEGMENT_LENGTH;
export const MIN_PROFILE_SPACING_MILES = MIN_PROFILE_SPACING / METERS_PER_MILE;

// Throws with the route id and reason; called for every route at startup so a
// broken definition fails loudly on load, not mid-demo.
export function validateRoute(route) {
  const fail = (reason) => {
    throw new Error(`Route '${route.id ?? '?'}': ${reason}`);
  };
  if (!route.id || !route.name) fail('id and name are required');
  if (!(route.length > 0)) fail('length (miles) must be > 0');
  if (!route.profile?.length) fail('profile must have at least one entry');
  if (route.profile[0].at !== 0) fail('first profile entry must be at 0');
  let prev = -Infinity;
  for (const p of route.profile) {
    if (!PROFILES[p.type]) fail(`unknown road type '${p.type}'`);
    const gap = (p.at - prev) * METERS_PER_MILE;
    if (p.at !== 0 && gap < MIN_PROFILE_SPACING) {
      fail(
        `profile entry at ${p.at} mi is too close to the previous one; ` +
          `roadway changes need >= ${MIN_PROFILE_SPACING_MILES.toFixed(2)} mi of spacing`
      );
    }
    prev = p.at;
  }
  if (prev > route.length) fail('last profile entry is beyond length');
  for (const e of route.events ?? []) {
    if (typeof e.event !== 'string' || !e.event) fail('every event needs an event name');
    if (e.at < 0 || e.at > route.length) fail(`event '${e.event}' at ${e.at} mi is outside [0, length]`);
  }
}

// Drives one scripted route over the infinite road. Distance-based: markers
// are route distances (converted to meters here); wall time flexes with the
// user's speed. Emits through the RoadwayAPI event bus:
//   'routeEvent'       { event, payload, atMiles }   scripted emission
//   'routeStarted'     { id, name, type }            initial roadway
//   'routeEnded'       { id, name }                  crossed `length`
// ROADWAY_CHANGED itself rides the existing 'transitioncomplete' event, which
// fires the moment the car crosses a roadway boundary.
export class RouteRunner {
  constructor(route, api, segments) {
    validateRoute(route);
    this.route = route;
    this.api = api;
    this.segments = segments;

    this.startS = segments.S;
    this.lengthM = route.length * METERS_PER_MILE;
    this.changes = route.profile.slice(1).map((p) => ({ ...p, atM: p.at * METERS_PER_MILE }));
    this.events = [...(route.events ?? [])]
      .map((e) => ({ ...e, atM: e.at * METERS_PER_MILE }))
      .sort((a, b) => a.atM - b.atM);
    this.nextChange = 0;
    this.nextEvent = 0;
    this.ended = false;

    api.emit('routeStarted', { id: route.id, name: route.name, type: route.profile[0].type });
  }

  get distance() {
    return this.segments.S - this.startS;
  }

  get distanceMiles() {
    return this.distance / METERS_PER_MILE;
  }

  // The nearest upcoming marker (roadway change, event, or END), for the
  // debug panel. Null once everything has fired.
  nextMarker() {
    const candidates = [];
    if (this.nextChange < this.changes.length) {
      const c = this.changes[this.nextChange];
      candidates.push({ label: c.type, atMiles: c.at });
    }
    if (this.nextEvent < this.events.length) {
      const e = this.events[this.nextEvent];
      candidates.push({ label: e.event, atMiles: e.at });
    }
    if (!this.ended) candidates.push({ label: 'END', atMiles: this.route.length });
    if (!candidates.length) return null;
    return candidates.reduce((a, b) => (a.atMiles <= b.atMiles ? a : b));
  }

  update() {
    const d = this.distance;

    // Command upcoming roadway changes early so the snapped boundary lands on
    // the marker and the transition scrolls in from the fog.
    while (this.nextChange < this.changes.length && d >= this.changes[this.nextChange].atM - SCHEDULE_LEAD) {
      const c = this.changes[this.nextChange++];
      this.segments.setRoadTypeAt(c.type, this.startS + c.atM);
    }

    while (this.nextEvent < this.events.length && d >= this.events[this.nextEvent].atM) {
      const e = this.events[this.nextEvent++];
      this.api.emit('routeEvent', { event: e.event, payload: e.payload, atMiles: e.at });
    }

    if (!this.ended && d >= this.lengthM) {
      this.ended = true;
      this.api.emit('routeEnded', { id: this.route.id, name: this.route.name });
    }
  }
}
