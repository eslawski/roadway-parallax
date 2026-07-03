import * as THREE from 'three';

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

// A fixed-capacity InstancedMesh owned by one road segment. Refilled from
// scratch every time the segment recycles.
export class InstancePool {
  constructor({ geometry, material, capacity, shadow }) {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.castShadow = shadow;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // ensure instanceColor exists up front
    this.mesh.setColorAt(0, _color.setScalar(1));
    this.capacity = capacity;
    this.cursor = 0;
  }

  begin() {
    this.cursor = 0;
  }

  add(x, y, z, rotY = 0, sx = 1, sy = 1, sz = 1, tint = null) {
    if (this.cursor >= this.capacity) return;
    _position.set(x, y, z);
    _quaternion.setFromEuler(_euler.set(0, rotY, 0));
    _scale.set(sx, sy, sz);
    _matrix.compose(_position, _quaternion, _scale);
    this.mesh.setMatrixAt(this.cursor, _matrix);
    this.mesh.setColorAt(this.cursor, tint ? _color.setRGB(tint[0], tint[1], tint[2]) : _color.setScalar(1));
    this.cursor++;
  }

  end() {
    this.mesh.count = this.cursor;
    this.mesh.visible = this.cursor > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
