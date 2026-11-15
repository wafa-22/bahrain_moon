// The 3D lunar world: terrain, sky, lunar base, lighting — and every visual
// reaction to the player's code (panels turning, lights, oxygen, storm, doors).
import * as THREE from 'three';
import { buildTerrain, buildRocks, getHeight, FLAT_SPOTS, PLAY_RADIUS } from '../world/terrain.js';
import { buildSky, SUN_DIRECTION } from '../world/sky.js';
import {
  makeMaterials, buildHabitat, buildSolarStation, buildOxygenStation, buildShelter,
  buildGreenhouse, buildAntenna, buildFlag, buildLandingPad, buildLampPost, buildRover,
  buildPath, curveTube,
} from '../world/structures.js';
import { Bursts, DustMotes, StormParticles, EnergyFlow, ObjectiveBeacon } from '../world/effects.js';
import { Ease, lerp } from '../utils/Tween.js';

export const LOCATIONS = {
  habitat: new THREE.Vector3(0, 0, 0),
  solar: new THREE.Vector3(-22, 0, -6),
  oxygen: new THREE.Vector3(20, 0, -4),
  shelter: new THREE.Vector3(0, 0, -27),
  greenhouse: new THREE.Vector3(17, 0, 16),
  antenna: new THREE.Vector3(-18, 0, 15),
  flag: new THREE.Vector3(6, 0, 13),
  pad: new THREE.Vector3(0, 0, 21),
};

const PATHS = [
  [[0, 7.2], [0, 12], [0, 16.5]],
  [[-1.5, 8], [-6, 8.6], [-11, 5], [-13.1, 0], [-13.1, -3.4]],
  [[1.5, 8], [6, 8.6], [12, 5], [15.5, 0.5], [15.6, -2.2]],
  [[0, -7.2], [0, -15], [0, -21.6]],
  [[2.5, 8.6], [8.5, 11.5], [13.4, 19.4]],
  [[-2.5, 8.6], [-9, 11], [-15.4, 15]],
];

export class World {
  constructor(scene, tweens, sound) {
    this.scene = scene;
    this.tweens = tweens;
    this.sound = sound;
    this.time = 0;
    this.colliders = [];
    this.stormLevel = 0;
    this.stormActive = false;
    this.powerOn = false;
    this.oxygenBackup = false;
    this.build();
  }

  build() {
    const M = (this.materials = makeMaterials());
    const scene = this.scene;

    // ---- Lights ----
    this.hemi = new THREE.HemisphereLight('#9aa8ff', '#4a3d78', 0.85);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    this.fill = new THREE.DirectionalLight('#8f7dff', 0.5);
    this.fill.position.set(-30, 20, -20);
    scene.add(this.fill);
    scene.fog = new THREE.Fog('#1f1d55', 70, 210);
    this.baseColors = {
      sun: new THREE.Color('#fff1d6'), sunStorm: new THREE.Color('#ff9a5c'),
      hemi: new THREE.Color('#9aa8ff'), hemiStorm: new THREE.Color('#ff8f7a'),
      fog: new THREE.Color('#1f1d55'), fogStorm: new THREE.Color('#5a2340'),
    };

    // ---- Sky & ground ----
    this.sky = buildSky();
    scene.add(this.sky.group);
    this.terrain = buildTerrain();
    scene.add(this.terrain);

    // ---- Paths ----
    this.pathPoints = [];
    this.paths = PATHS.map((pts) => {
      const p = buildPath(M, pts);
      scene.add(p.group);
      for (let t = 0; t <= 1; t += 0.02) this.pathPoints.push(p.curve.getPointAt(t));
      return p;
    });

    // ---- Buildings ----
    this.habitat = buildHabitat(M);
    this.solar = buildSolarStation(M, LOCATIONS.solar);
    this.oxygen = buildOxygenStation(M, LOCATIONS.oxygen);
    this.shelter = buildShelter(M, LOCATIONS.shelter);
    this.greenhouse = buildGreenhouse(M, LOCATIONS.greenhouse);
    this.antenna = buildAntenna(M, LOCATIONS.antenna);
    this.flag = buildFlag(M, LOCATIONS.flag);
    this.pad = buildLandingPad(M, LOCATIONS.pad);
    for (const b of [this.habitat, this.solar, this.oxygen, this.shelter, this.greenhouse, this.antenna, this.flag, this.pad]) {
      scene.add(b.group);
      this.colliders.push(...b.colliders);
    }
    this.cameraBlockers = [this.habitat.group, this.solar.group, this.oxygen.group, this.shelter.group, this.greenhouse.group, this.antenna.group, this.pad.lander];
    this.pointLights = [...this.habitat.lights, ...this.solar.lights, ...this.oxygen.lights];

    // Power cable from the batteries to the habitat, oxygen pipe from the station
    const cable = curveTube([[-15.8, -8.4], [-13, -7], [-9, -4.5], [-6.3, -2.2]], 0.09, M.cable, 0.12);
    scene.add(cable.mesh);
    this.cableFlow = new EnergyFlow(scene, cable.curve, '#FFC857', 6);
    const pipe = curveTube([[18.2, -5.5], [14, -5], [10, -3.4], [6.4, -1.6]], 0.14, M.pipe, 0.45);
    scene.add(pipe.mesh);
    this.pipeFlow = new EnergyFlow(scene, pipe.curve, '#9fe3ff', 6);

    // Lamp posts along the paths
    const lampSpots = [[-2.2, 12.2], [3.4, 10.4], [-8.5, 7.2], [-13, 2.2], [8.5, 7.2], [13.8, 2.6], [1.6, -11], [-1.6, -18.5], [10, 13.6], [-11.5, 13.5]];
    lampSpots.forEach(([x, z]) => {
      scene.add(buildLampPost(M, x, z));
      this.colliders.push({ x, z, r: 0.35 });
    });

    // Rocks (kept away from buildings and paths)
    const rocks = buildRocks((x, z, r) => this.isBlocked(x, z, r));
    scene.add(rocks.mesh);
    this.colliders.push(...rocks.colliders);

    // Rover driving around the base
    this.rover = buildRover(M);
    scene.add(this.rover.group);
    this.roverAngle = 0.8;

    // Effects
    this.bursts = new Bursts(scene);
    this.dust = new DustMotes(scene);
    this.storm = new StormParticles(scene);
    this.beacon = new ObjectiveBeacon(scene);
  }

