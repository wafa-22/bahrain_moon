// Builders for every building and prop on the lunar base.
// Each builder returns a THREE.Group plus handles the World uses for effects.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getHeight } from './terrain.js';
import {
  flagTexture, signTexture, padTexture, hazardTexture, solarCellTexture, ScreenDisplay,
} from '../utils/textures.js';

// ---------- Shared materials ----------
export function makeMaterials() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...o });
  return {
    white: std('#F7F8FF'),
    whiteFlat: std('#F7F8FF', { flatShading: true }),
    gray: std('#aab6d0'),
    steel: std('#8d97b8', { metalness: 0.5, roughness: 0.4 }),
    dark: std('#2a3157'),
    navy: std('#172448'),
    purple: std('#6046C8'),
    red: std('#CE1126'),
    yellow: std('#FFC857'),
    mint: std('#54D6AE'),
    coral: std('#FF7894'),
    blue: std('#54B8F5'),
    plant: std('#3fbf7f', { flatShading: true }),
    plantDark: std('#2a9a63', { flatShading: true }),
    // Materials that react to the game (power on/off etc.)
    window: std('#ffe7a8', { emissive: '#FFC857', emissiveIntensity: 0.12 }),
    lamp: std('#fff4d0', { emissive: '#FFD27A', emissiveIntensity: 0.08 }),
    marker: std('#9fd8ff', { emissive: '#54B8F5', emissiveIntensity: 0.15 }),
    growLight: std('#ffd0f0', { emissive: '#ff6ad5', emissiveIntensity: 0.05 }),
    beacon: std('#ff9aa3', { emissive: '#F25F6C', emissiveIntensity: 0.4 }),
    cable: std('#4b4f73', { emissive: '#FFC857', emissiveIntensity: 0 }),
    pipe: std('#c3cbe3', { emissive: '#54B8F5', emissiveIntensity: 0 }),
  };
}

function add(parent, geo, material, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

function placeGroup(x, z, sink = 0.05) {
  const g = new THREE.Group();
  g.position.set(x, getHeight(x, z) - sink, z);
  return g;
}

/** Small computer console with a live screen. Front faces +Z (rotate the group). */
function buildConsole(M, screenInfo) {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(1.3, 1.0, 0.8, 3, 0.1), M.gray, 0, 0.5, 0);
  add(g, new THREE.BoxGeometry(1.32, 0.12, 0.82), M.purple, 0, 0.92, 0);
  const screenFrame = new THREE.Group();
  screenFrame.position.set(0, 1.3, 0.05);
  screenFrame.rotation.x = -0.55;
  g.add(screenFrame);
  add(screenFrame, new RoundedBoxGeometry(1.3, 0.85, 0.12, 2, 0.04), M.navy, 0, 0, 0);
  const display = new ScreenDisplay(256, 160);
  display.show(screenInfo);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.7), new THREE.MeshBasicMaterial({ map: display.texture, toneMapped: false }));
  screen.position.z = 0.07;
  screenFrame.add(screen);
  // Glowing ring on the floor shows it's interactive
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.25, 32),
    new THREE.MeshBasicMaterial({ color: '#FFC857', transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.06, 1.6);
  g.add(ring);
  return { group: g, display, ring };
}

function curveTube(points, radius, material, lift = 0.1) {
  const pts = points.map(([x, z]) => new THREE.Vector3(x, getHeight(x, z) + lift, z));
  const curve = new THREE.CatmullRomCurve3(pts);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 8, false), material);
  mesh.castShadow = true;
  return { mesh, curve };
}

