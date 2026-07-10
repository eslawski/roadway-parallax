# Roadway Parallax

**[▶ Live demo](https://eslawski.github.io/roadway-parallax/)**

A 3D driver's-eye endless roadway scene built with Three.js. Renders only the
road and environment — no vehicles, no UI chrome — so it can be embedded
inside a larger cockpit experience. The world streams toward a fixed camera
in 50 m recycled segments; road-type changes materialize in the fog ~400 m
ahead and scroll in naturally.

## Running

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static bundle in dist/ (relative base, iframe-friendly)
```

## Road types

| key | id | description |
|-----|------------|-------------|
| `1` | `backroad` | 1 lane each way, double-yellow center line, dense trees, utility poles |
| `2` | `highway` | 2 lanes one direction, grass median with opposing carriageway, fields, fences, farms |
| `3` | `mega` | 4 lanes one direction, jersey-barrier median, light poles, guardrail, noise walls, city buildings |

## Scripted routes

On load, a picker offers the scripted **routes** (authored in
`src/routes/routes.js`) plus **Free drive** (the classic mode). A route is a
finite, distance-based script in decimal miles: roadway changes (`profile`)
and postMessage emissions (`events`) fire at exact mile markers, then a
`ROUTE_ENDED` event and an on-screen END sign mark the finish (driving
continues on the final roadway type). While a route runs, roadway changes are
locked out (keyboard and postMessage); speed, pause, and pull-over stay live.

`profile` markers mean "the road IS this type under the car at this
distance" — the engine schedules each transition early so it scrolls in from
the fog and lands on the marker (±25 m, snapped to the segment grid).
Consecutive roadway changes need ≥ ~0.34 mi spacing (validated at load).

A debug panel (visible by default in route mode, **D** toggles) shows live
distance, the current roadway, the next marker, and a log of fired events.

## Controls

Keyboard: **↑/↓** speed ±5 mph, **Space** pause/resume, **P** pull over &
park (terminal), **D** toggle the route debug panel, **1/2/3** road types
(Free drive only).

### JS API (`window.roadway`)

```js
roadway.setSpeed(mps)        // 0–55, eased with realistic accel/decel
roadway.getSpeed()
roadway.pause() / roadway.resume() / roadway.toggle()
roadway.setRoadType('mega' | 'highway' | 'backroad')  // appears in the distance
roadway.getRoadType()
roadway.getState()  // { speed, targetSpeed, paused, roadType, targetRoadType, transitioning }
roadway.on('transitionstart' | 'transitioncomplete' | 'pause' | 'resume' | 'statechange', cb)
```

### postMessage (for iframe embedding)

Send to the iframe's `contentWindow`:

```js
frame.contentWindow.postMessage({ type: 'roadway:setSpeed', value: 30 }, '*');
frame.contentWindow.postMessage({ type: 'roadway:setRoadType', value: 'backroad' }, '*');
frame.contentWindow.postMessage({ type: 'roadway:pause' }, '*');   // also resume / toggle
frame.contentWindow.postMessage({ type: 'roadway:getState' }, '*');
```

The sim posts back to its parent: `roadway:state` on every state change, plus
`roadway:transitionstart` / `roadway:transitioncomplete` /
`roadway:pullover` / `roadway:parked`.

Alongside those, a demo-facing protocol of raw top-level types:

```js
{ type: 'ROADWAY_CHANGED', payload: { type: 'highway' } } // road changed under the car
{ type: 'PARKED' }                                        // fully parked on the shoulder
{ type: 'ROUTE_ENDED', payload: { id, name } }            // scripted route finished
{ type: 'EVENT_1', payload: { ... } }                     // scripted route events, verbatim
```

## Architecture notes

- `src/road/SegmentManager.js` — treadmill of 17 × 50 m segments; profile
  "spans" along the route make transitions robust (including rapid successive
  changes).
- `src/road/RoadMaterial.js` — asphalt, wheel-track wear, and anti-aliased
  lane markings generated in the fragment shader; transition segments lerp
  between two profiles along their length.
- `src/scenery/` — per-segment `InstancedMesh` pools, deterministic scatter
  seeded by segment index.
- `src/utils/noise.js` — shared deterministic noise: terrain heights, grass
  colors, and tree placement all agree.
- Note: `requestAnimationFrame` is throttled by the browser when the page is
  hidden/occluded, so the sim effectively slows/pauses off-screen.
