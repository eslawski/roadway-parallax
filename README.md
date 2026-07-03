# roadway-parallax

A 3D driver's-eye roadway simulation built with Three.js. Renders only the
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
| `1` | `mega` | 4 lanes one direction, jersey-barrier median, light poles, guardrail, noise walls, city buildings |
| `2` | `highway` | 2 lanes one direction, grass median with opposing carriageway, fields, fences, farms |
| `3` | `backroad` | 1 lane each way, double-yellow center line, dense trees, utility poles |

## Controls

Keyboard: **↑/↓** speed ±2.5 m/s (0–55 m/s), **Space** pause/resume, **1/2/3** road types.

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
`roadway:transitionstart` / `roadway:transitioncomplete`.

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
