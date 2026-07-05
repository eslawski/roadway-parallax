import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Procedural low-poly traffic vehicles: car, pickup, semi (tractor-trailer).
// Authored facing -z (the direction of same-direction travel), centered on
// x = 0 / z = 0, with wheel bottoms at y = 0 so vehicles sit directly on the
// pavement. Geometry is shared per type; only the painted body (and a semi's
// trailer) gets a per-instance material so its color can vary per spawn.

// Same normalization as scenery assets: mergeGeometries needs all-indexed or
// all-non-indexed.
function merged(geometries) {
  return mergeGeometries(geometries.map((g) => (g.index ? g.toNonIndexed() : g)));
}

function colorize(geometry, hex) {
  const c = new THREE.Color(hex);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

const GLASS = 0x161b20;
const TIRE = 0x1b1b1d;
const CHASSIS = 0x2a2c2e;
const BUMPER = 0x9aa0a6;

function wheel(r, w, x, y, z) {
  return colorize(
    new THREE.CylinderGeometry(r, r, w, 10).rotateZ(Math.PI / 2).translate(x, y, z),
    TIRE
  );
}

function carParts() {
  const body = merged([
    new THREE.BoxGeometry(1.76, 0.5, 4.5).translate(0, 0.6, 0),
    new THREE.BoxGeometry(1.6, 0.5, 2.2).translate(0, 1.05, 0.25),
  ]);
  const detail = merged([
    // greenhouse: pokes a hair past the cabin on every side
    colorize(new THREE.BoxGeometry(1.64, 0.3, 2.28).translate(0, 1.12, 0.25), GLASS),
    colorize(new THREE.BoxGeometry(1.78, 0.16, 0.22).translate(0, 0.5, -2.25), BUMPER),
    colorize(new THREE.BoxGeometry(1.78, 0.16, 0.22).translate(0, 0.5, 2.25), BUMPER),
    wheel(0.32, 0.22, -0.78, 0.32, -1.45),
    wheel(0.32, 0.22, 0.78, 0.32, -1.45),
    wheel(0.32, 0.22, -0.78, 0.32, 1.45),
    wheel(0.32, 0.22, 0.78, 0.32, 1.45),
  ]);
  const head = merged([
    new THREE.BoxGeometry(0.34, 0.12, 0.08).translate(-0.58, 0.72, -2.34),
    new THREE.BoxGeometry(0.34, 0.12, 0.08).translate(0.58, 0.72, -2.34),
  ]);
  const tail = merged([
    new THREE.BoxGeometry(0.3, 0.12, 0.08).translate(-0.6, 0.72, 2.34),
    new THREE.BoxGeometry(0.3, 0.12, 0.08).translate(0.6, 0.72, 2.34),
  ]);
  return { body, detail, head, tail, length: 4.7 };
}

function pickupParts() {
  const body = merged([
    new THREE.BoxGeometry(1.94, 0.6, 5.3).translate(0, 0.75, 0),
    new THREE.BoxGeometry(1.86, 0.24, 1.4).translate(0, 1.16, -1.9), // hood
    new THREE.BoxGeometry(1.8, 0.62, 1.6).translate(0, 1.35, -0.35), // cab
    // open bed walls + tailgate, painted like the body
    new THREE.BoxGeometry(0.12, 0.34, 2.0).translate(-0.9, 1.21, 1.6),
    new THREE.BoxGeometry(0.12, 0.34, 2.0).translate(0.9, 1.21, 1.6),
    new THREE.BoxGeometry(1.9, 0.34, 0.12).translate(0, 1.21, 2.58),
  ]);
  const detail = merged([
    colorize(new THREE.BoxGeometry(1.84, 0.34, 1.68).translate(0, 1.42, -0.35), GLASS),
    colorize(new THREE.BoxGeometry(1.96, 0.18, 0.24).translate(0, 0.55, -2.68), BUMPER),
    colorize(new THREE.BoxGeometry(1.96, 0.18, 0.24).translate(0, 0.55, 2.68), BUMPER),
    wheel(0.38, 0.26, -0.87, 0.38, -1.7),
    wheel(0.38, 0.26, 0.87, 0.38, -1.7),
    wheel(0.38, 0.26, -0.87, 0.38, 1.62),
    wheel(0.38, 0.26, 0.87, 0.38, 1.62),
  ]);
  const head = merged([
    new THREE.BoxGeometry(0.36, 0.14, 0.08).translate(-0.65, 0.85, -2.78),
    new THREE.BoxGeometry(0.36, 0.14, 0.08).translate(0.65, 0.85, -2.78),
  ]);
  const tail = merged([
    new THREE.BoxGeometry(0.14, 0.3, 0.08).translate(-0.84, 1.21, 2.66),
    new THREE.BoxGeometry(0.14, 0.3, 0.08).translate(0.84, 1.21, 2.66),
  ]);
  return { body, detail, head, tail, length: 5.6 };
}

function semiParts() {
  // Cab-over tractor at the front (-z), 14.6m box trailer riding over the
  // rear axles. The trailer is a separate geometry so it can carry its own
  // (always gray/white) material while the cab takes a fleet color.
  const body = merged([
    new THREE.BoxGeometry(2.5, 2.1, 2.6).translate(0, 1.95, -8.6), // cab
    new THREE.BoxGeometry(2.3, 0.5, 1.6).translate(0, 3.2, -8.3), // roof fairing
  ]);
  const trailer = new THREE.BoxGeometry(2.55, 2.9, 14.6).translate(0, 2.55, 2.7);
  const detail = merged([
    colorize(new THREE.BoxGeometry(2.54, 0.75, 0.55).translate(0, 2.5, -9.7), GLASS),
    colorize(new THREE.BoxGeometry(2.5, 0.4, 0.2).translate(0, 0.55, -9.95), BUMPER),
    colorize(new THREE.BoxGeometry(1.15, 0.5, 6.0).translate(0, 0.75, -6.9), CHASSIS),
    colorize(new THREE.BoxGeometry(1.0, 0.4, 3.0).translate(0, 0.9, 8.0), CHASSIS), // trailer bogie
    colorize(new THREE.BoxGeometry(2.3, 0.35, 0.12).translate(0, 0.62, 9.9), CHASSIS), // underride bar
    wheel(0.5, 0.35, -1.08, 0.5, -8.9),
    wheel(0.5, 0.35, 1.08, 0.5, -8.9),
    wheel(0.5, 0.7, -0.95, 0.5, -5.0), // tractor tandem (doubles as one wide tire)
    wheel(0.5, 0.7, 0.95, 0.5, -5.0),
    wheel(0.5, 0.7, -0.95, 0.5, -3.95),
    wheel(0.5, 0.7, 0.95, 0.5, -3.95),
    wheel(0.5, 0.7, -0.95, 0.5, 7.5), // trailer tandem
    wheel(0.5, 0.7, 0.95, 0.5, 7.5),
    wheel(0.5, 0.7, -0.95, 0.5, 8.55),
    wheel(0.5, 0.7, 0.95, 0.5, 8.55),
  ]);
  const head = merged([
    new THREE.BoxGeometry(0.4, 0.16, 0.08).translate(-0.85, 1.2, -9.98),
    new THREE.BoxGeometry(0.4, 0.16, 0.08).translate(0.85, 1.2, -9.98),
  ]);
  const tail = merged([
    new THREE.BoxGeometry(0.14, 0.35, 0.08).translate(-1.1, 1.05, 10.02),
    new THREE.BoxGeometry(0.14, 0.35, 0.08).translate(1.1, 1.05, 10.02),
  ]);
  return { body, detail, head, tail, trailer, length: 20 };
}

const PART_BUILDERS = { car: carParts, pickup: pickupParts, semi: semiParts };
const partsCache = {};

const detailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const headlightMat = new THREE.MeshStandardMaterial({
  color: 0xfff2cc,
  emissive: 0xffe9b0,
  emissiveIntensity: 2,
  roughness: 0.4,
});
const taillightMat = new THREE.MeshStandardMaterial({
  color: 0x64100a,
  emissive: 0xff2a1a,
  emissiveIntensity: 1.6,
  roughness: 0.4,
});

// Weighted like a real parking lot: whites/grays/blacks dominate.
const BODY_COLORS = [
  [0xe8e8e8, 20],
  [0xc4c7cb, 16],
  [0x7d8085, 14],
  [0x1b1b1e, 14],
  [0x9e2020, 9],
  [0x2a4a7f, 9],
  [0xb3a284, 6],
  [0x2f4a38, 5],
  [0x5e2028, 4],
  [0xb4622d, 3],
];
const BODY_COLOR_TOTAL = BODY_COLORS.reduce((s, [, w]) => s + w, 0);
const TRAILER_COLORS = [0xf0f0f0, 0xdcdcdc, 0xc6c8ca, 0xb8bcbf];

export function pickBodyColor() {
  let roll = Math.random() * BODY_COLOR_TOTAL;
  for (const [hex, weight] of BODY_COLORS) {
    roll -= weight;
    if (roll <= 0) return hex;
  }
  return BODY_COLORS[0][0];
}

export function pickTrailerColor() {
  return TRAILER_COLORS[Math.floor(Math.random() * TRAILER_COLORS.length)];
}

export function buildVehicle(type) {
  const parts = (partsCache[type] ??= PART_BUILDERS[type]());
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.35 });
  root.add(new THREE.Mesh(parts.body, bodyMat));
  root.add(new THREE.Mesh(parts.detail, detailMat));
  root.add(new THREE.Mesh(parts.head, headlightMat));
  root.add(new THREE.Mesh(parts.tail, taillightMat));
  let trailerMat = null;
  if (parts.trailer) {
    trailerMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    root.add(new THREE.Mesh(parts.trailer, trailerMat));
  }
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { type, root, bodyMat, trailerMat, length: parts.length };
}