// ======================================================
// Habitat
// ======================================================
export function buildHabitat(M) {
  const g = placeGroup(0, 0);
  g.name = 'habitat';
  add(g, new THREE.CylinderGeometry(6.4, 6.7, 1.0, 28), M.gray, 0, 0.5, 0);
  add(g, new THREE.SphereGeometry(6, 22, 11, 0, Math.PI * 2, 0, Math.PI / 2), M.whiteFlat, 0, 1.0, 0);
  add(g, new THREE.CylinderGeometry(6.03, 6.03, 0.35, 28, 1, true), M.purple, 0, 1.2, 0, { cast: false });
  add(g, new THREE.CylinderGeometry(5.98, 5.98, 0.2, 28, 1, true), M.red, 0, 1.55, 0, { cast: false });

  // Windows all around (light up when power returns)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.31;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.4) continue; // skip door
    const r = 5.7, y = 2.7;
    const w = add(g, new RoundedBoxGeometry(1.2, 0.75, 0.3, 2, 0.1), M.window, Math.cos(a) * r, y, Math.sin(a) * r, { cast: false });
    w.lookAt(Math.cos(a) * 20, y + 2.5, Math.sin(a) * 20);
  }
  // Second row of small round windows
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 4.25, y = 5.05;
    const w = add(g, new THREE.CylinderGeometry(0.32, 0.32, 0.25, 14), M.window, Math.cos(a) * r, y, Math.sin(a) * r, { cast: false });
    w.lookAt(Math.cos(a) * 20, y + 12, Math.sin(a) * 20);
    w.rotateX(Math.PI / 2);
  }

  // Front door (faces +Z toward the landing pad)
  add(g, new RoundedBoxGeometry(2.8, 3.7, 2.2, 3, 0.25), M.white, 0, 1.85, 5.6);
  add(g, new THREE.BoxGeometry(1.7, 2.4, 0.1), M.navy, 0, 1.25, 6.72, { cast: false });
  add(g, new THREE.BoxGeometry(1.9, 0.12, 0.12), M.marker, 0, 2.55, 6.74, { cast: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTexture('MOON BASE', { icon: '🌙' }), transparent: true }));
  sign.position.set(0, 3.15, 6.73);
  g.add(sign);

  // Lab dome connected with a tunnel (back-left)
  const lab = new THREE.Group();
  lab.position.set(-10, 0, -10);
  g.add(lab);
  add(lab, new THREE.CylinderGeometry(3.1, 3.3, 0.8, 20), M.gray, 0, 0.4, 0);
  add(lab, new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.whiteFlat, 0, 0.8, 0);
  add(lab, new THREE.CylinderGeometry(3.02, 3.02, 0.3, 20, 1, true), M.coral, 0, 1.0, 0, { cast: false });
  const tunnel = add(g, new THREE.CylinderGeometry(1.1, 1.1, 4.6, 14), M.white, -6.2, 1.2, -6.2);
  tunnel.rotation.set(Math.PI / 2, 0, 0);
  tunnel.rotation.order = 'YXZ';
  tunnel.rotation.y = Math.PI / 4;
  add(g, new THREE.TorusGeometry(1.12, 0.1, 8, 20), M.purple, -6.2, 1.2, -6.2).rotation.y = Math.PI / 4;

  // Roof mast + beacon
  add(g, new THREE.CylinderGeometry(0.1, 0.12, 1.6, 8), M.steel, 0, 7.6, 0);
  const beacon = add(g, new THREE.SphereGeometry(0.28, 14, 10), M.beacon, 0, 8.5, 0, { cast: false });

  const doorLight = new THREE.PointLight('#ffd27a', 0, 18, 2);
  doorLight.position.set(0, 3.6, 8.2);
  g.add(doorLight);

  return {
    group: g,
    beacon,
    lights: [doorLight],
    colliders: [{ x: 0, z: 0, r: 6.9 }, { x: 0, z: 6.2, r: 1.7 }, { x: -10, z: -10, r: 3.5 }, { x: -6.2, z: -6.2, r: 1.4 }],
  };
}

