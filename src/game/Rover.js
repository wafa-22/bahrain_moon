// The drivable Bahrain Lunar Rover: model + simple arcade physics.
// Forward of the rover is +Z in its own space; heading h means forward = (sin h, cos h).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { flagTexture, signTexture } from '../utils/textures.js';

const MAX_SPEED = 13;
const MAX_REVERSE = 5;
const ACCEL = 9;
const BRAKE = 16;
const DRAG = 3.5;
const TURN_RATE = 1.9;
const RADIUS = 1.8;

function m(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...o }); }

export class Rover {
  constructor(world, parkAt, heading = Math.PI) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'bahrain-rover';
    this.body = new THREE.Group();          // tilts with the terrain
    this.group.add(this.body);
    this.speed = 0;
    this.heading = heading;
    this.driving = false;
    this.bounce = 0;
    this.bounceV = 0;
    this.wheels = [];
    this.build();
    this.collider = { x: parkAt.x, z: parkAt.z, r: RADIUS };
    world.colliders.push(this.collider);
    this.park = { x: parkAt.x, z: parkAt.z, heading };
    this.placeAt(parkAt.x, parkAt.z, heading);
  }

  build() {
    const white = m('#F7F8FF');
    const purple = m('#6046C8');
    const red = m('#CE1126');
    const dark = m('#2a3157');
    const b = this.body;
    const add = (geo, mat, x, y, z) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      b.add(mesh);
      return mesh;
    };
    // Chassis
    add(new RoundedBoxGeometry(2.3, 0.55, 3.4, 3, 0.18), white, 0, 0.95, 0);
    add(new THREE.BoxGeometry(2.34, 0.12, 3.44), purple, 0, 0.8, 0);
    add(new THREE.BoxGeometry(2.36, 0.08, 3.46), red, 0, 1.15, 0);
    // Seats + dashboard
    add(new RoundedBoxGeometry(0.9, 0.5, 0.8, 2, 0.12), dark, 0, 1.42, -0.35);
    add(new RoundedBoxGeometry(0.9, 0.9, 0.18, 2, 0.06), dark, 0, 1.75, -0.78);
    const dash = add(new RoundedBoxGeometry(1.6, 0.35, 0.45, 2, 0.08), m('#172448'), 0, 1.38, 0.95);
    dash.rotation.x = -0.3;
    add(new THREE.BoxGeometry(0.5, 0.18, 0.05), m('#54D6AE', { emissive: '#54D6AE', emissiveIntensity: 1.5 }), 0, 1.5, 1.12).rotation.x = -0.3;
    // Steering wheel
    const wheel = add(new THREE.TorusGeometry(0.2, 0.035, 8, 20), dark, 0, 1.68, 0.62);
    wheel.rotation.x = -0.9;
    // Solar panel roof at the back
    const panel = add(new THREE.BoxGeometry(2.0, 0.06, 1.0), m('#2847b8', { emissive: '#3a7bff', emissiveIntensity: 0.4, metalness: 0.4 }), 0, 2.45, -1.15);
    panel.rotation.x = 0.15;
    [-0.85, 0.85].forEach((x) => add(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), m('#8d97b8'), x, 1.85, -1.3));
    // Headlights
    this.lightMat = m('#fff4d0', { emissive: '#FFE08A', emissiveIntensity: 0.4 });
    [-0.75, 0.75].forEach((x) => add(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 14), this.lightMat, x, 1.0, 1.72).rotation.x = Math.PI / 2);
    // Bahrain flag on a pole
    add(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), m('#8d97b8'), -0.95, 2.2, -1.55);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
    flag.position.set(-0.6, 2.75, -1.55);
    b.add(flag);
    // Side sign
    [-1, 1].forEach((side) => {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.3), new THREE.MeshBasicMaterial({ map: signTexture('BAHRAIN ROVER', { icon: '🚙', height: 96 }), transparent: true }));
      sign.position.set(side * 1.18, 0.95, 0);
      sign.rotation.y = side * Math.PI / 2;
      b.add(sign);
    });
    // Wheels
    const tire = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 16);
    const hub = new THREE.CylinderGeometry(0.25, 0.25, 0.44, 10);
    [[-1.25, 1.15], [1.25, 1.15], [-1.25, -1.15], [1.25, -1.15]].forEach(([x, z]) => {
      const w = new THREE.Group();
      w.position.set(x, 0.55, z);
      const t = new THREE.Mesh(tire, m('#3a3f66', { roughness: 0.9 }));
      t.rotation.z = Math.PI / 2;
      t.castShadow = true;
      const h = new THREE.Mesh(hub, m('#FFC857'));
      h.rotation.z = Math.PI / 2;
      w.add(t, h);
      // tread bumps make the spin visible
      for (let i = 0; i < 6; i++) {
        const bump = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.16), m('#2a2f50'));
        const a = (i / 6) * Math.PI * 2;
        bump.position.set(0, Math.cos(a) * 0.55, Math.sin(a) * 0.55);
        bump.rotation.x = a;
        w.add(bump);
      }
      this.body.add(w);
      this.wheels.push(w);
    });
    // Seat position (where the driver sits), in body space
    this.seat = new THREE.Object3D();
    this.seat.position.set(0, 1.05, -0.3);
    this.body.add(this.seat);
  }

  get position() { return this.group.position; }

  placeAt(x, z, heading = this.heading) {
    this.heading = heading;
    this.speed = 0;
    this.group.position.set(x, 0, z);
    this.collider.x = x;
    this.collider.z = z;
    this.updateTilt(0);
  }

  reset() { this.placeAt(this.park.x, this.park.z, this.park.heading); }

  setDriving(on) {
    this.driving = on;
    this.lightMat.emissiveIntensity = on ? 2.5 : 0.4;
    if (!on) this.speed = 0;
  }

  /** @param {{x:number, z:number}} move  x = steer (right +), z = throttle (forward +) */
  update(dt, move) {
    if (this.driving) {
      const throttle = move.z;
      if (throttle > 0) this.speed += (this.speed < 0 ? BRAKE : ACCEL) * throttle * dt;
      else if (throttle < 0) this.speed += (this.speed > 0 ? -BRAKE : -ACCEL * 0.7) * -throttle * dt;
      else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), DRAG * dt);
      this.speed = Math.max(-MAX_REVERSE, Math.min(MAX_SPEED, this.speed));
      // Steering works better at speed, and flips when reversing
      const steerAmount = Math.min(1, Math.abs(this.speed) / 3) * Math.sign(this.speed || 1);
      this.heading -= move.x * TURN_RATE * steerAmount * dt;
    }

    const p = this.group.position;
    let nx = p.x + Math.sin(this.heading) * this.speed * dt;
    let nz = p.z + Math.cos(this.heading) * this.speed * dt;
    // Collide with buildings and rocks (but not with ourselves)
    let hit = false;
    for (const c of this.world.activeColliders) {
      if (c === this.collider || !c.r) continue;
      const dx = nx - c.x, dz = nz - c.z;
      const min = c.r + RADIUS;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.001;
        nx = c.x + (dx / d) * min;
        nz = c.z + (dz / d) * min;
        hit = true;
      }
    }
    const r = this.world.playRadius;
    const dist = Math.hypot(nx, nz);
    if (dist > r) { nx *= r / dist; nz *= r / dist; hit = true; }
    if (hit) { this.speed *= 0.5; }
    p.x = nx; p.z = nz;
    this.collider.x = nx; this.collider.z = nz;

    this.updateTilt(dt);
    const spin = (this.speed * dt) / 0.55;
    this.wheels.forEach((w) => { w.rotation.x += spin; });
  }

  /** Follow the craters: pitch/roll from the terrain under the wheels, plus a little suspension bounce. */
  updateTilt(dt) {
    const p = this.group.position;
    const h = this.world.heightAt.bind(this.world);
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    const front = h(p.x + fx * 1.3, p.z + fz * 1.3);
    const back = h(p.x - fx * 1.3, p.z - fz * 1.3);
    // (rx, rz) is the rover's local +X axis, which is its LEFT side
    const left = h(p.x + rx * 1.1, p.z + rz * 1.1);
    const right = h(p.x - rx * 1.1, p.z - rz * 1.1);
    const ground = (front + back + left + right) / 4;
    if (dt > 0) {
      // Spring toward the ground; bumps make it bounce a bit (low gravity!)
      const target = ground;
      const prev = this.lastGround ?? ground;
      this.bounceV += (prev - ground) * -2 * Math.min(1, Math.abs(this.speed) / 6);
      this.bounceV += (-this.bounce * 40 - this.bounceV * 6) * dt;
      this.bounce += this.bounceV * dt;
      this.bounce = Math.max(-0.25, Math.min(0.5, this.bounce));
      p.y = target + this.bounce;
    } else {
      p.y = ground;
    }
    this.lastGround = ground;
    this.group.rotation.set(0, this.heading, 0);
    this.body.rotation.x = Math.atan2(back - front, 2.6);
    this.body.rotation.z = Math.atan2(left - right, 2.2);
  }

  /** World position + heading of the driver's seat. */
  seatTransform(target) {
    this.seat.getWorldPosition(target);
    return target;
  }
}
