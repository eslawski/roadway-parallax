import * as THREE from 'three';
import { terrainHeight } from '../utils/noise.js';

// Easter egg (B key, backroad only): a sasquatch appears far up the right
// shoulder, lopes toward the camera, then cuts hard left across the road and
// vanishes into the hills on the far side. Only one can be out at a time.
//
// He lives in route space (r = route distance, x = road-space lateral), so he
// scrolls with the world like any other scenery; his own ground velocity is
// layered on top. The cut across the road starts at a distance computed from
// the current driving speed so he always clears the camera's carriageway
// while still well ahead and clearly visible — including while paused.

const RUN_SPEED = 9; // m/s along the shoulder, toward the camera
const CROSS_SPEED = 12.5; // m/s lateral sprint across the pavement
const CROSS_DRIFT = 3.5; // m/s he keeps toward the camera mid-crossing
const SHOULDER_X = 5; // approach line: the tree-free verge right of the pavement
const PAVEMENT_L = -6; // just past the backroad's left pavement edge
const EXIT_X = -70; // far enough left to be outside the view frustum
const CROSS_MARGIN = 20; // meters still ahead of the camera after the cut

function buildModel() {
  const furMat = new THREE.MeshStandardMaterial({
    color: 0x8a6a48,
    roughness: 1,
    flatShading: true,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xb3906a,
    roughness: 1,
    flatShading: true,
  });

  // Authored facing +z, feet at y = 0, ~2.7m tall. The body group (torso,
  // head, arms) leans and bobs with the run cycle; legs pivot at the hips.
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), furMat);
  chest.scale.set(1.05, 1.0, 0.72);
  chest.position.y = 1.86;
  const belly = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), furMat);
  belly.scale.set(0.95, 0.9, 0.7);
  belly.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), furMat);
  head.scale.set(0.95, 1.1, 0.9);
  head.position.y = 2.5;
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.1), faceMat);
  face.position.set(0, 2.5, 0.24);
  body.add(chest, belly, head, face);

  const pelvis = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), furMat);
  pelvis.scale.set(0.95, 0.75, 0.7);
  pelvis.position.y = 1.25;
  root.add(pelvis);

  function limb(radiusTop, radiusBottom, length, footLength = 0) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 5),
      furMat
    );
    mesh.position.y = -length / 2;
    pivot.add(mesh);
    if (footLength) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, footLength), furMat);
      foot.position.set(0, -length + 0.07, footLength * 0.24);
      pivot.add(foot);
    }
    return pivot;
  }

  const armL = limb(0.16, 0.1, 1.25);
  armL.position.set(-0.72, 2.24, 0);
  const armR = limb(0.16, 0.1, 1.25);
  armR.position.set(0.72, 2.24, 0);
  body.add(armL, armR);

  const legL = limb(0.2, 0.13, 1.28, 0.55);
  legL.position.set(-0.27, 1.28, 0);
  const legR = limb(0.2, 0.13, 1.28, 0.55);
  legR.position.set(0.27, 1.28, 0);
  root.add(legL, legR);

  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });

  return { root, body, armL, armR, legL, legR };
}

export class Bigfoot {
  constructor(scene) {
    this.model = buildModel();
    this.root = this.model.root;
    this.root.visible = false;
    scene.add(this.root);
    this.active = false;
  }

  // No-op while one is already out.
  summon(S, speed) {
    if (this.active) return false;
    this.active = true;
    this.phase = 'approach';
    // Faster driving eats distance quicker, so spawn him further out; he
    // always materializes inside the fog and resolves as he approaches.
    this.r = S + Math.min(180 + speed * 4, 420);
    this.x = SHOULDER_X + 3;
    this.vx = 0;
    this.vr = -RUN_SPEED;
    this.stride = 0;
    this.root.visible = true;
    return true;
  }

  despawn() {
    this.active = false;
    this.root.visible = false;
  }

  update(dt, S, speed) {
    if (!this.active) return;

    if (this.phase === 'approach') {
      // Start the cut early enough that he clears our carriageway while
      // still CROSS_MARGIN meters ahead at the current closing rate.
      const crossTime = (this.x - PAVEMENT_L) / CROSS_SPEED;
      const ahead = this.r - S;
      if (ahead <= CROSS_MARGIN + (speed + CROSS_DRIFT) * crossTime) this.phase = 'cross';
    } else if (this.phase === 'cross' && this.x < PAVEMENT_L) {
      this.phase = 'flee';
    }

    // Steer toward the phase's target ground velocity (vr < 0 runs toward
    // the camera); easing the turn carves a natural arc instead of a snap.
    let tx, tr;
    if (this.phase === 'approach') {
      tx = Math.max(-2, Math.min(2, (SHOULDER_X - this.x) * 0.6));
      tr = -RUN_SPEED;
    } else if (this.phase === 'cross') {
      tx = -CROSS_SPEED;
      tr = -CROSS_DRIFT;
    } else {
      tx = -10;
      tr = 0;
    }
    const ease = Math.min(1, dt * 2.5);
    this.vx += (tx - this.vx) * ease;
    this.vr += (tr - this.vr) * ease;
    this.x += this.vx * dt;
    this.r += this.vr * dt;

    const z = S - this.r;
    if (z > 40 || this.x < EXIT_X) {
      this.despawn();
      return;
    }
    this.root.position.set(this.x, Math.max(terrainHeight(this.x, this.r), 0), z);
    // Face the direction of ground travel (his own dz/dt is -vr).
    this.root.rotation.y = Math.atan2(this.vx, -this.vr);

    this.animate(dt);
  }

  animate(dt) {
    const { body, armL, armR, legL, legR } = this.model;
    const groundSpeed = Math.hypot(this.vx, this.vr);
    this.stride += dt * groundSpeed * 1.85;
    const s = Math.sin(this.stride);
    legL.rotation.x = s * 0.85;
    legR.rotation.x = -s * 0.85;
    armL.rotation.x = -s * 0.6;
    armR.rotation.x = s * 0.6;
    armL.rotation.z = 0.14;
    armR.rotation.z = -0.14;
    body.position.y = Math.abs(Math.cos(this.stride)) * 0.09;
    body.rotation.x = 0.18 + Math.sin(this.stride * 2) * 0.03;
    body.rotation.z = s * 0.05;
  }
}