// ======================================================
// Solar panel station
// ======================================================
export function buildSolarStation(M, center) {
  const g = placeGroup(center.x, center.z);
  g.name = 'solar-station';
  add(g, new THREE.BoxGeometry(14, 0.3, 8.5), M.dark, 0, 0.1, -0.5);
  add(g, new THREE.BoxGeometry(14.2, 0.12, 0.3), M.yellow, 0, 0.27, 3.7, { cast: false });

  const cellTex = solarCellTexture();
  const cellMat = new THREE.MeshStandardMaterial({
    map: cellTex, emissiveMap: cellTex, emissive: '#6aa8ff', emissiveIntensity: 0.02,
    color: '#8d8494', roughness: 0.35, metalness: 0.4,
  });
  const frameMat = M.white;
  const panels = [];
  const colliders = [];
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -1; iz <= 1; iz += 2) {
      const x = ix * 4.3, z = iz * 2.2 - 0.6;
      add(g, new THREE.CylinderGeometry(0.13, 0.17, 1.7, 8), M.steel, x, 0.95, z);
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.85, z);
      pivot.rotation.z = 1.15; // stowed (facing away from the Sun)
      g.add(pivot);
      add(pivot, new THREE.BoxGeometry(3.8, 0.1, 2.0), frameMat, 0, -0.06, 0);
      const cells = add(pivot, new THREE.BoxGeometry(3.6, 0.06, 1.85), cellMat, 0, 0.02, 0);
      cells.material = [M.dark, M.dark, cellMat, M.dark, M.dark, M.dark]; // only the top face shows cells
      panels.push(pivot);
      colliders.push({ x: center.x + x, z: center.z + z, r: 1.9 });
    }
  }

  // Scan beam used by "Inspect Solar Panels"
  const scan = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 3.2, 7.6),
    new THREE.MeshBasicMaterial({ color: '#54D6AE', transparent: true, opacity: 0.55, depthWrite: false }),
  );
  scan.position.set(-7, 1.9, -0.6);
  scan.visible = false;
  g.add(scan);

  // Battery bank with charge bars
  const batteries = [];
  [-1.2, 0.1].forEach((bz, i) => {
    const b = new THREE.Group();
    b.position.set(6.2, 0, bz - 2.6);
    g.add(b);
    add(b, new RoundedBoxGeometry(1.0, 1.5, 1.0, 3, 0.12), M.gray, 0, 0.9, 0);
    add(b, new THREE.BoxGeometry(1.02, 0.14, 1.02), M.yellow, 0, 1.55, 0);
    const bar = add(b, new THREE.BoxGeometry(0.22, 1.0, 0.05), new THREE.MeshStandardMaterial({ color: '#FFC857', emissive: '#FFC857', emissiveIntensity: 1.6 }), 0, 0.4, 0.52, { cast: false });
    bar.geometry.translate(0, 0.5, 0);
    bar.scale.y = 0.3;
    batteries.push(bar);
    colliders.push({ x: center.x + 6.2, z: center.z + bz - 2.6, r: 0.9 });
    if (i === 0) add(b, new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), M.steel, 0, 1.8, 0);
  });

  // Control console (faces +X, toward the habitat path)
  const consoleObj = buildConsole(M, { title: 'SOLAR ARRAY', value: '30%', status: 'POWER LOW', color: '#F25F6C' });
  consoleObj.group.position.set(7.4, 0.15, 2.4);
  consoleObj.group.rotation.y = Math.PI / 2;
  g.add(consoleObj.group);
  colliders.push({ x: center.x + 7.4, z: center.z + 2.4, r: 0.85 });

  const light = new THREE.PointLight('#ffd27a', 0, 16, 2);
  light.position.set(5, 4, 2);
  g.add(light);

  return {
    group: g, panels, cellMat, scan, batteries, console: consoleObj, colliders, lights: [light],
    interactPoint: new THREE.Vector3(center.x + 9.0, 0, center.z + 2.4),
  };
}

