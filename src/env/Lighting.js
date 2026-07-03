import * as THREE from 'three';
import { SUN_DIR } from './Sky.js';

export function createLighting(scene) {
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.7);
  sun.position.copy(SUN_DIR).multiplyScalar(160);
  sun.target.position.set(0, 0, -70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 480;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xc3d9ef, 0x6d7562, 1.35);
  scene.add(hemi);

  return { sun, hemi };
}
