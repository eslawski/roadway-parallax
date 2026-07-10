// Scripted route definitions. All distances are decimal miles from the start
// of the route; they are converted to meters once, at load (see RouteRunner).
//
//   id         stable key (also handy for hosts)
//   name       shown in the picker and debug panel
//   startSpeed mph applied when the route starts (optional, default 55)
//   length     miles; crossing it fires ROUTE_ENDED and shows the END sign
//   profile    roadway changes; `at` is where the road IS that type under the
//              car (the engine schedules the transition early). First entry
//              must be at 0. Consecutive entries need ~0.31 mi of spacing so
//              each transition can materialize in the fog.
//   events     postMessage emissions; `{ type: <event>, payload }` is posted
//              to the host verbatim the moment the car crosses `at`.
export const ROUTES = [
  {
    id: 'demo-route',
    name: 'Demo Route',
    startSpeed: 55,
    length: 3.0,
    profile: [
      { at: 0, type: 'backroad' },
      { at: 0.5, type: 'highway' },
      { at: 1.25, type: 'mega' },
      { at: 2.25, type: 'highway' },
    ],
    events: [
      { at: 0.25, event: 'EVENT_1', payload: { foo: 1 } },
      { at: 1.0, event: 'EVENT_2' },
      { at: 1.75, event: 'EVENT_1', payload: { foo: 2 } },
    ],
  },
  {
    id: 'country-cruise',
    name: 'Country Cruise',
    startSpeed: 45,
    length: 2.0,
    profile: [
      { at: 0, type: 'backroad' },
      { at: 1.0, type: 'highway' },
    ],
    events: [
      { at: 0.5, event: 'EVENT_1', payload: { scenic: true } },
      { at: 1.5, event: 'EVENT_2' },
    ],
  },
];
