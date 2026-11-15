// Space sky: purple-navy gradient, twinkling stars, Earth and the Sun.
import * as THREE from 'three';
import { earthTexture, glowTexture } from '../utils/textures.js';
import { seededRandom } from '../utils/noise.js';

export const SUN_DIRECTION = new THREE.Vector3(0.55, 0.62, 0.3).normalize();
export const EARTH_POSITION = new THREE.Vector3(70, 85, -300);

export function buildSky() {
  const group = new THREE.Group();
  group.name = 'sky';

  // Gradient dome (shader so we can tint it red during the solar storm)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color('#070b24') },
      uHorizon: { value: new THREE.Color('#3b2a86') },
      uBottom: { value: new THREE.Color('#0b1030') },
      uStormColor: { value: new THREE.Color('#ff6a3d') },
      uStorm: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTop, uHorizon, uBottom, uStormColor;
      uniform float uStorm, uTime;
      varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 col = y > 0.0 ? mix(uHorizon, uTop, pow(clamp(y * 1.6, 0.0, 1.0), 0.6))
                           : mix(uHorizon, uBottom, clamp(-y * 4.0, 0.0, 1.0));
        // soft nebula bands
        float neb = sin(vDir.x * 6.0 + vDir.z * 3.0) * sin(vDir.y * 9.0 - vDir.x * 2.0);
        col += vec3(0.25, 0.1, 0.35) * smoothstep(0.55, 1.0, neb) * 0.35 * smoothstep(-0.1, 0.4, y);
        // storm glow
        float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
        col = mix(col, uStormColor * (0.45 + 0.55 * clamp(y + 0.3, 0.0, 1.0)), uStorm * 0.55 * pulse);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 20), skyMat);
  dome.renderOrder = -10;
  group.add(dome);

  // Stars
  const rand = seededRandom(3);
  const count = 2600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = ['#ffffff', '#cfe6ff', '#ffe9b0', '#ffd0dc', '#d9d0ff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const r = 400;
    const s = Math.sqrt(1 - u * u);
    positions.set([Math.cos(th) * s * r, Math.abs(u) * r * 0.95 + (u < 0 ? -40 : 0), Math.sin(th) * s * r], i * 3);
    const c = palette[Math.floor(rand() * palette.length)];
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const starMat = new THREE.PointsMaterial({ size: 1.8, vertexColors: true, sizeAttenuation: false, transparent: true, opacity: 0.95, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  group.add(stars);

  // Earth
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(26, 40, 28),
    new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.8, emissive: '#1d3f8a', emissiveIntensity: 0.35, fog: false }),
  );
  earth.position.copy(EARTH_POSITION);
  earth.rotation.z = 0.4;
  group.add(earth);
  const atmo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#6fb6ff'), transparent: true, opacity: 0.8, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  atmo.scale.setScalar(78);
  atmo.position.copy(EARTH_POSITION);
  group.add(atmo);

  // Sun (bright glow in the sky, matches the directional light)
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#fff2cc'), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, color: '#ffffff' }));
  sun.scale.setScalar(90);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(380);
  group.add(sun);

  return {
    group,
    skyMat,
    stars,
    earth,
    atmo,
    sun,
    update(dt, time) {
      skyMat.uniforms.uTime.value = time;
      earth.rotation.y += dt * 0.03;
      starMat.opacity = 0.8 + Math.sin(time * 1.7) * 0.15;
    },
  };
}