// ======================================================
// Oxygen station
// ======================================================
export function buildOxygenStation(M, center) {
  const g = placeGroup(center.x, center.z);
  g.name = 'oxygen-station';
  add(g, new THREE.CylinderGeometry(5, 5.2, 0.3, 28), M.dark, 0, 0.1, 0);
  add(g, new THREE.TorusGeometry(5.0, 0.08, 6, 40), M.blue, 0, 0.27, 0, { cast: false }).rotation.x = Math.PI / 2;
  const colliders = [];

  // Backup oxygen tank (glass with glowing O2 inside)
  const tank = new THREE.Group();
  tank.position.set(1.4, 0.25, -1.2);
  g.add(tank);
  add(tank, new THREE.CylinderGeometry(1.25, 1.3, 0.35, 20), M.white, 0, 0.18, 0);
  add(tank, new THREE.CylinderGeometry(1.25, 1.25, 0.35, 20), M.white, 0, 3.75, 0);
  add(tank, new THREE.SphereGeometry(0.25, 12, 8), M.blue, 0, 4.05, 0);
  const glass = add(tank, new THREE.CylinderGeometry(1.1, 1.1, 3.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), 0, 2.0, 0, { cast: false });
  glass.renderOrder = 2;
  const liquidMat = new THREE.MeshStandardMaterial({ color: '#7fd0ff', emissive: '#54B8F5', emissiveIntensity: 0.25, transparent: true, opacity: 0.8 });
  const liquid = add(tank, new THREE.CylinderGeometry(0.95, 0.95, 3.2, 20), liquidMat, 0, 0.35, 0, { cast: false });
  liquid.geometry.translate(0, 1.6, 0);
  liquid.scale.y = 0.2;
  [1.2, 2.8].forEach((y) => add(tank, new THREE.TorusGeometry(1.13, 0.07, 6, 28), M.blue, 0, y, 0, { cast: false }).rotation.x = Math.PI / 2);
  colliders.push({ x: center.x + 1.4, z: center.z - 1.2, r: 1.45 });

  // Regular tanks
  [[3.1, 1.3], [2.3, 2.8]].forEach(([x, z]) => {
    add(g, new THREE.CylinderGeometry(0.55, 0.55, 2.2, 16), M.white, x, 1.35, z);
    add(g, new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.white, x, 2.45, z);
    add(g, new THREE.CylinderGeometry(0.57, 0.57, 0.25, 16), M.blue, x, 1.6, z, { cast: false });
    colliders.push({ x: center.x + x, z: center.z + z, r: 0.75 });
  });

  // Air recycler unit with a spinning fan
  const unit = new THREE.Group();
  unit.position.set(-1.6, 0.25, -2.4);
  g.add(unit);
  add(unit, new RoundedBoxGeometry(1.8, 1.3, 1.6, 3, 0.15), M.gray, 0, 0.65, 0);
  add(unit, new THREE.CylinderGeometry(0.62, 0.62, 0.1, 20), M.dark, 0, 1.33, 0);
  const fan = new THREE.Group();
  fan.position.set(0, 1.42, 0);
  unit.add(fan);
  for (let i = 0; i < 4; i++) {
    const blade = add(fan, new THREE.BoxGeometry(0.95, 0.04, 0.2), M.white, 0, 0, 0, { cast: false });
    blade.rotation.y = (i / 4) * Math.PI;
  }
  colliders.push({ x: center.x - 1.6, z: center.z - 2.4, r: 1.2 });

  // Bubbles inside the glass tank
  const bubbleCount = 40;
  const bubblePos = new Float32Array(bubbleCount * 3);
  for (let i = 0; i < bubbleCount; i++) {
    bubblePos.set([(Math.random() - 0.5) * 1.4, 0.4 + Math.random() * 3, (Math.random() - 0.5) * 1.4], i * 3);
  }
  const bubbleGeo = new THREE.BufferGeometry();
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
  const bubbles = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({ color: '#e8f7ff', size: 0.14, transparent: true, opacity: 0.9, depthWrite: false }));
  bubbles.visible = false;
  tank.add(bubbles);

  // Console (faces -X toward the habitat)
  const consoleObj = buildConsole(M, { title: 'OXYGEN LEVEL', value: '85%', status: 'NORMAL', color: '#54D6AE' });
  consoleObj.group.position.set(-2.8, 0.15, 1.8);
  consoleObj.group.rotation.y = -Math.PI / 2;
  g.add(consoleObj.group);
  colliders.push({ x: center.x - 2.8, z: center.z + 1.8, r: 0.85 });

  const light = new THREE.PointLight('#9fd8ff', 0, 16, 2);
  light.position.set(-1, 4, 1);
  g.add(light);

  return {
    group: g, liquid, liquidMat, bubbles, fan, console: consoleObj, colliders, lights: [light],
    interactPoint: new THREE.Vector3(center.x - 4.4, 0, center.z + 1.8),
  };
}

