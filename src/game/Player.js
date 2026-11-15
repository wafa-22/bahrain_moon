// Third-person playable astronaut: movement, lunar jump, collisions.
// Works on the Moon terrain and on the bonus zones (floating platforms, ice, etc.).
import * as THREE from 'three';

const WALK_SPEED = 6.5;
const GRAVITY = 7.5;      // softened "moon gravity" so jumps feel floaty
const JUMP_SPEED = 5.2;
const PLAYER_RADIUS = 0.55;
const STEP_DOWN = 0.7;    // stick to the ground when walking down slopes

export class Player {
  constructor(scene, world, astronaut) {
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'player';
    scene.add(this.group);
    this.velocity = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
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

  /** Kept for older code: height above the ground while jumping. */
  get jumpOffset() {
    const g = this.world.groundAt(this.position.x, this.position.z, this.position.y);
    return g == null ? 99 : Math.max(0, this.position.y - g);
  }

  teleport(x, z, heading = this.heading) {
    const ground = this.world.groundAt(x, z, 1e6);
    this.group.position.set(x, ground ?? 0, z);
    this.velocity.set(0, 0, 0);
    this.vy = 0;
    this.onGround = true;
    this.heading = heading;
    this.group.rotation.y = heading;
  }

  jump(sound) {
    if (this.onGround) {
      this.vy = JUMP_SPEED;
      this.onGround = false;
      this.group.position.y += 0.02;
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
    const friction = this.world.zone?.friction ?? 1; // ice is slippery!
    const accel = (target.lengthSq() > 0 ? 12 : 9) * friction;
    this.velocity.lerp(target, Math.min(1, dt * accel));

    const pos = this.group.position;
    let nx = pos.x + this.velocity.x * dt;
    let nz = pos.z + this.velocity.z * dt;
    [nx, nz] = this.resolveCollisions(nx, nz);
    pos.x = nx;
    pos.z = nz;

    // Vertical physics (ground can be terrain or a platform, or nothing at all)
    const ground = this.world.groundAt(nx, nz, pos.y);
    if (this.onGround && ground != null && this.vy <= 0 && pos.y - ground < STEP_DOWN) {
      pos.y = ground;
      this.vy = 0;
    } else {
      this.vy -= GRAVITY * dt;
      pos.y += this.vy * dt;
      if (ground != null && pos.y <= ground) {
        pos.y = ground;
        this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    }

    // Face movement direction smoothly
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.3) {
      const want = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = want - this.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.heading += diff * Math.min(1, dt * 12);
    }
    this.group.rotation.y = this.heading;

    const airborne = !this.onGround && (ground == null || pos.y - ground > 0.15);
    this.astronaut.update(dt, { speed: Math.min(1, speed / WALK_SPEED), airborne });
  }

  resolveCollisions(x, z) {
    const all = this.world.activeColliders.concat(this.extraColliders);
    for (let pass = 0; pass < 2; pass++) {
      for (const c of all) {
        if (!c.r) continue;
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
    // Stay inside the play area on the Moon
    const r = this.world.playRadius;
    const d = Math.hypot(x, z);
    if (d > r) { x *= r / d; z *= r / d; }
    return [x, z];
  }
}
