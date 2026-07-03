import * as THREE from 'three';
import { MAX_LINES } from './profiles.js';
import { SEGMENT_LENGTH } from './constants.js';

// The road surface is a MeshStandardMaterial whose diffuse color is generated
// procedurally in the fragment shader (asphalt grain, wheel-track wear,
// crisp anti-aliased lane markings, gravel shoulders, grass beyond). Using the
// standard material keeps shadows, fog, and tone mapping for free.
//
// Each segment gets its own material instance whose uniforms describe the
// paved extents + line slots of profile A (near end) and profile B (far end).
// For normal segments A === B; for transition segments uBlend = 1 and the
// shader lerps A -> B along the segment's length.

const glslFunctions = /* glsl */ `
uniform vec4 uPavedA;
uniform vec4 uPavedB;
uniform vec4 uLinesA[${MAX_LINES}];
uniform vec4 uLinesB[${MAX_LINES}];
uniform vec3 uWearA;
uniform vec3 uWearB;
uniform float uRouteOffset;
uniform float uBlend;
varying vec3 vRoadPos;

float rhash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float rnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(rhash(i), rhash(i + vec2(1.0, 0.0)), u.x),
    mix(rhash(i + vec2(0.0, 1.0)), rhash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float intervalMask(float x, float lo, float hi, float aa) {
  if (hi - lo < 0.1) return 0.0;
  return smoothstep(lo - aa, lo, x) * (1.0 - smoothstep(hi, hi + aa, x));
}
`;

const glslRoadColor = /* glsl */ `
{
  float rx = vRoadPos.x;
  float rr = uRouteOffset - vRoadPos.z;
  float t = uBlend * smoothstep(0.12, 0.88, 0.5 - vRoadPos.z / ${SEGMENT_LENGTH.toFixed(1)});
  float aa = fwidth(rx) * 1.2 + 0.006;

  vec4 paved = mix(uPavedA, uPavedB, t);
  float mainMask = intervalMask(rx, paved.x, paved.y, aa);
  float oppMask = intervalMask(rx, paved.z, paved.w, aa);
  float pavedMask = max(mainMask, oppMask);

  // grass + gravel shoulder outside the pavement
  float gn = rnoise(vec2(rx * 0.35, rr * 0.35));
  float gn2 = rnoise(vec2(rx * 0.055 + 7.0, rr * 0.055));
  vec3 grass = mix(vec3(0.085, 0.135, 0.038), vec3(0.16, 0.21, 0.07), gn2 * 0.72 + gn * 0.28);
  float dEdge = min(abs(rx - paved.x), abs(rx - paved.y));
  if (paved.w - paved.z > 0.1) dEdge = min(dEdge, min(abs(rx - paved.z), abs(rx - paved.w)));
  float gravel = (1.0 - pavedMask) * (1.0 - smoothstep(0.35, 1.15, dEdge));
  vec3 ground = mix(grass, vec3(0.22, 0.19, 0.15) * (0.7 + 0.5 * gn), gravel);

  // asphalt with grain and large-scale patchiness
  float grain = rnoise(vec2(rx * 3.1, rr * 3.1));
  float blotch = rnoise(vec2(rx * 0.13 + 3.0, rr * 0.045));
  vec3 asphalt = vec3(0.052, 0.054, 0.058) * (0.8 + 0.45 * grain) + vec3(0.016) * blotch;

  // wheel-track wear darkening per travel lane
  vec3 wear = mix(uWearA, uWearB, t);
  if (mainMask > 0.0 && wear.z > 0.5) {
    float lanePos = (rx - wear.x) / wear.y;
    if (lanePos > 0.0 && lanePos < wear.z) {
      float lp = fract(lanePos);
      float wtrack = exp(-pow((lp - 0.28) * 6.0, 2.0)) + exp(-pow((lp - 0.72) * 6.0, 2.0));
      asphalt *= 1.0 - 0.22 * wtrack * (0.7 + 0.3 * blotch);
    }
  }

  vec3 col = mix(ground, asphalt, pavedMask);

  // lane markings
  float dashMask = smoothstep(0.0, 0.25, 3.05 - mod(rr, 12.2));
  float paintWear = 0.62 + 0.38 * rnoise(vec2(rx * 2.0, rr * 0.7));
  vec3 white = vec3(0.62, 0.62, 0.64);
  vec3 yellow = vec3(0.55, 0.33, 0.032);
  for (int i = 0; i < ${MAX_LINES}; i++) {
    vec4 A = uLinesA[i];
    vec4 B = uLinesB[i];
    float alpha = mix(A.z, B.z, t);
    if (alpha < 0.01) continue;
    float lx = mix(A.x, B.x, t);
    float ty = t < 0.5 ? A.y : B.y;
    float m;
    vec3 pc;
    if (ty > 2.5) {
      float d2 = min(abs(rx - lx - 0.15), abs(rx - lx + 0.15));
      m = 1.0 - smoothstep(0.06, 0.06 + aa, d2);
      pc = yellow;
    } else {
      m = 1.0 - smoothstep(0.07, 0.07 + aa, abs(rx - lx));
      if (ty < 0.5) m *= dashMask;
      pc = ty > 1.5 ? yellow : white;
    }
    m *= alpha * paintWear * pavedMask;
    col = mix(col, pc, m);
  }

  diffuseColor.rgb = col;
}
`;

export function createRoadMaterial() {
  const uniforms = {
    uPavedA: { value: new THREE.Vector4() },
    uPavedB: { value: new THREE.Vector4() },
    uLinesA: { value: Array.from({ length: MAX_LINES }, () => new THREE.Vector4()) },
    uLinesB: { value: Array.from({ length: MAX_LINES }, () => new THREE.Vector4()) },
    uWearA: { value: new THREE.Vector3() },
    uWearB: { value: new THREE.Vector3() },
    uRouteOffset: { value: 0 },
    uBlend: { value: 0 },
  };

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.96,
    metalness: 0.0,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRoadPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + glslFunctions)
      .replace('#include <map_fragment>', glslRoadColor);
  };
  material.customProgramCacheKey = () => 'roadway-road';
  material.userData.roadUniforms = uniforms;
  return material;
}

// Push profile data into a material's uniforms.
export function setRoadUniforms(material, { pavedA, pavedB, linesA, linesB, wearA, wearB, routeOffset, blend }) {
  const u = material.userData.roadUniforms;
  u.uPavedA.value.fromArray(pavedA);
  u.uPavedB.value.fromArray(pavedB);
  for (let i = 0; i < MAX_LINES; i++) {
    u.uLinesA.value[i].fromArray(linesA[i]);
    u.uLinesB.value[i].fromArray(linesB[i]);
  }
  u.uWearA.value.fromArray(wearA);
  u.uWearB.value.fromArray(wearB);
  u.uRouteOffset.value = routeOffset;
  u.uBlend.value = blend;
}