// ======================================================
// Emergency shelter (dug into the hill)
// ======================================================
export function buildShelter(M, center) {
  const g = placeGroup(center.x, center.z, 0.2);
  g.name = 'shelter';
  const concrete = new THREE.MeshStandardMaterial({ color: '#8e95b8', roughness: 0.85, flatShading: true });
  add(g, new RoundedBoxGeometry(8.5, 4.2, 6.5, 3, 0.4), concrete, 0, 1.6, -0.6);
  add(g, new RoundedBoxGeometry(9.2, 0.6, 7.0, 2, 0.2), M.gray, 0, 3.75, -0.6);

  // Hazard-striped entrance frame
  const hz = hazardTexture();
  hz.repeat.set(3, 1);
  const hzMat = new THREE.MeshStandardMaterial({ map: hz, roughness: 0.7 });
  add(g, new THREE.BoxGeometry(4.0, 0.45, 0.7), hzMat, 0, 3.0, 2.75);
  add(g, new THREE.BoxGeometry(0.45, 2.8, 0.7), hzMat, -1.8, 1.4, 2.75);
  add(g, new THREE.BoxGeometry(0.45, 2.8, 0.7), hzMat, 1.8, 1.4, 2.75);
  add(g, new THREE.BoxGeometry(3.2, 2.8, 0.1), new THREE.MeshBasicMaterial({ color: '#05070f' }), 0, 1.4, 2.62, { cast: false });

  // Sliding doors
  const doorMat = new THREE.MeshStandardMaterial({ color: '#3a4577', roughness: 0.5, metalness: 0.3 });
  const doorL = add(g, new THREE.BoxGeometry(1.6, 2.75, 0.25), doorMat, -0.8, 1.4, 2.85);
  const doorR = add(g, new THREE.BoxGeometry(1.6, 2.75, 0.25), doorMat, 0.8, 1.4, 2.85);
  [doorL, doorR].forEach((d) => add(d, new THREE.BoxGeometry(0.1, 2.4, 0.05), M.yellow, d === doorL ? 0.7 : -0.7, 0, 0.14, { cast: false }));

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: signTexture('SHELTER', { icon: '🛡️', accent: '#54D6AE' }), transparent: true }));
  sign.position.set(0, 3.25, 3.12);
  g.add(sign);

  // Warning beacon on the roof
  add(g, new THREE.CylinderGeometry(0.35, 0.45, 0.35, 12), M.steel, 0, 4.25, 1.2);
  const beacon = add(g, new THREE.SphereGeometry(0.32, 14, 10), M.beacon, 0, 4.6, 1.2, { cast: false });
  const beaconLight = new THREE.PointLight('#ff4a4a', 0, 22, 2);
  beaconLight.position.set(0, 5.2, 2.0);
  g.add(beaconLight);

  return {
    group: g, doorL, doorR, beacon, beaconLight,
    colliders: [
      { x: center.x - 2.8, z: center.z - 0.4, r: 2.6 },
      { x: center.x, z: center.z - 0.9, r: 3.0 },
      { x: center.x + 2.8, z: center.z - 0.4, r: 2.6 },
      { x: center.x, z: center.z - 3.5, r: 3.0 },
    ],
    interactPoint: new THREE.Vector3(center.x, 0, center.z + 5.2),
    insidePoint: new THREE.Vector3(center.x, 0, center.z + 1.5),
  };
}