  isBlocked(x, z, r) {
    for (const s of FLAT_SPOTS) if (Math.hypot(x - s.x, z - s.z) < s.r + r + 1) return true;
    for (const p of this.pathPoints) if (Math.hypot(x - p.x, z - p.z) < 1.6 + r) return true;
    return false;
  }

  heightAt(x, z) { return getHeight(x, z); }
  get playRadius() { return PLAY_RADIUS; }

  // ======================================================
  // Mission 01 — Power
  // ======================================================

  /** "Inspect Solar Panels": a scanner beam sweeps the array and dust is brushed off. */
  async scanPanels() {
    const { scan, cellMat } = this.solar;
    scan.visible = true;
    this.sound.whoosh();
    const dusty = new THREE.Color('#8d8494'), clean = new THREE.Color('#ffffff');
    await this.tweens.add({
      duration: 1.3,
      update: (k) => {
        scan.position.x = lerp(-7.5, 7.5, k);
        cellMat.color.copy(dusty).lerp(clean, k);
      },
    });
    scan.visible = false;
    this.solar.panels.forEach((p) => this.bursts.spawn(p.getWorldPosition(new THREE.Vector3()), { color: '#d8d0ff', count: 14, speed: 2, size: 0.35, life: 1 }));
    this.solar.console.display.show({ title: 'SOLAR ARRAY', value: 'CHECKED', status: 'PANELS CLEAN ✓', color: '#54D6AE' });
  }

  /** "Activate Solar Panels": panels unfold toward the Sun and start glowing. */
  async activateSolar(instant = false) {
    const { panels, cellMat } = this.solar;
    if (instant) {
      panels.forEach((p) => { p.rotation.z = -0.55; });
      cellMat.emissiveIntensity = 0.9;
      cellMat.color.set('#ffffff');
      return;
    }
    this.sound.powerUp();
    const jobs = panels.map((p, i) => this.tweens.add({
      duration: 1.2, delay: i * 0.12, ease: Ease.back,
      update: (k) => { p.rotation.z = lerp(1.15, -0.55, k); },
    }));
    jobs.push(this.tweens.add({ duration: 1.8, update: (k) => { cellMat.emissiveIntensity = lerp(0.02, 0.9, k); } }));
    await Promise.all(jobs);
    panels.forEach((p) => this.bursts.spawn(p.getWorldPosition(new THREE.Vector3()), { color: '#54B8F5', count: 24, speed: 3, size: 0.45 }));
    this.solar.console.display.show({ title: 'SOLAR ARRAY', value: 'ACTIVE', status: 'MAKING POWER ☀', color: '#FFC857' });
  }

