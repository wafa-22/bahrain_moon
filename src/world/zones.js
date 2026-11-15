// Three bonus planet zones reached through the Galaxy Portal.
// Each zone lives far away from the Moon base in the same 3D scene and
// provides its own ground, colliders, hazards, star tokens and colours.
import * as THREE from 'three';
import { fbm, seededRandom } from '../utils/noise.js';
import { smoothstep } from '../utils/Tween.js';
import { buildGalaxyPortal } from './stations.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });

/** Golden star token you can collect. */
export function buildStarToken() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.22 : 0.5;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 });
  geo.center();
  const mesh = new THREE.Mesh(geo, std('#FFC857', { emissive: '#FFB020', emissiveIntensity: 1.1, metalness: 0.5, roughness: 0.3 }));
  mesh.castShadow = true;
  return mesh;
}

/** Heightfield island centred at `origin`. */
function buildIsland(origin, size, seg, height, color) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = height(x, z);
    pos.setY(i, h);
    color(c, x, z, h);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }));
  mesh.position.copy(origin);
  mesh.receiveShadow = true;
  return mesh;
}

function makeZoneBase(def, origin) {
  const group = new THREE.Group();
  group.name = `zone-${def.id}`;
  return {
    ...def,
    origin,
    group,
    colliders: [],
    tokens: [],
    rocks: [],
    killY: origin.y - 25,
    friction: 1,
    hazard: () => null,
    updaters: [],
    update(dt, t) { this.updaters.forEach((fn) => fn(dt, t)); },
  };
}

function addTokens(zone, list) {
  list.forEach(([x, y, z]) => {
    const mesh = buildStarToken();
    mesh.position.set(zone.origin.x + x, y, zone.origin.z + z);
    zone.group.add(mesh);
    zone.tokens.push({ mesh, taken: false, base: mesh.position.y });
  });
}

function addPortal(zone, lx, lz, y, rotY = 0) {
  const portal = buildGalaxyPortal(new THREE.Vector3(zone.origin.x + lx, y, zone.origin.z + lz), 'BACK TO MOON', y, rotY);
  zone.group.add(portal.group);
  zone.colliders.push(...portal.colliders);
  zone.portal = portal;
  zone.updaters.push((dt, t) => portal.update(t));
}

// ======================================================
// 🌋 MARS LAVA ZONE
// ======================================================
const MARS_LAVA = [{ x: 9, z: -4, r: 4.2 }, { x: -10, z: 4, r: 4.8 }, { x: 5, z: 6, r: 2.8 }, { x: -4, z: -9, r: 3.2 }, { x: 14, z: 10, r: 3 }];

