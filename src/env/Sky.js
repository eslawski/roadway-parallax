import * as THREE from 'three';

export const FOG_COLOR = new THREE.Color(0xcfe0ea);
export const SUN_DIR = new THREE.Vector3(0.5, 0.62, 0.3).normalize();

function makeCloudTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const blobs = [
    [128, 150, 90], [70, 160, 55], [190, 158, 60], [110, 120, 55], [160, 125, 45],
  ];
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSky(scene) {
  const zenith = new THREE.Color(0x3f7cc4);
  const horizon = FOG_COLOR.clone();

  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: zenith },
      uHorizon: { value: horizon },
      uSunDir: { value: SUN_DIR },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uSunDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 sky = mix(uHorizon, uZenith, pow(h, 0.6));
        float s = max(dot(d, uSunDir), 0.0);
        sky += vec3(1.0, 0.95, 0.82) * pow(s, 1100.0) * 2.4;
        sky += vec3(1.0, 0.9, 0.72) * pow(s, 14.0) * 0.16;
        gl_FragColor = vec4(sky, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), material);
  dome.frustumCulled = false;
  scene.add(dome);

  // A few static billboard clouds pinned near the horizon.
  const cloudTex = makeCloudTexture();
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const positions = [
    [-420, 200, -820, 460],
    [260, 240, -860, 520],
    [640, 170, -640, 380],
    [-720, 210, -480, 420],
    [80, 300, -900, 620],
  ];
  for (const [x, y, z, s] of positions) {
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.45), cloudMat);
    cloud.position.set(x, y, z);
    cloud.scale.setScalar(s);
    cloud.lookAt(0, 60, 0);
    scene.add(cloud);
  }

  return dome;
}