// ======================================================
// Greenhouse
// ======================================================
export function buildGreenhouse(M, center) {
  const g = placeGroup(center.x, center.z);
  g.name = 'greenhouse';
  add(g, new THREE.CylinderGeometry(4.2, 4.4, 0.6, 24), M.gray, 0, 0.3, 0);
  // Planters + plants
  for (let row = -1; row <= 1; row++) {
    add(g, new THREE.BoxGeometry(5.2 - Math.abs(row) * 1.6, 0.5, 0.9), M.dark, 0, 0.85, row * 1.5);
    for (let i = -2; i <= 2; i++) {
      if (Math.abs(row) === 1 && Math.abs(i) === 2) continue;
      const x = i * 1.0;
      const plant = add(g, new THREE.ConeGeometry(0.32, 0.9, 6), i % 2 ? M.plant : M.plantDark, x, 1.5, row * 1.5);
      plant.rotation.y = i;
      if ((i + row) % 2 === 0) add(g, new THREE.SphereGeometry(0.11, 8, 6), M.coral, x + 0.18, 1.45, row * 1.5 + 0.12, { cast: false });
    }
  }
  // Grow lights
  [-0.75, 0.75].forEach((z) => add(g, new THREE.BoxGeometry(4.6, 0.12, 0.25), M.growLight, 0, 3.0, z, { cast: false }));
  // Glass dome + ribs
  const dome = add(g, new THREE.SphereGeometry(4.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#bff5e3', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }), 0, 0.6, 0, { cast: false, receive: false });
  dome.renderOrder = 2;
  for (let i = 0; i < 4; i++) {
    const rib = add(g, new THREE.TorusGeometry(4.1, 0.06, 6, 32, Math.PI), M.white, 0, 0.6, 0, { cast: false });
    rib.rotation.y = (i / 4) * Math.PI;
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTexture('GREENHOUSE', { icon: '🌱', accent: '#54D6AE' }), transparent: true }));
  sign.position.set(-1.8, 1.0, 3.9);
  sign.rotation.y = -0.5;
  g.add(sign);
  return {
    group: g,
    colliders: [{ x: center.x, z: center.z, r: 4.5 }],
    interactPoint: new THREE.Vector3(center.x - 3.3, 0, center.z + 4.2),
  };
}

// ======================================================
// Communication antenna
// ======================================================
export function buildAntenna(M, center) {
  const g = placeGroup(center.x, center.z);
  g.name = 'antenna';
  add(g, new THREE.CylinderGeometry(1.4, 1.6, 0.4, 12), M.dark, 0, 0.2, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = add(g, new THREE.CylinderGeometry(0.07, 0.09, 6.2, 6), M.steel, Math.cos(a) * 0.6, 3.3, Math.sin(a) * 0.6);
    leg.rotation.set(Math.sin(a) * -0.09, 0, Math.cos(a) * 0.09);
  }
  for (let y = 1; y < 6; y += 1.2) add(g, new THREE.TorusGeometry(0.6 - y * 0.04, 0.04, 4, 4), M.steel, 0, y, 0, { cast: false }).rotation.x = Math.PI / 2;
  const head = new THREE.Group();
  head.position.y = 6.4;
  g.add(head);
  const dish = add(head, new THREE.SphereGeometry(1.8, 20, 8, 0, Math.PI * 2, 0, 0.9), new THREE.MeshStandardMaterial({ color: '#F7F8FF', side: THREE.DoubleSide, roughness: 0.4 }), 0, 0, 0);
  dish.rotation.x = Math.PI * 0.62;
  dish.position.set(0, 0.4, 0.6);
  add(head, new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), M.steel, 0, 0.7, -0.4).rotation.x = -1;
  const blink = add(g, new THREE.SphereGeometry(0.16, 10, 8), M.beacon, 0, 7.6, 0, { cast: false });
  return {
    group: g, head, blink,
    colliders: [{ x: center.x, z: center.z, r: 1.7 }],
    interactPoint: new THREE.Vector3(center.x + 2.4, 0, center.z),
  };
}