  /** "Connect Panels to Battery": energy flows through the cable, batteries charge. */
  async connectPower(instant = false) {
    const { batteries } = this.solar;
    this.materials.cable.emissiveIntensity = 1.4;
    this.cableFlow.setActive(true);
    if (instant) {
      batteries.forEach((b) => { b.scale.y = 1; });
      this.solar.console.display.show({ title: 'POWER', value: '95%', status: 'ONLINE ✓', color: '#54D6AE' });
      return;
    }
    await this.tweens.add({ duration: 1.4, update: (k) => batteries.forEach((b) => { b.scale.y = lerp(0.3, 1, k); }) });
    this.solar.console.display.show({ title: 'POWER', value: '95%', status: 'ONLINE ✓', color: '#54D6AE' });
  }

  /** Turn the base's lights, windows, path markers and grow lights on/off. */
  setBasePower(on, instant = false) {
    this.powerOn = on;
    const M = this.materials;
    const targets = on
      ? { window: 1.6, lamp: 2.4, marker: 1.4, grow: 1.6, light: 22 }
      : { window: 0.12, lamp: 0.08, marker: 0.15, grow: 0.05, light: 0 };
    const from = { window: M.window.emissiveIntensity, lamp: M.lamp.emissiveIntensity, marker: M.marker.emissiveIntensity, grow: M.growLight.emissiveIntensity, light: this.pointLights[0].intensity };
    const apply = (k) => {
      M.window.emissiveIntensity = lerp(from.window, targets.window, k);
      M.lamp.emissiveIntensity = lerp(from.lamp, targets.lamp, k);
      M.marker.emissiveIntensity = lerp(from.marker, targets.marker, k);
      M.growLight.emissiveIntensity = lerp(from.grow, targets.grow, k);
      this.pointLights.forEach((l) => { l.intensity = lerp(from.light, targets.light, k); });
    };
    if (instant) { apply(1); return Promise.resolve(); }
    // Flicker on like real lights
    return this.tweens.add({ duration: 1.6, ease: Ease.linear, update: (k) => apply(k < 0.5 ? (Math.random() > 0.4 ? k : 0) : k) });
  }

  resetPower() {
    const { panels, cellMat, batteries, console: c } = this.solar;
    panels.forEach((p) => { p.rotation.z = 1.15; });
    cellMat.emissiveIntensity = 0.02;
    cellMat.color.set('#8d8494');
    batteries.forEach((b) => { b.scale.y = 0.3; });
    this.materials.cable.emissiveIntensity = 0;
    this.cableFlow.setActive(false);
    c.display.show({ title: 'SOLAR ARRAY', value: '30%', status: 'POWER LOW', color: '#F25F6C' });
    this.setBasePower(false, true);
  }

  // ======================================================
  // Mission 02 — Oxygen
  // ======================================================
  setOxygenScreen(value, status, color) {
    this.oxygen.console.display.show({ title: 'OXYGEN LEVEL', value: `${value}%`, status, color });
  }

  async activateOxygen(instant = false) {
    this.oxygenBackup = true;
    const { liquid, liquidMat, bubbles } = this.oxygen;
    bubbles.visible = true;
    this.materials.pipe.emissiveIntensity = 1.2;
    this.pipeFlow.setActive(true);
    if (instant) { liquid.scale.y = 1; liquidMat.emissiveIntensity = 1.1; return; }
    this.sound.powerUp();
    await this.tweens.add({
      duration: 2.2,
      update: (k) => { liquid.scale.y = lerp(0.2, 1, k); liquidMat.emissiveIntensity = lerp(0.25, 1.1, k); },
    });
    this.bursts.spawn(this.oxygen.group.position.clone().add(new THREE.Vector3(1.4, 4.5, -1.2)), { color: '#9fe3ff', count: 50, speed: 4 });
  }

  resetOxygen() {
    this.oxygenBackup = false;
    const { liquid, liquidMat, bubbles } = this.oxygen;
    liquid.scale.y = 0.2;
    liquidMat.emissiveIntensity = 0.25;
    bubbles.visible = false;
    this.materials.pipe.emissiveIntensity = 0;
    this.pipeFlow.setActive(false);
    this.setOxygenScreen(85, 'NORMAL', '#54D6AE');
  }

