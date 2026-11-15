// Stylized lunar terrain: gentle base area, craters, hills and a mountain ring.
import * as THREE from 'three';
import { fbm, seededRandom } from '../utils/noise.js';
import { smoothstep, lerp } from '../utils/Tween.js';

export const WORLD_SIZE = 190;
export const PLAY_RADIUS = 56;

// Big craters outside the base + a couple of small ones inside it
export const CRATERS = [
  { x: -36, z: 27, r: 7, depth: 1.8 },
  { x: 38, z: 32, r: 9, depth: 2.2 },
  { x: 33, z: -36, r: 7, depth: 1.8 },
  { x: -40, z: -30, r: 10, depth: 2.4 },
  { x: -6, z: 42, r: 6, depth: 1.4 },
  { x: 46, z: -4, r: 6.5, depth: 1.6 },
  { x: -48, z: 4, r: 7, depth: 1.7 },
  { x: 14, z: -46, r: 6, depth: 1.5 },
  { x: -10, z: -15, r: 3, depth: 0.7 },
  { x: 9, z: -16, r: 2.4, depth: 0.55 },
  { x: 27, z: 6, r: 3.2, depth: 0.7 },
];

// Areas flattened for buildings (x, z, radius)
export const FLAT_SPOTS = [
  { x: 0, z: 0, r: 13 },     // habitat
  { x: -22, z: -6, r: 9 },   // solar
  { x: 20, z: -4, r: 7 },    // oxygen
  { x: 0, z: -27, r: 7 },    // shelter
  { x: 17, z: 16, r: 6 },    // greenhouse
  { x: -18, z: 15, r: 4 },   // antenna
  { x: 0, z: 21, r: 7 },     // landing pad
  { x: -8, z: 17, r: 3 },    // tool shop
  { x: -11.5, z: 23, r: 3.5 }, // alien egg incubator
  { x: 12, z: 29, r: 5 },    // galaxy portal
  { x: 8.5, z: 21.5, r: 3.5 }, // rover parking
];

function rawHeight(x, z) {
  const d = Math.hypot(x, z);
  let h = (fbm(x * 0.035 + 10, z * 0.035 - 4, 4) - 0.5) * 6;
  h += (fbm(x * 0.12, z * 0.12, 2) - 0.5) * 0.9;

  // Keep the base area mostly calm
  h *= lerp(0.18, 1, smoothstep(24, 42, d));

  // Craters with raised rims
  for (const c of CRATERS) {
    const dd = Math.hypot(x - c.x, z - c.z) / c.r;
    if (dd < 1) h -= c.depth * (1 - dd * dd);
    else if (dd < 1.5) h += c.depth * 0.35 * (1 - (dd - 1) / 0.5) * Math.min(1, (dd - 0.9) * 4);
  }

  // Hill behind the shelter (shelter is "dug into" it)
  h += 5.5 * Math.exp(-((x * x) / 90 + ((z + 37) ** 2) / 50));

  // Mountain ring at the edge of the playable area
  h += smoothstep(PLAY_RADIUS - 2, PLAY_RADIUS + 22, d) * 14 * (0.6 + fbm(x * 0.05, z * 0.05, 3));
  return h;
}

const spotHeights = FLAT_SPOTS.map((s) => rawHeight(s.x, s.z));

/** Terrain height at any world position (used by player, props, camera). */
export function getHeight(x, z) {
  let h = rawHeight(x, z);
  FLAT_SPOTS.forEach((s, i) => {
    const d = Math.hypot(x - s.x, z - s.z);
    const t = smoothstep(s.r, s.r + 5, d);
    h = lerp(spotHeights[i], h, t);
  });
  return h;
}

export function buildTerrain() {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const cLow = new THREE.Color('#7f84b8');   // lavender-gray in craters
  const cMid = new THREE.Color('#9ea8c8');   // Lunar Gray
  const cHigh = new THREE.Color('#ccd0ec');  // bright dust
  const cWarm = new THREE.Color('#c7b9d9');  // hint of warm dust
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = getHeight(x, z);
    pos.setY(i, h);
    const n = fbm(x * 0.08 + 3, z * 0.08 + 7, 3);
    const k = THREE.MathUtils.clamp((h + 2) / 8, 0, 1);
    tmp.copy(cLow).lerp(cMid, Math.min(1, k * 1.8));
    if (k > 0.55) tmp.lerp(cHigh, (k - 0.55) * 2);
    tmp.lerp(cWarm, n * 0.35);
    const shade = 0.9 + n * 0.18;
    colors[i * 3] = tmp.r * shade;
    colors[i * 3 + 1] = tmp.g * shade;
    colors[i * 3 + 2] = tmp.b * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
  const terrain = new THREE.Mesh(geo, material);
  terrain.receiveShadow = true;
  terrain.name = 'terrain';
  return terrain;
}

/**
 * Scattered rocks (instanced for performance).
 * `isBlocked(x, z, r)` keeps them away from buildings and paths.
 * Returns { mesh, colliders }.
 */
export function buildRocks(isBlocked) {
  const rand = seededRandom(7);
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({ color: '#9aa3c7', roughness: 0.9, flatShading: true });
  const count = 190;
  const rocks = new THREE.InstancedMesh(geo, material, count);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const colliders = [];
  const color = new THREE.Color();
  let placed = 0, tries = 0;
  while (placed < count && tries < 4000) {
    tries++;
    const x = (rand() - 0.5) * (WORLD_SIZE - 20);
    const z = (rand() - 0.5) * (WORLD_SIZE - 20);
    const d = Math.hypot(x, z);
    const big = d > 30 ? rand() : rand() * 0.35;
    const s = 0.25 + big * big * 2.2;
    if (isBlocked(x, z, s + 1.2)) continue;
    dummy.position.set(x, getHeight(x, z) + s * 0.25, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(s * (0.8 + rand() * 0.6), s * (0.6 + rand() * 0.5), s * (0.8 + rand() * 0.6));
    dummy.updateMatrix();
    rocks.setMatrixAt(placed, dummy.matrix);
    color.set(rand() > 0.5 ? '#a3abcf' : '#8b8fb8').multiplyScalar(0.9 + rand() * 0.2);
    rocks.setColorAt(placed, color);
    if (s > 0.9 && d < PLAY_RADIUS + 2) colliders.push({ x, z, r: s * 0.9 });
    placed++;
  }
  rocks.count = placed;
  return { mesh: rocks, colliders };
}