// ======================================================
// Bahrain flag (with a top rod, like real flags on the Moon — there's no wind!)
// ======================================================
export function buildFlag(M, center) {
  const g = placeGroup(center.x, center.z);
  g.name = 'flag';
  add(g, new THREE.CylinderGeometry(0.07, 0.08, 4.2, 8), M.steel, 0, 2.1, 0);
  add(g, new THREE.SphereGeometry(0.12, 10, 8), M.yellow, 0, 4.25, 0);
  const rod = add(g, new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), M.steel, 1.05, 4.05, 0);
  rod.rotation.z = Math.PI / 2;
  const geo = new THREE.PlaneGeometry(2.0, 1.25, 16, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    // Static crinkles (a flag on the Moon doesn't flutter in wind)
    pos.setZ(i, Math.sin(x * 4.2 + y * 1.3) * 0.06 * ((x + 1) / 2));
  }
  geo.computeVertexNormals();
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(1.05, 3.4, 0);
  flag.castShadow = true;
  g.add(flag);
  add(g, new THREE.CylinderGeometry(0.5, 0.6, 0.2, 12), M.gray, 0, 0.1, 0);
  return {
    group: g,
    colliders: [{ x: center.x, z: center.z, r: 0.6 }],
    interactPoint: new THREE.Vector3(center.x + 1, 0, center.z + 1.8),
  };
}

// ======================================================
// Landing pad + lander
// ======================================================
export function buildLandingPad(M, center) {
  const g = placeGroup(center.x, center.z);
  g.name = 'landing-pad';
  const padMat = new THREE.MeshStandardMaterial({ map: padTexture(), roughness: 0.8 });
  add(g, new THREE.CylinderGeometry(5, 5.2, 0.25, 40), [M.gray, padMat, M.gray], 0, 0.12, 0, { cast: false });
  const edgeLights = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const m = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#FFC857', emissiveIntensity: 1 });
    edgeLights.push(add(g, new THREE.BoxGeometry(0.25, 0.12, 0.25), m, Math.cos(a) * 4.8, 0.3, Math.sin(a) * 4.8, { cast: false }));
  }

  // Lander (separate group so it can fly in)
  const lander = new THREE.Group();
  lander.name = 'lander';
  add(lander, new THREE.CylinderGeometry(1.7, 2.0, 2.4, 8), M.white, 0, 2.6, 0);
  add(lander, new THREE.CylinderGeometry(1.72, 1.72, 0.3, 8, 1, true), M.purple, 0, 2.1, 0, { cast: false });
  add(lander, new THREE.CylinderGeometry(2.02, 2.02, 0.2, 8, 1, true), M.red, 0, 1.5, 0, { cast: false });
  add(lander, new THREE.CylinderGeometry(0.6, 1.6, 1.6, 8), M.white, 0, 4.6, 0);
  add(lander, new THREE.SphereGeometry(0.35, 12, 8), M.yellow, 0, 5.5, 0);
  add(lander, new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16), M.window, 0, 4.6, 1.15, { cast: false }).rotation.x = Math.PI / 2 - 0.55;
  const flagDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), new THREE.MeshStandardMaterial({ map: flagTexture() }));
  flagDecal.position.set(1.3, 2.75, 1.3);
  flagDecal.rotation.y = Math.PI / 4;
  lander.add(flagDecal);
  // Legs
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = add(lander, new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), M.steel, Math.cos(a) * 2.3, 0.9, Math.sin(a) * 2.3);
    leg.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    add(lander, new THREE.CylinderGeometry(0.4, 0.45, 0.12, 10), M.gray, Math.cos(a) * 2.8, 0.06, Math.sin(a) * 2.8);
  }
  add(lander, new THREE.CylinderGeometry(0.5, 0.8, 0.8, 10), M.steel, 0, 1.05, 0);
  // Door + ramp (toward +Z)
  add(lander, new THREE.BoxGeometry(1.1, 1.5, 0.1), M.navy, 0, 2.45, 1.9, { cast: false });
  const ramp = add(lander, new THREE.BoxGeometry(1.2, 0.1, 2.4), M.gray, 0, 1.0, 2.85);
  ramp.rotation.x = 0.55;
  // Thruster flame (only during landing)
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 2.6, 14, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  flame.rotation.x = Math.PI;
  flame.position.y = -0.5;
  flame.visible = false;
  lander.add(flame);
  lander.position.y = 0.2;
  lander.rotation.y = Math.PI; // door + ramp face the habitat
  g.add(lander);

  return {
    group: g, lander, flame, ramp, edgeLights,
    colliders: [{ x: center.x, z: center.z, r: 2.7 }],
    spawnPoint: new THREE.Vector3(center.x, 0, center.z - 6.2),
  };
}

