import * as THREE from 'three';
import { Simulation } from './sim/Simulation.js';
import { SegmentManager } from './road/SegmentManager.js';
import { createSky, FOG_COLOR } from './env/Sky.js';
import { createLighting } from './env/Lighting.js';
import { RoadwayAPI } from './api/RoadwayAPI.js';
import { initKeyboard } from './api/Keyboard.js';
import { initPostMessageBridge } from './api/PostMessageBridge.js';
import { showWelcomeOverlay } from './ui/WelcomeOverlay.js';
import { PROFILES } from './road/profiles.js';

const EYE_HEIGHT = 1.25;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, 140, 640);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 2000);
camera.position.set(0, EYE_HEIGHT, 0);
camera.lookAt(0, EYE_HEIGHT - 0.35, -80);
const baseRotX = camera.rotation.x;

createSky(scene);
createLighting(scene);

const sim = new Simulation();
const segments = new SegmentManager(scene, 'highway');
const api = new RoadwayAPI(sim, segments);
window.roadway = api;
initKeyboard(api);
initPostMessageBridge(api);
showWelcomeOverlay();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Subtle speed- and surface-dependent camera motion. Amplitudes are a few
// millimeters — enough to feel alive, never distracting.
let bobTime = 0;
function applyCameraMotion(dt) {
  if (!sim.paused) bobTime += dt * (0.4 + (sim.speed / 55) * 1.1);
  const roughness = PROFILES[segments.currentType].roughness;
  const amp = (sim.speed / 55) * roughness;
  camera.position.y =
    EYE_HEIGHT + (Math.sin(bobTime * 7.1) * 0.006 + Math.sin(bobTime * 12.7 + 1.7) * 0.0045) * amp;
  camera.position.x = Math.sin(bobTime * 3.3) * 0.008 * amp;
  camera.rotation.z = Math.sin(bobTime * 2.1) * 0.0016 * amp;
  camera.rotation.x = baseRotX + Math.sin(bobTime * 9.3) * 0.0006 * amp;
}

let lastTime = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const distance = sim.step(dt);
  segments.update(distance);
  applyCameraMotion(dt);
  renderer.render(scene, camera);
}
frame();
