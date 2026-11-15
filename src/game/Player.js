// Third-person playable astronaut: movement, lunar jump, collisions.
import * as THREE from 'three';

const WALK_SPEED = 6.5;
const GRAVITY = 7.5;      // softened "moon gravity" so jumps feel floaty
const JUMP_SPEED = 5.2;
const PLAYER_RADIUS = 0.55;

export class Player {
  constructor(scene, world, astronaut) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'player';
    scene.add(this.group);
    this.velocity = new THREE.Vector3();
    this.vy = 0;
    this.jumpOffset = 0;
    this.heading = 0;
    this.extraColliders = [];   // NPCs etc.
    this.setAstronaut(astronaut);
  }

  setAstronaut(astronaut) {
    if (this.astronaut) this.group.remove(this.astronaut.group);
    this.astronaut = astronaut;
    this.group.add(astronaut.group);
  }

  get position() { return this.group.position; }

  teleport(x, z, heading = this.heading) {
    this.group.position.set(x, this.world.heightAt(x, z), z);
    this.velocity.set(0, 0, 0);
    this.vy = 0;
    this.jumpOffset = 0;
    this.heading = heading;
    this.group.rotation.y = heading;
  }

  jump(sound) {
    if (this.jumpOffset <= 0.001) {
      this.vy = JUMP_SPEED;
      sound?.jump();
    }
  }

  /**
   * @param {number} dt
   * @param {{x:number,z:number}} move  input direction (camera-relative)
   * @param {number} cameraYaw
   */
  update(dt, move, cameraYaw) {
    // Camera-relative movement: forward = away from the camera
    const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw);
    const rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);
    const target = new THREE.Vector3(fx * move.z + rx * move.x, 0, fz * move.z + rz * move.x).multiplyScalar(WALK_SPEED);
    const accel = target.lengthSq() > 0 ? 12 : 9;
    this.velocity.lerp(target, Math.min(1, dt * accel));

    const pos = this.group.position;
    let nx = pos.x + this.velocity.x * dt;
    let nz = pos.z + this.velocity.z * dt;
    [nx, nz] = this.resolveCollisions(nx, nz);
    pos.x = nx;
    pos.z = nz;

    // Jump physics
    this.vy -= GRAVITY * dt;
    this.jumpOffset = Math.max(0, this.jumpOffset + this.vy * dt);
    if (this.jumpOffset === 0) this.vy = 0;
    pos.y = this.world.heightAt(nx, nz) + this.jumpOffset;

    // Face movement direction smoothly
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.3) {
      const want = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = want - this.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.heading += diff * Math.min(1, dt * 12);
    }
    this.group.rotation.y = this.heading;

    this.astronaut.update(dt, { speed: Math.min(1, speed / WALK_SPEED), airborne: this.jumpOffset > 0.15 });
  }

  resolveCollisions(x, z) {
    const all = this.world.colliders.concat(this.extraColliders);
    for (let pass = 0; pass < 2; pass++) {
      for (const c of all) {
        const dx = x - c.x, dz = z - c.z;
        const min = c.r + PLAYER_RADIUS;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 0.0001;
          x = c.x + (dx / d) * min;
          z = c.z + (dz / d) * min;
        }
      }
    }
    // Stay inside the play area
    const r = this.world.playRadius;
    const d = Math.hypot(x, z);
    if (d > r) { x *= r / d; z *= r / d; }
    return [x, z];
  }
}
