// Free-play stations near the landing pad: Tool Shop, Alien Egg Incubator, Galaxy Portal.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getHeight } from './terrain.js';
import { signTexture } from '../utils/textures.js';
import { buildPickaxe, PICKAXE_TIERS } from '../game/Mining.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...o });

function base(x, z, y = null) {
  const g = new THREE.Group();
  g.position.set(x, (y ?? getHeight(x, z)) - 0.05, z);
  return g;
}

/** Two-sided sign that reads correctly from the front AND the back. */
function sign(text, icon, accent, w = 2.6) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: signTexture(text, { icon, accent }), transparent: true });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat);
  const back = front.clone();
  back.rotation.y = Math.PI;
  g.add(front, back);
  return g;
}

function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Workbench with a rotating pickaxe on display. */
export function buildToolShop(center) {
  const g = base(center.x, center.z);
  g.name = 'tool-shop';
  add(g, new THREE.CylinderGeometry(2, 2.2, 0.25, 24), std('#2a3157'), 0, 0.12, 0);
  add(g, new RoundedBoxGeometry(2.6, 1.0, 1.2, 3, 0.12), std('#aab6d0'), 0, 0.75, 0);
  add(g, new THREE.BoxGeometry(2.7, 0.1, 1.3), std('#FFC857'), 0, 1.3, 0);
  add(g, new THREE.CylinderGeometry(0.35, 0.4, 0.3, 16), std('#6046C8'), 0, 1.5, 0);
  const display = new THREE.Group();
  display.position.set(0, 2.1, 0);
  g.add(display);
  const pick = buildPickaxe(PICKAXE_TIERS[1]);
  pick.position.z = -0.45;
  display.add(pick);
  const s = sign('TOOL SHOP', '⛏️', '#54B8F5');
  s.position.set(0, 3.0, 0);
  g.add(s);
  return {
    group: g, display,
    colliders: [{ x: center.x, z: center.z, r: 1.5 }],
    interactPoint: new THREE.Vector3(center.x, 0, center.z + 2.2),
  };
}

/** Glass incubator with a glowing alien egg. */
export function buildEggIncubator(center) {
  const g = base(center.x, center.z);
  g.name = 'egg-incubator';
  add(g, new THREE.CylinderGeometry(1.8, 2.0, 0.6, 24), std('#F7F8FF'), 0, 0.3, 0);
  add(g, new THREE.TorusGeometry(1.85, 0.08, 8, 40), std('#FF7894', { emissive: '#FF7894', emissiveIntensity: 1.2 }), 0, 0.62, 0).rotation.x = Math.PI / 2;
  add(g, new THREE.CylinderGeometry(1.3, 1.3, 0.2, 24), std('#6046C8', { emissive: '#6046C8', emissiveIntensity: 0.6 }), 0, 0.7, 0);
  const eggMat = std('#c8f5e6', { emissive: '#54D6AE', emissiveIntensity: 0.7, roughness: 0.3 });
  const egg = add(g, new THREE.SphereGeometry(0.6, 24, 18), eggMat, 0, 1.55, 0);
  egg.scale.set(1, 1.3, 1);
  // Spots on the egg
  const spotMat = std('#9b87f5', { emissive: '#9b87f5', emissiveIntensity: 0.8 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), spotMat);
    spot.position.set(Math.cos(a) * 0.55, (i % 3 - 1) * 0.3, Math.sin(a) * 0.55);
    spot.scale.set(1, 1, 0.4);
    spot.lookAt(spot.position.clone().multiplyScalar(2));
    egg.add(spot);
  }
  const dome = add(g, new THREE.SphereGeometry(1.25, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#d8f8ff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }), 0, 0.75, 0);
  dome.castShadow = false;
  dome.renderOrder = 2;
  const s = sign('ALIEN EGGS', '🥚', '#FF7894');
  s.position.set(0, 3.0, 0);
  s.rotation.y = Math.PI; // faces the path (north)
  g.add(s);
  const light = new THREE.PointLight('#54D6AE', 6, 8, 2);
  light.position.set(0, 2, 0);
  g.add(light);
  return {
    group: g, egg, eggMat,
    colliders: [{ x: center.x, z: center.z, r: 2.0 }],
    interactPoint: new THREE.Vector3(center.x, 0, center.z - 2.8),
  };
}

/** Swirling galaxy portal ring. */
export function buildGalaxyPortal(center, label = 'GALAXY PORTAL', y = null, rotY = 0) {
  const g = base(center.x, center.z, y);
  g.rotation.y = rotY;
  g.name = 'galaxy-portal';
  add(g, new THREE.CylinderGeometry(3.2, 3.5, 0.35, 32), std('#2a3157'), 0, 0.17, 0);
  const ringMat = std('#9b87f5', { emissive: '#6046C8', emissiveIntensity: 1.6, metalness: 0.4 });
  const ring = add(g, new THREE.TorusGeometry(2.3, 0.28, 14, 48), ringMat, 0, 2.8, 0);
  [-2.3, 2.3].forEach((x) => add(g, new RoundedBoxGeometry(0.7, 1.0, 0.7, 2, 0.12), std('#aab6d0'), x, 0.6, 0));
  // Animated swirl inside the ring
  const swirlMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color('#54B8F5') }, uB: { value: new THREE.Color('#FF7894') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uTime; uniform vec3 uA, uB; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
        float s = sin(a * 4.0 + r * 10.0 - uTime * 3.0) * 0.5 + 0.5;
        vec3 col = mix(uA, uB, s) + vec3(1.0) * smoothstep(0.35, 0.0, r) * 0.8;
        float alpha = smoothstep(1.0, 0.85, r) * (0.75 + 0.25 * s);
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), swirlMat);
  swirl.position.y = 2.8;
  g.add(swirl);
  const s = sign(label, '🌌', '#9b87f5', 3.2);
  s.position.set(0, 5.6, 0);
  g.add(s);
  const light = new THREE.PointLight('#9b87f5', 12, 14, 2);
  light.position.set(0, 3, 1.5);
  g.add(light);
  return {
    group: g, ring, swirlMat,
    colliders: [-2.3, 2.3].map((o) => ({ x: center.x + Math.cos(rotY) * o, z: center.z - Math.sin(rotY) * o, r: 0.6 })),
    interactPoint: new THREE.Vector3(center.x, 0, center.z),
    update(t) { swirlMat.uniforms.uTime.value = t; ring.rotation.z = t * 0.3; },
  };
}