export function buildMarsZone(origin) {
  const zone = makeZoneBase({
    id: 'mars', name: 'Mars Lava Zone', emoji: '🌋',
    intro: 'Welcome to Mars, the Red Planet! Collect all the star tokens — but don\'t touch the hot lava!',
    sky: { top: '#3a1430', horizon: '#d0663e', bottom: '#2a0f14' },
    fog: { color: '#7a3a30', near: 45, far: 160 },
    hemi: { sky: '#ffc49e', ground: '#5a2020' },
    sun: '#ffd2a8',
    rockColor: '#a5523f', crystalColor: '#FF5A3C', rockName: 'Mars Crystal',
    goalText: 'Collect all star tokens · avoid the lava',
    completeReward: 60,
  }, origin);

  const height = (x, z) => {
    const d = Math.hypot(x, z);
    let h = (fbm(x * 0.06 + 3, z * 0.06, 3) - 0.5) * 2.4;
    for (const l of MARS_LAVA) {
      const dd = Math.hypot(x - l.x, z - l.z) / l.r;
      if (dd < 1.15) h -= 2.2 * (1 - Math.min(1, dd) ** 2);
    }
    // Volcano in the back
    const vd = Math.hypot(x, z + 22);
    h += Math.max(0, 10 - vd * 1.0) - Math.max(0, 3 - vd) * 2.2;
    h += smoothstep(26, 36, d) * 12;
    return h;
  };
  zone.heightLocal = height;
  const island = buildIsland(origin, 96, 96, height, (c, x, z, h) => {
    const n = fbm(x * 0.1, z * 0.1, 2);
    c.set('#c4613f').lerp(new THREE.Color('#e89a62'), n * 0.7).lerp(new THREE.Color('#7a2f22'), Math.max(0, -h) * 0.5);
  });
  zone.group.add(island);

  // Lava pools (glowing)
  const lavaMat = new THREE.MeshStandardMaterial({ color: '#ff7a2f', emissive: '#ff4a1a', emissiveIntensity: 1.6, roughness: 0.4 });
  MARS_LAVA.forEach((l) => {
    const lava = new THREE.Mesh(new THREE.CircleGeometry(l.r * 0.98, 28), lavaMat);
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(origin.x + l.x, origin.y - 1.0, origin.z + l.z);
    zone.group.add(lava);
  });
  const crater = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), lavaMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(origin.x, origin.y + height(0, -22) + 0.2, origin.z - 22);
  zone.group.add(crater);
  const glow = new THREE.PointLight('#ff6a2a', 30, 30, 2);
  glow.position.set(origin.x, origin.y + 12, origin.z - 22);
  zone.group.add(glow);
  zone.updaters.push((dt, t) => { lavaMat.emissiveIntensity = 1.4 + Math.sin(t * 2) * 0.35; });

  zone.groundAt = (x, z) => {
    const lx = x - origin.x, lz = z - origin.z;
    if (Math.abs(lx) > 46 || Math.abs(lz) > 46) return null;
    return origin.y + height(lx, lz);
  };
  zone.hazard = (x, z, y) => {
    const lx = x - origin.x, lz = z - origin.z;
    for (const l of MARS_LAVA) {
      if (Math.hypot(lx - l.x, lz - l.z) < l.r - 0.6 && y < origin.y - 0.5) return '🔥 Ouch, lava is HOT! Back to the start.';
    }
    return null;
  };

  // Red rocks for decoration (with colliders)
  const rand = seededRandom(11);
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2, d = 10 + rand() * 18;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (MARS_LAVA.some((l) => Math.hypot(x - l.x, z - l.z) < l.r + 2) || Math.hypot(x, z - 14) < 6) continue;
    const s = 0.4 + rand() * 1.2;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), std('#8a3a2c', { flatShading: true }));
    r.position.set(origin.x + x, origin.y + height(x, z) + s * 0.3, origin.z + z);
    r.castShadow = true;
    zone.group.add(r);
    if (s > 0.8) zone.colliders.push({ x: origin.x + x, z: origin.z + z, r: s * 0.9 });
  }

  zone.spawn = new THREE.Vector3(origin.x, 0, origin.z + 12);
  zone.spawnHeading = Math.PI;
  addPortal(zone, -7, 15, origin.y + height(-7, 15));
  const tok = [[-14, 10], [12, -12], [0, -2], [-16, -8], [18, 2], [2, -15]];
  addTokens(zone, tok.map(([x, z]) => [x, origin.y + height(x, z) + 1.3, z]));
  zone.rockSpots = [[-6, 14], [8, 16], [-18, 0], [20, -6], [-8, -16], [10, -18], [-20, 12], [16, -14]]
    .map(([x, z]) => ({ x: origin.x + x, z: origin.z + z, y: origin.y + height(x, z) - 0.1 }));
  return zone;
}

// ======================================================
// 🪐 SATURN RINGS PARKOUR
// ======================================================
const SATURN_PLATFORMS = [
  { x: 0, z: 0, y: 0, r: 6, cp: true },
  { x: 0, z: -9, y: 0.4, r: 2.2 },
  { x: 3, z: -15, y: 1.0, r: 2 },
  { x: 7, z: -20, y: 1.6, r: 2 },
  { x: 12, z: -22, y: 2.2, r: 2.2 },
  { x: 17, z: -19, y: 2.6, r: 3, cp: true },
  { x: 21, z: -14, y: 3.2, r: 1.9 },
  { x: 22, z: -8, y: 3.8, r: 1.9 },
  { x: 20, z: -2, y: 4.4, r: 2 },
  { x: 15, z: 2, y: 5.0, r: 3, cp: true },
  { x: 9, z: 5, y: 5.5, r: 1.9 },
  { x: 4, z: 9, y: 6.1, r: 1.9 },
  { x: 0, z: 14, y: 6.7, r: 2 },
  { x: -5, z: 17, y: 7.2, r: 2 },
  { x: -11, z: 16, y: 7.8, r: 4, goal: true },
];