// ======================================================
// Small props
// ======================================================
export function buildLampPost(M, x, z) {
  const g = placeGroup(x, z);
  add(g, new THREE.CylinderGeometry(0.07, 0.1, 2.6, 6), M.steel, 0, 1.3, 0);
  add(g, new RoundedBoxGeometry(0.55, 0.25, 0.55, 2, 0.06), M.gray, 0, 2.7, 0);
  add(g, new THREE.BoxGeometry(0.4, 0.1, 0.4), M.lamp, 0, 2.55, 0, { cast: false });
  return g;
}

export function buildRover(M) {
  const g = new THREE.Group();
  g.name = 'rover';
  add(g, new RoundedBoxGeometry(1.8, 0.55, 1.2, 3, 0.12), M.white, 0, 0.75, 0);
  add(g, new THREE.BoxGeometry(1.82, 0.1, 1.22), M.purple, 0, 0.62, 0);
  add(g, new THREE.BoxGeometry(1.6, 0.05, 1.0), new THREE.MeshStandardMaterial({ map: solarCellTexture(), roughness: 0.3 }), 0, 1.05, 0, { cast: false });
  add(g, new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), M.steel, 0.7, 1.4, 0);
  add(g, new RoundedBoxGeometry(0.35, 0.22, 0.25, 2, 0.05), M.gray, 0.7, 1.85, 0);
  add(g, new THREE.SphereGeometry(0.07, 8, 6), M.marker, 0.88, 1.86, 0, { cast: false });
  const wheels = [];
  [[-0.65, 0.65], [0.65, 0.65], [-0.65, -0.65], [0.65, -0.65]].forEach(([x, z]) => {
    const w = add(g, new THREE.CylinderGeometry(0.32, 0.32, 0.25, 12), M.dark, x, 0.32, z);
    w.rotation.x = Math.PI / 2;
    wheels.push(w);
  });
  return { group: g, wheels };
}

/** A flat path ribbon that follows the terrain, with glowing studs along it. */
export function buildPath(M, points, width = 1.8) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const length = curve.getLength();
  const segments = Math.max(4, Math.ceil(length * 1.5));
  const positions = [];
  const indices = [];
  const studs = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const nx = -tan.z, nz = tan.x;
    for (const side of [-1, 1]) {
      const x = p.x + nx * side * width * 0.5;
      const z = p.z + nz * side * width * 0.5;
      positions.push(x, getHeight(x, z) + 0.06, z);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const stepLen = 2.6;
  for (let d = 1; d < length; d += stepLen) {
    const t = d / length;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    for (const side of [-1, 1]) {
      const x = p.x - tan.z * side * (width * 0.5 + 0.15);
      const z = p.z + tan.x * side * (width * 0.5 + 0.15);
      studs.push([x, z]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#c6c9ee', roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.add(mesh);
  const studGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.12, 8);
  const inst = new THREE.InstancedMesh(studGeo, M.marker, studs.length);
  const dummy = new THREE.Object3D();
  studs.forEach(([x, z], i) => {
    dummy.position.set(x, getHeight(x, z) + 0.08, z);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  });
  group.add(inst);
  return { group, curve };
}

export { curveTube };