  // ======================================================
  // Mission 03 — Solar storm
  // ======================================================
  setStorm(active, duration = 2.5) {
    this.stormActive = active;
    const from = this.stormLevel;
    const to = active ? 1 : 0;
    if (duration <= 0) { this.applyStorm(to); return Promise.resolve(); }
    return this.tweens.add({ duration, update: (k) => this.applyStorm(lerp(from, to, k)) });
  }

  applyStorm(level) {
    this.stormLevel = level;
    this.sky.skyMat.uniforms.uStorm.value = level;
    this.storm.level = level;
    const c = this.baseColors;
    this.sun.color.copy(c.sun).lerp(c.sunStorm, level);
    this.hemi.color.copy(c.hemi).lerp(c.hemiStorm, level * 0.6);
    this.scene.fog.color.copy(c.fog).lerp(c.fogStorm, level);
  }

  setShelterDoors(open, instant = false) {
    const { doorL, doorR } = this.shelter;
    const fromL = doorL.position.x;
    const toL = open ? -2.05 : -0.8;
    const apply = (k) => {
      doorL.position.x = lerp(fromL, toL, k);
      doorR.position.x = -doorL.position.x;
    };
    // Open doors stop blocking the entrance
    this.shelterOpen = open;
    if (instant) { apply(1); return Promise.resolve(); }
    this.sound.door();
    return this.tweens.add({ duration: 1.3, update: apply });
  }

  /** Put the world into the visual state that matches how many missions are done. */
  applyProgress(completed) {
    this.resetPower();
    this.resetOxygen();
    this.setStorm(false, 0);
    this.setShelterDoors(false, true);
    if (completed >= 1) {
      this.activateSolar(true);
      this.connectPower(true);
      this.setBasePower(true, true);
    }
    if (completed >= 2) {
      this.activateOxygen(true);
      this.setOxygenScreen(92, 'BACKUP READY ✓', '#54D6AE');
    }
  }

  // ======================================================
  // Per-frame update
  // ======================================================
  update(dt, focus) {
    this.time += dt;
    const t = this.time;
    this.sky.update(dt, t);

    // Sun + shadows follow the player so shadows stay crisp
    this.sun.position.copy(focus).addScaledVector(SUN_DIRECTION, 70);
    this.sun.target.position.copy(focus);

    // Rover patrol
    this.roverAngle += dt * 0.07;
    const r = 33;
    const rx = Math.cos(this.roverAngle) * r, rz = Math.sin(this.roverAngle) * r;
    this.rover.group.position.set(rx, getHeight(rx, rz), rz);
    this.rover.group.rotation.y = -this.roverAngle;
    this.rover.wheels.forEach((w) => { w.rotation.y += dt * 5; });

    // Blinking lights
    const blink = (Math.sin(t * 3) + 1) / 2;
    this.antenna.head.rotation.y = Math.sin(t * 0.3) * 1.2;
    this.antenna.blink.material.emissiveIntensity = 0.3 + blink * 2;
    this.pad.edgeLights.forEach((m, i) => {
      m.material.emissiveIntensity = ((Math.floor(t * 8) % 16) === i) ? 3 : 0.5;
    });
    this.oxygen.fan.rotation.y += dt * (this.oxygenBackup ? 14 : 3);

    // Beacons: calm pulse normally, fast red flashing during the storm
    const storm = this.stormActive;
    const flash = storm ? (Math.sin(t * 12) > 0 ? 4 : 0.3) : 0.4 + blink * 0.8;
    this.materials.beacon.emissiveIntensity = flash;
    this.shelter.beaconLight.intensity = storm ? (Math.sin(t * 12) > 0 ? 40 : 0) : 0;

    // Bubbles rise in the backup oxygen tank
    if (this.oxygen.bubbles.visible) {
      const arr = this.oxygen.bubbles.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += dt * (0.8 + (i % 7) * 0.12);
        if (arr[i + 1] > 3.5) arr[i + 1] = 0.4;
      }
      this.oxygen.bubbles.geometry.attributes.position.needsUpdate = true;
    }

    // Consoles' floor rings pulse
    const ringPulse = 0.35 + blink * 0.45;
    this.solar.console.ring.material.opacity = ringPulse;
    this.oxygen.console.ring.material.opacity = ringPulse;

    this.cableFlow.update(dt);
    this.pipeFlow.update(dt);
    this.bursts.update(dt);
    this.dust.update(dt, focus, t);
    this.storm.update(dt, focus);
    this.beacon.update(dt);
  }
}