export function buildSaturnZone(origin) {
  const zone = makeZoneBase({
    id: 'saturn', name: 'Saturn Rings Parkour', emoji: '🪐',
    intro: 'Floating platforms near Saturn! Jump with SPACE from platform to platform and reach the golden goal. Fall off? You\'ll restart at the last checkpoint.',
    sky: { top: '#120a2e', horizon: '#6a4fa8', bottom: '#0a0820' },
    fog: { color: '#2b2550', near: 70, far: 240 },
    hemi: { sky: '#e0d2ff', ground: '#3a2f6a' },
    sun: '#fff1d6',
    goalText: 'Jump to the golden goal platform',
    completeReward: 120,
  }, origin);
  zone.killY = origin.y - 18;
  const colors = ['#9b87f5', '#54B8F5', '#FF7894', '#54D6AE', '#FFC857'];
  zone.platforms = SATURN_PLATFORMS.map((p, i) => {
    const top = origin.y + p.y;
    const mat = std(p.goal ? '#FFC857' : colors[i % colors.length], { roughness: 0.5 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 0.85, 0.7, 28), mat);
    mesh.position.set(origin.x + p.x, top - 0.35, origin.z + p.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    zone.group.add(mesh);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(p.r, 0.07, 6, 36), std('#ffffff', { emissive: p.cp || p.goal ? '#FFC857' : '#9fd8ff', emissiveIntensity: 1.4 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(origin.x + p.x, top + 0.02, origin.z + p.z);
    zone.group.add(rim);
    if (p.cp && i > 0) {
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 3), std('#54D6AE', { emissive: '#54D6AE', emissiveIntensity: 1 }));
      flag.position.set(origin.x + p.x, top + 1.8, origin.z + p.z);
      flag.rotation.z = -Math.PI / 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 6), std('#F7F8FF'));
      pole.position.set(origin.x + p.x - 0.3, top + 1, origin.z + p.z);
      zone.group.add(flag, pole);
    }
    if (p.goal) {
      const trophy = buildStarToken();
      trophy.scale.setScalar(2.4);
      trophy.position.set(origin.x + p.x, top + 2.4, origin.z + p.z);
      zone.group.add(trophy);
      zone.updaters.push((dt) => { trophy.rotation.y += dt * 1.5; });
      zone.goal = { x: origin.x + p.x, z: origin.z + p.z, y: top, r: p.r };
    }
    return { ...p, top, wx: origin.x + p.x, wz: origin.z + p.z };
  });

  // Saturn with rings in the background
  const planet = new THREE.Mesh(new THREE.SphereGeometry(40, 40, 28), std('#e8c98f', { emissive: '#7a5a2a', emissiveIntensity: 0.35, roughness: 0.8, fog: false }));
  planet.position.set(origin.x + 70, origin.y - 5, origin.z - 130);
  zone.group.add(planet);
  const ring = new THREE.Mesh(new THREE.RingGeometry(55, 90, 80), new THREE.MeshStandardMaterial({ color: '#f3dcae', side: THREE.DoubleSide, transparent: true, opacity: 0.7, emissive: '#7a6440', emissiveIntensity: 0.4, fog: false }));
  ring.position.copy(planet.position);
  ring.rotation.set(-Math.PI / 2 + 0.35, 0.25, 0);
  zone.group.add(ring);
  // Floating ring-ice chunks around the course
  const rand = seededRandom(5);
  const chunk = new THREE.IcosahedronGeometry(0.6, 0);
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(chunk, std('#cdd6f5', { flatShading: true }));
    const a = rand() * Math.PI * 2, d = 32 + rand() * 30;
    m.position.set(origin.x + Math.cos(a) * d, origin.y - 6 + rand() * 18, origin.z + Math.sin(a) * d);
    m.scale.setScalar(0.5 + rand() * 2);
    zone.group.add(m);
    zone.updaters.push((dt) => { m.rotation.x += dt * 0.3; m.rotation.y += dt * 0.2; });
  }

  zone.groundAt = (x, z, y) => {
    let best = null;
    for (const p of zone.platforms) {
      if (Math.hypot(x - p.wx, z - p.wz) > p.r) continue;
      if (p.top <= y + 0.7 && (best === null || p.top > best)) best = p.top;
    }
    return best;
  };
  zone.platformAt = (x, z, y) => zone.platforms.find((p) => Math.hypot(x - p.wx, z - p.wz) <= p.r && Math.abs(p.top - y) < 0.05);

  zone.spawn = new THREE.Vector3(origin.x, 0, origin.z - 1.5);
  zone.spawnHeading = Math.PI;
  addPortal(zone, -3.4, 1.5, origin.y, Math.PI / 2);
  addTokens(zone, [[3, 1.0 + 1.3, -15], [12, 2.2 + 1.3, -22], [21, 3.2 + 1.3, -14], [20, 4.4 + 1.3, -2], [9, 5.5 + 1.3, 5], [0, 6.7 + 1.3, 14]]
    .map(([x, y, z]) => [x, origin.y + y, z]));
  zone.rockSpots = [];
  return zone;
}

