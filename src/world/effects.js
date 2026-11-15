// Visual effects: sparkle bursts, storm particles, energy pulses, beacon marker.
import * as THREE from 'three';
import { glowTexture } from '../utils/textures.js';

const sparkTex = glowTexture('#ffffff');

/** Short-lived sparkle bursts (success effects). */
export class Bursts {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  spawn(position, { color = '#FFC857', count = 60, speed = 5, life = 1.4, size = 0.5, up = 3 } = {}) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      pos.set([position.x, position.y, position.z], i * 3);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize();
      vel.push(dir.multiplyScalar(speed * (0.4 + Math.random() * 0.8)).add(new THREE.Vector3(0, up * Math.random(), 0)));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: sparkTex, color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.active.push({ points, vel, age: 0, life });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      b.age += dt;
      const arr = b.points.geometry.attributes.position.array;
      b.vel.forEach((v, j) => {
        v.y -= 1.62 * dt * 2; // lunar gravity (exaggerated a little)
        arr[j * 3] += v.x * dt;
        arr[j * 3 + 1] += v.y * dt;
        arr[j * 3 + 2] += v.z * dt;
      });
      b.points.geometry.attributes.position.needsUpdate = true;
      b.points.material.opacity = Math.max(0, 1 - b.age / b.life);
      if (b.age >= b.life) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        b.points.material.dispose();
        this.active.splice(i, 1);
      }
    }
  }
}

/** Floating moon dust motes around the player (subtle life in the scene). */
export class DustMotes {
  constructor(scene, count = 220) {
    const geo = new THREE.BufferGeometry();
    this.count = count;
    this.pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this.pos.set([(Math.random() - 0.5) * 40, Math.random() * 6, (Math.random() - 0.5) * 40], i * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: sparkTex, size: 0.18, color: '#d8d0ff', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(dt, center, time) {
    for (let i = 0; i < this.count; i++) {
      let x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
      y += Math.sin(time + i) * dt * 0.1;
      x += dt * 0.15;
      if (x - center.x > 20) x -= 40; else if (x - center.x < -20) x += 40;
      if (z - center.z > 20) z -= 40; else if (z - center.z < -20) z += 40;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

/** High-energy particle streaks shown during the solar storm. */
export class StormParticles {
  constructor(scene, count = 500) {
    this.count = count;
    this.level = 0;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 6);
    this.offsets = [];
    for (let i = 0; i < count; i++) this.offsets.push(new THREE.Vector3((Math.random() - 0.5) * 70, Math.random() * 30, (Math.random() - 0.5) * 70));
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.LineBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.lines = new THREE.LineSegments(geo, this.mat);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    scene.add(this.lines);
    this.dir = new THREE.Vector3(-0.55, -0.62, -0.3).normalize(); // coming from the Sun
  }

  update(dt, center) {
    this.lines.visible = this.level > 0.01;
    if (!this.lines.visible) return;
    this.mat.opacity = this.level * 0.75;
    const speed = 38;
    for (let i = 0; i < this.count; i++) {
      const o = this.offsets[i];
      o.addScaledVector(this.dir, speed * dt);
      if (o.y < -2) o.set((Math.random() - 0.5) * 70 + 18, 28 + Math.random() * 6, (Math.random() - 0.5) * 70 + 10);
      const x = center.x + o.x, y = o.y, z = center.z + o.z;
      this.pos.set([x, y, z, x - this.dir.x * 1.8, y - this.dir.y * 1.8, z - this.dir.z * 1.8], i * 6);
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }
}

/** Glowing orbs travelling along a curve (electricity in cables, air in pipes). */
export class EnergyFlow {
  constructor(parent, curve, color, count = 5) {
    this.curve = curve;
    this.active = false;
    this.t = 0;
    this.orbs = [];
    const mat = new THREE.SpriteMaterial({ map: sparkTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(0.7);
      s.visible = false;
      parent.add(s);
      this.orbs.push(s);
    }
  }

  setActive(on) {
    this.active = on;
    this.orbs.forEach((o) => { o.visible = on; });
  }

  update(dt) {
    if (!this.active) return;
    this.t = (this.t + dt * 0.25) % 1;
    this.orbs.forEach((o, i) => {
      const t = (this.t + i / this.orbs.length) % 1;
      o.position.copy(this.curve.getPointAt(t));
    });
  }
}

/** Tall glowing beacon + bouncing arrow marking the current objective. */
export class ObjectiveBeacon {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.0, 40, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: '#FFC857', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    beam.position.y = 20;
    this.group.add(beam);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.3, 1.65, 40),
      new THREE.MeshBasicMaterial({ color: '#FFC857', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.12;
    this.group.add(this.ring);
    this.arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.9, 4),
      new THREE.MeshStandardMaterial({ color: '#FFC857', emissive: '#FFC857', emissiveIntensity: 1.5 }),
    );
    this.arrow.rotation.x = Math.PI;
    this.group.add(this.arrow);
    scene.add(this.group);
    this.time = 0;
  }

  setTarget(position, color = '#FFC857') {
    if (!position) { this.group.visible = false; return; }
    this.group.visible = true;
    this.group.position.copy(position);
    this.group.children.forEach((c) => {
      if (c.material?.color) c.material.color.set(color);
      if (c.material?.emissive) c.material.emissive.set(color);
    });
  }

  update(dt) {
    if (!this.group.visible) return;
    this.time += dt;
    this.arrow.position.y = 3.6 + Math.sin(this.time * 3) * 0.35;
    this.arrow.rotation.y += dt * 2;
    const s = 1 + Math.sin(this.time * 4) * 0.08;
    this.ring.scale.set(s, s, s);
  }
}
