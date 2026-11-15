// Alien pet companions: hatched from eggs, they float beside the player
// and fly off to mine nearby star rocks for bonus stars.
import * as THREE from 'three';
import { canvasTexture, roundRect } from '../utils/textures.js';

export const PETS = [
  { id: 'slime', name: 'Astro Slime', rarity: 'Common', chance: 0.45, color: '#54D6AE', power: 1, bonus: 2, emoji: '🟢' },
  { id: 'bot', name: 'Moon Bot', rarity: 'Uncommon', chance: 0.3, color: '#54B8F5', power: 1, bonus: 4, emoji: '🤖' },
  { id: 'dragon', name: 'Cosmic Dragon', rarity: 'Rare', chance: 0.18, color: '#9b87f5', power: 2, bonus: 6, emoji: '🐉' },
  { id: 'phoenix', name: 'Galaxy Phoenix', rarity: 'Legendary', chance: 0.07, color: '#FF8A3D', power: 3, bonus: 10, emoji: '🔥' },
];
export const EGG_PRICE = 80;
export const getPet = (id) => PETS.find((p) => p.id === id);

export function rollPet() {
  let r = Math.random();
  for (const p of PETS) {
    if (r < p.chance) return p;
    r -= p.chance;
  }
  return PETS[0];
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...o });

function eyes(group, y, z, spread = 0.12, size = 0.07) {
  [-spread, spread].forEach((x) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), std('#141420'));
    e.position.set(x, y, z);
    group.add(e);
    const h = new THREE.Mesh(new THREE.SphereGeometry(size * 0.35, 6, 6), std('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }));
    h.position.set(x + size * 0.3, y + size * 0.3, z + size * 0.7);
    group.add(h);
  });
}

/** Builds the pet model; returns { group, animate(t) }. Front faces +Z. */
export function buildPetModel(def) {
  const g = new THREE.Group();
  const c = def.color;
  let animate = () => {};
  if (def.id === 'slime') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), std(c, { transparent: true, opacity: 0.85, emissive: c, emissiveIntensity: 0.35 }));
    body.scale.set(1, 0.8, 1);
    g.add(body);
    const antenna = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), std('#FFC857', { emissive: '#FFC857', emissiveIntensity: 1.2 }));
    antenna.position.y = 0.5;
    g.add(antenna);
    eyes(g, 0.08, 0.38);
    animate = (t) => { body.scale.set(1 + Math.sin(t * 5) * 0.06, 0.8 - Math.sin(t * 5) * 0.06, 1 + Math.sin(t * 5) * 0.06); };
  } else if (def.id === 'bot') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.55), std('#F7F8FF', { metalness: 0.4 }));
    g.add(body);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.32, 0.05), std('#172448'));
    face.position.z = 0.28;
    g.add(face);
    [-0.1, 0.1].forEach((x) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.02), std(c, { emissive: c, emissiveIntensity: 2 }));
      e.position.set(x, 0.02, 0.31);
      g.add(e);
    });
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), std('#8d97b8'));
    ant.position.y = 0.42;
    g.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std('#F25F6C', { emissive: '#F25F6C', emissiveIntensity: 1.5 }));
    tip.position.y = 0.6;
    g.add(tip);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 20), std(c, { emissive: c, emissiveIntensity: 1 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.38;
    g.add(ring);
    animate = (t) => { tip.material.emissiveIntensity = 1 + Math.sin(t * 6); ring.rotation.z = t * 3; };
  } else {
    // Dragon & phoenix share a winged body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), std(c, { emissive: c, emissiveIntensity: def.id === 'phoenix' ? 0.8 : 0.3 }));
    body.scale.set(0.9, 0.9, 1.2);
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), body.material);
    head.position.set(0, 0.22, 0.38);
    g.add(head);
    eyes(head, 0.06, 0.2, 0.1, 0.055);
    const wingMat = std(def.id === 'phoenix' ? '#FFC857' : '#c9bfff', { emissive: def.id === 'phoenix' ? '#FF7894' : c, emissiveIntensity: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const wingGeo = new THREE.ConeGeometry(0.35, 0.8, 3);
    const wings = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.25, 0.15, 0);
      const w = new THREE.Mesh(wingGeo, wingMat);
      w.rotation.z = side * -Math.PI / 2;
      w.position.x = side * 0.4;
      w.scale.set(1, 1, 0.15);
      pivot.add(w);
      g.add(pivot);
      return pivot;
    });
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 8), wingMat);
    tail.rotation.x = -Math.PI / 2 - 0.4;
    tail.position.set(0, 0.05, -0.5);
    g.add(tail);
    if (def.id === 'dragon') {
      [-0.09, 0.09].forEach((x) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), std('#FFC857'));
        horn.position.set(x, 0.42, 0.34);
        g.add(horn);
      });
    }
    animate = (t) => {
      const flap = Math.sin(t * 9) * 0.6;
      wings[0].rotation.z = flap;
      wings[1].rotation.z = -flap;
      tail.rotation.y = Math.sin(t * 3) * 0.3;
    };
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, animate };
}

