// Comfortable third-person follow camera. Drag the mouse to orbit, scroll to zoom.
import * as THREE from 'three';
import { clamp } from '../utils/Tween.js';

export class CameraController {
  constructor(camera, dom, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = 0;          // 0 = camera behind the player looking toward -Z
    this.pitch = 0.32;
    this.distance = 8.5;
    this.enabled = false;
    this.target = new THREE.Vector3();
    this.current = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.dragging = false;
    this.followYaw = null;  // function returning a yaw to follow (used when driving)
    this.raycaster = new THREE.Raycaster();
    this.raycaster.camera = camera;
    this.blocked = false;

    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.dragging = true;
      this.lastX = e.clientX; this.lastY = e.clientY;
      dom.setPointerCapture?.(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.enabled || !this.dragging) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      this.yaw -= dx * 0.006;
      this.pitch = clamp(this.pitch + dy * 0.004, 0.05, 1.1);
    });
    const stop = () => { this.dragging = false; };
    dom.addEventListener('pointerup', stop);
    dom.addEventListener('pointercancel', stop);
    dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.distance = clamp(this.distance + Math.sign(e.deltaY) * 0.8, 4.5, 16);
    }, { passive: true });
  }

  /** Jump straight to the follow position (no smoothing) — used after cutscenes. */
  snap(focus) {
    this.computeTarget(focus);
    this.current.copy(this.target);
    this.lookAt.copy(focus).add(new THREE.Vector3(0, 1.6, 0));
    this.camera.position.copy(this.current);
    this.camera.lookAt(this.lookAt);
  }

  computeTarget(focus) {
    const horiz = Math.cos(this.pitch) * this.distance;
    this.target.set(
      focus.x + Math.sin(this.yaw) * horiz,
      focus.y + 1.6 + Math.sin(this.pitch) * this.distance,
      focus.z + Math.cos(this.yaw) * horiz,
    );
    // Don't let buildings get between the camera and the player
    this.blocked = false;
    const blockers = this.world.cameraBlockers;
    if (blockers?.length) {
      const head = new THREE.Vector3(focus.x, focus.y + 1.6, focus.z);
      const dir = this.target.clone().sub(head);
      const dist = dir.length();
      this.raycaster.set(head, dir.normalize());
      this.raycaster.far = dist;
      const hit = this.raycaster.intersectObjects(blockers, true).find((h) => h.object.visible && h.object.material && !h.object.material.transparent);
      if (hit) {
        this.target.copy(head).addScaledVector(dir, Math.max(1.2, hit.distance - 0.4));
        this.blocked = true;
      }
    }
    // Keep the camera above the ground
    const ground = this.world.cameraGround(this.target.x, this.target.z) + 0.8;
    if (this.target.y < ground) this.target.y = ground;
  }

  update(dt, focus) {
    if (!this.enabled) return;
    // Vehicles: swing gently behind the driving direction unless the player is dragging
    if (this.followYaw != null && !this.dragging) {
      let diff = this.followYaw() - this.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.yaw += diff * Math.min(1, dt * 2.5);
    }
    this.computeTarget(focus);
    const k = this.blocked ? 1 - Math.exp(-dt * 25) : 1 - Math.exp(-dt * 8);
    this.current.lerp(this.target, k);
    this.lookAt.lerp(new THREE.Vector3(focus.x, focus.y + 1.6, focus.z), 1 - Math.exp(-dt * 12));
    this.camera.position.copy(this.current);
    this.camera.lookAt(this.lookAt);
  }
}
