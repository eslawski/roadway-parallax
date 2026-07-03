import * as THREE from 'three';
import { SEGMENT_LENGTH as L } from './constants.js';
import { createRoadMaterial, setRoadUniforms } from './RoadMaterial.js';
import { buildLineSlots, matchLineSlots } from './profiles.js';
import { InstancePool } from '../scenery/InstancePool.js';
import { scatterSegment } from '../scenery/Scatterer.js';
import { terrainHeight, fbm2, CORRIDOR_L, CORRIDOR_R } from '../utils/noise.js';

const GRASS_DARK = new THREE.Color(0.085, 0.135, 0.038);
const GRASS_LIGHT = new THREE.Color(0.16, 0.21, 0.07);
const _c = new THREE.Color();

const TERRAIN_WIDTH = 114;
const TERRAIN_SEG_X = 19;
const TERRAIN_SEG_Z = 9;

function makeTerrainMesh(centerX, material) {
  const geo = new THREE.PlaneGeometry(TERRAIN_WIDTH, L, TERRAIN_SEG_X, TERRAIN_SEG_Z);
  geo.rotateX(-Math.PI / 2);
  geo.translate(centerX, 0, 0);
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

// One 50m slice of the world: road slab, flanking terrain, and scenery
// pools. Rebuilt in place each time it recycles to the far end.
export class Segment {
  constructor(assets, terrainMaterial) {
    this.group = new THREE.Group();
    this.k = 0;

    const roadGeo = new THREE.PlaneGeometry(CORRIDOR_R - CORRIDOR_L, L, 4, 12);
    roadGeo.rotateX(-Math.PI / 2);
    roadGeo.translate((CORRIDOR_L + CORRIDOR_R) / 2, 0, 0);
    this.roadMaterial = createRoadMaterial();
    this.roadMesh = new THREE.Mesh(roadGeo, this.roadMaterial);
    this.roadMesh.position.y = 0.02;
    this.roadMesh.receiveShadow = true;
    this.roadMesh.frustumCulled = false;
    this.group.add(this.roadMesh);

    this.terrainL = makeTerrainMesh(CORRIDOR_L - TERRAIN_WIDTH / 2, terrainMaterial);
    this.terrainR = makeTerrainMesh(CORRIDOR_R + TERRAIN_WIDTH / 2, terrainMaterial);
    this.group.add(this.terrainL, this.terrainR);

    this.pools = {};
    for (const [name, def] of Object.entries(assets)) {
      const pool = new InstancePool(def);
      this.pools[name] = pool;
      this.group.add(pool.mesh);
    }
  }

  // profileAt: route distance -> profile object
  rebuild(k, profileAt) {
    this.k = k;
    const r0 = k * L;
    const rc = r0 + L / 2;
    const near = profileAt(r0 + 0.5);
    const far = profileAt(r0 + L + 0.5);

    let linesA = buildLineSlots(near);
    let linesB = buildLineSlots(far);
    if (near !== far) [linesA, linesB] = matchLineSlots(linesA, linesB);
    setRoadUniforms(this.roadMaterial, {
      pavedA: near.paved,
      pavedB: far.paved,
      linesA,
      linesB,
      wearA: near.wear,
      wearB: far.wear,
      routeOffset: rc,
      blend: near !== far ? 1 : 0,
    });

    this.rebuildTerrain(this.terrainL, rc);
    this.rebuildTerrain(this.terrainR, rc);
    scatterSegment(this.pools, near.name, k, r0);
  }

  rebuildTerrain(mesh, rc) {
    const pos = mesh.geometry.attributes.position;
    const col = mesh.geometry.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = rc - z;
      pos.setY(i, terrainHeight(x, r));
      const n = fbm2(x * 0.055 + 7.0, r * 0.055);
      const n2 = fbm2(x * 0.35, r * 0.35);
      _c.lerpColors(GRASS_DARK, GRASS_LIGHT, Math.min(1, Math.max(0, n * 0.9 + n2 * 0.28 - 0.09)));
      col.setXYZ(i, _c.r, _c.g, _c.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  setScroll(S) {
    this.group.position.z = S - (this.k * L + L / 2);
  }

  routeEnd() {
    return this.k * L + L;
  }
}
