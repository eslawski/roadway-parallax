import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Procedurally-built shared geometries and materials for all roadside
// scenery. Every geometry is authored with its base at y = 0 so instances can
// be placed directly on the ground and scaled.

// mergeGeometries requires all-indexed or all-non-indexed; normalize to
// non-indexed since icosahedra/cones are already non-indexed.
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

function coniferGeometry() {
  const trunk = colorize(
    new THREE.CylinderGeometry(0.14, 0.22, 1.8, 6).translate(0, 0.9, 0),
    0x4a3826
  );
  const tiers = [
    new THREE.ConeGeometry(2.0, 3.2, 8).translate(0, 3.0, 0),
    new THREE.ConeGeometry(1.55, 2.8, 8).translate(0, 4.9, 0),
    new THREE.ConeGeometry(1.05, 2.4, 8).translate(0, 6.6, 0),
  ].map((g) => colorize(g, 0x2c4a22));
  return merged([trunk, ...tiers]);
}

function deciduousGeometry() {
  const trunk = colorize(
    new THREE.CylinderGeometry(0.18, 0.3, 2.8, 6).translate(0, 1.4, 0),
    0x594430
  );
  const blobs = [
    new THREE.IcosahedronGeometry(2.1, 1).translate(0, 4.3, 0),
    new THREE.IcosahedronGeometry(1.5, 1).translate(1.3, 3.5, 0.4),
    new THREE.IcosahedronGeometry(1.35, 1).translate(-1.1, 3.7, -0.4),
  ].map((g) => colorize(g, 0x3d5a26));
  return merged([trunk, ...blobs]);
}

function bushGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  g.scale(1, 0.65, 1);
  g.translate(0, 0.55, 0);
  return colorize(g, 0x38511f);
}

function utilityPoleGeometry() {
  const pole = colorize(
    new THREE.CylinderGeometry(0.11, 0.15, 9.5, 6).translate(0, 4.75, 0),
    0x5c4e3d
  );
  const arm = colorize(
    new THREE.BoxGeometry(2.4, 0.14, 0.14).translate(0, 8.7, 0),
    0x5c4e3d
  );
  return merged([pole, arm]);
}

function lightPoleGeometry() {
  const pole = colorize(
    new THREE.CylinderGeometry(0.13, 0.2, 10, 6).translate(0, 5, 0),
    0x6b7076
  );
  const arm = colorize(
    new THREE.CylinderGeometry(0.09, 0.11, 3.4, 5)
      .rotateZ(Math.PI / 2.25)
      .translate(1.5, 10.1, 0),
    0x6b7076
  );
  const head = colorize(
    new THREE.BoxGeometry(0.9, 0.18, 0.34).translate(3.0, 10.6, 0),
    0x9aa0a6
  );
  return merged([pole, arm, head]);
}

function delineatorGeometry() {
  const post = colorize(new THREE.BoxGeometry(0.09, 1.1, 0.09).translate(0, 0.55, 0), 0xcfcfcf);
  const reflector = colorize(new THREE.BoxGeometry(0.1, 0.12, 0.02).translate(0, 0.98, 0.05), 0xd48a00);
  return merged([post, reflector]);
}

function fencePostGeometry() {
  return colorize(new THREE.BoxGeometry(0.12, 1.3, 0.12).translate(0, 0.65, 0), 0x6b5b45);
}

function guardrailPostGeometry() {
  return colorize(new THREE.BoxGeometry(0.16, 0.78, 0.12).translate(0, 0.39, 0), 0x7d838a);
}

// Unit-length rail beam; scaled along z per instance.
function guardrailRailGeometry() {
  return colorize(new THREE.BoxGeometry(0.06, 0.36, 1).translate(0, 0.62, 0), 0x9ba1a8);
}

// Unit-length jersey barrier; scaled along z per instance.
function barrierGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.31, 0);
  shape.lineTo(0.31, 0);
  shape.lineTo(0.14, 0.55);
  shape.lineTo(0.11, 0.95);
  shape.lineTo(-0.11, 0.95);
  shape.lineTo(-0.14, 0.55);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return colorize(g, 0x8f9294);
}

function noiseWallGeometry() {
  return colorize(new THREE.BoxGeometry(0.4, 1, 1).translate(0, 0.5, 0), 0xa89f8d);
}

function makeBuildingTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b7b2ab';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#5a6470';
  for (let y = 4; y < 60; y += 8) {
    for (let x = 4; x < 60; x += 8) {
      ctx.fillRect(x, y, 4, 5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildingGeometry() {
  const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  // Repeat the window texture with building scale via per-face uv scaling at
  // instance level is not possible; a single repeat looks fine at distance.
  return g;
}

function barnGeometry() {
  const body = colorize(new THREE.BoxGeometry(9, 5, 14).translate(0, 2.5, 0), 0x8a3a2b);
  const roof = colorize(
    new THREE.CylinderGeometry(0.5, 0.5, 14, 3, 1)
      .rotateX(-Math.PI / 2)
      .scale(11, 4.4, 1)
      .translate(0, 5.9, 0),
    0x8d9298
  );
  return merged([body, roof]);
}

function mailboxGeometry() {
  const post = colorize(new THREE.BoxGeometry(0.09, 1.1, 0.09).translate(0, 0.55, 0), 0x50412f);
  const box = colorize(new THREE.BoxGeometry(0.5, 0.24, 0.22).translate(0, 1.2, 0), 0x3c4650);
  return merged([post, box]);
}

export function createAssets() {
  const foliageMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
  });
  const smoothMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
  });
  const buildingMat = new THREE.MeshStandardMaterial({
    map: makeBuildingTexture(),
    roughness: 0.95,
  });

  // capacity = max instances per segment
  return {
    conifer: { geometry: coniferGeometry(), material: foliageMat, capacity: 34, shadow: true },
    deciduous: { geometry: deciduousGeometry(), material: foliageMat, capacity: 34, shadow: true },
    bush: { geometry: bushGeometry(), material: foliageMat, capacity: 22, shadow: false },
    utilityPole: { geometry: utilityPoleGeometry(), material: smoothMat, capacity: 3, shadow: true },
    lightPole: { geometry: lightPoleGeometry(), material: smoothMat, capacity: 4, shadow: true },
    delineator: { geometry: delineatorGeometry(), material: smoothMat, capacity: 6, shadow: false },
    fencePost: { geometry: fencePostGeometry(), material: smoothMat, capacity: 16, shadow: false },
    guardrailPost: { geometry: guardrailPostGeometry(), material: smoothMat, capacity: 16, shadow: false },
    guardrailRail: { geometry: guardrailRailGeometry(), material: smoothMat, capacity: 3, shadow: false },
    barrier: { geometry: barrierGeometry(), material: smoothMat, capacity: 2, shadow: true },
    noiseWall: { geometry: noiseWallGeometry(), material: smoothMat, capacity: 3, shadow: true },
    building: { geometry: buildingGeometry(), material: buildingMat, capacity: 7, shadow: true },
    barn: { geometry: barnGeometry(), material: smoothMat, capacity: 2, shadow: true },
    mailbox: { geometry: mailboxGeometry(), material: smoothMat, capacity: 2, shadow: false },
  };
}