// ======================================================
// 🧊 NEPTUNE ICE WORLD
// ======================================================
export function buildNeptuneZone(origin) {
  const zone = makeZoneBase({
    id: 'neptune', name: 'Neptune Ice World', emoji: '🧊',
    intro: 'Brrr! Neptune is the windiest, iciest world. The ground is slippery — walk carefully and collect the star tokens!',
    sky: { top: '#06122e', horizon: '#2f7fc4', bottom: '#08142e' },
    fog: { color: '#1d3d6b', near: 45, far: 170 },
    hemi: { sky: '#bfe6ff', ground: '#2a4a7a' },
    sun: '#dff4ff',
    rockColor: '#7fa8d8', crystalColor: '#7fe0ff', rockName: 'Ice Crystal',
    goalText: 'Collect all star tokens on the slippery ice',
    completeReward: 80,
  }, origin);
  zone.friction = 0.18;
  const height = (x, z) => {
    const d = Math.hypot(x, z);
    let h = (fbm(x * 0.05 + 9, z * 0.05 + 2, 3) - 0.5) * 3;
    h *= smoothstep(6, 14, d); // flat frozen lake in the middle
    h += smoothstep(26, 34, d) * 10;
    return h;
  };
  const island = buildIsland(origin, 90, 90, height, (c, x, z, h) => {
    const d = Math.hypot(x, z);
    c.set('#cfe9ff').lerp(new THREE.Color('#7fb4e6'), fbm(x * 0.1, z * 0.1, 2) * 0.6);
    if (d < 10) c.set('#9fd6ff');
    if (h > 4) c.lerp(new THREE.Color('#ffffff'), 0.6);
  });
  island.material.roughness = 0.35;
  island.material.metalness = 0.1;
  zone.group.add(island);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(10, 40), new THREE.MeshStandardMaterial({ color: '#8fd8ff', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6 }));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(origin.x, origin.y + 0.03, origin.z);
  zone.group.add(lake);

  // Ice spikes
  const rand = seededRandom(21);
  const spikeMat = std('#bfeaff', { emissive: '#4fb8ff', emissiveIntensity: 0.35, roughness: 0.2, transparent: true, opacity: 0.9, flatShading: true });
  for (let i = 0; i < 30; i++) {
    const a = rand() * Math.PI * 2, d = 13 + rand() * 13;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x, z - 14) < 6) continue;
    const s = 0.5 + rand() * 1.2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(s, s * 4, 6), spikeMat);
    spike.position.set(origin.x + x, origin.y + height(x, z) + s * 1.6, origin.z + z);
    spike.rotation.set((rand() - 0.5) * 0.4, rand() * 3, (rand() - 0.5) * 0.4);
    spike.castShadow = true;
    zone.group.add(spike);
    zone.colliders.push({ x: origin.x + x, z: origin.z + z, r: s * 0.8 });
  }

  // Snowfall around the player
  const count = 600;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) pos.set([(Math.random() - 0.5) * 50, Math.random() * 20, (Math.random() - 0.5) * 50], i * 3);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.12, transparent: true, opacity: 0.85, depthWrite: false }));
  snow.position.copy(origin);
  snow.frustumCulled = false;
  zone.group.add(snow);
  zone.updaters.push((dt, t) => {
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= dt * (1.2 + (i % 5) * 0.3);
      pos[i * 3] += Math.sin(t + i) * dt * 0.8;
      if (pos[i * 3 + 1] < -2) pos[i * 3 + 1] = 18;
    }
    snowGeo.attributes.position.needsUpdate = true;
  });

  zone.groundAt = (x, z) => {
    const lx = x - origin.x, lz = z - origin.z;
    if (Math.abs(lx) > 44 || Math.abs(lz) > 44) return null;
    return origin.y + height(lx, lz);
  };
  zone.spawn = new THREE.Vector3(origin.x, 0, origin.z + 12);
  zone.spawnHeading = Math.PI;
  addPortal(zone, -7, 15, origin.y + height(-7, 15));
  const tok = [[0, 0], [-15, -6], [14, -10], [-8, 18], [18, 8], [-4, -18]];
  addTokens(zone, tok.map(([x, z]) => [x, origin.y + height(x, z) + 1.3, z]));
  zone.rockSpots = [[-7, 8], [7, 9], [-18, 2], [19, -2], [-10, -14], [9, -16], [-20, -12], [14, 16]]
    .map(([x, z]) => ({ x: origin.x + x, z: origin.z + z, y: origin.y + height(x, z) - 0.1 }));
  return zone;
}