function petTag(def) {
  const tex = canvasTexture(320, 80, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(23,36,72,0.85)';
    roundRect(ctx, 4, 4, w - 8, h - 8, 30);
    ctx.fill();
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#F7F8FF';
    ctx.font = '700 34px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name, w / 2, h / 2 + 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.3, 0.33, 1);
  s.position.y = 0.85;
  return s;
}

export class PetCompanion {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    const model = buildPetModel(def);
    this.model = model;
    this.group = new THREE.Group();
    this.group.add(model.group);
    this.group.add(petTag(def));
    game.scene.add(this.group);
    this.time = 0;
    this.mode = 'follow';
    this.target = null;
    this.timer = 2;
    this.hitTimer = 0;
  }

  dispose() { this.game.scene.remove(this.group); }

  snapToPlayer() {
    const p = this.game.player.position;
    this.group.position.set(p.x + 1.2, p.y + 2.2, p.z + 0.5);
  }

  update(dt) {
    const g = this.game;
    const player = g.player;
    if (!player) return;
    this.time += dt;
    this.model.animate(this.time);
    const p = player.position;
    this.group.visible = player.group.visible || g.rover?.driving;

    if (this.mode === 'follow') {
      // Float behind the player's right shoulder
      const h = player.heading;
      const tx = p.x - Math.sin(h) * 1.1 + Math.cos(h) * -1.2;
      const tz = p.z - Math.cos(h) * 1.1 - Math.sin(h) * -1.2;
      const ty = p.y + 2.3 + Math.sin(this.time * 2.5) * 0.18;
      this.moveToward(tx, ty, tz, dt, 6);
      this.group.rotation.y = h;
      // Look for a rock to mine every few seconds
      this.timer -= dt;
      if (this.timer <= 0 && g.canUseTools(true)) {
        this.timer = 3;
        const rock = g.mining.nearestRock(p, 10, g.world.zone ? g.world.zone.id : 'moon');
        if (rock) { this.target = rock; this.mode = 'mine'; }
      }
    } else if (this.mode === 'mine') {
      const r = this.target;
      if (!r || !r.alive || r.position.distanceTo(p) > 16) { this.mode = 'follow'; this.target = null; return; }
      const tx = r.position.x, ty = r.position.y + r.size + 0.9 + Math.sin(this.time * 6) * 0.1, tz = r.position.z;
      const close = this.moveToward(tx, ty, tz, dt, 9);
      this.group.lookAt(tx, this.group.position.y, tz);
      if (close) {
        this.hitTimer -= dt;
        if (this.hitTimer <= 0) {
          this.hitTimer = 0.7;
          // Little headbutt
          this.model.group.position.y = -0.25;
          g.tweens.add({ duration: 0.3, group: 'free', update: (k) => { this.model.group.position.y = -0.25 * (1 - k); } });
          g.mining.damage(r, this.def.power, { power: 1, bonus: this.def.bonus, byPet: true });
        }
      }
    }
  }

  moveToward(x, y, z, dt, speed) {
    const pos = this.group.position;
    const dx = x - pos.x, dy = y - pos.y, dz = z - pos.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > 30) { pos.set(x, y, z); return true; } // teleported far away (e.g. portal)
    const k = Math.min(1, dt * speed * 0.6);
    pos.x += dx * k; pos.y += dy * k; pos.z += dz * k;
    return d < 0.8;
  }
}
