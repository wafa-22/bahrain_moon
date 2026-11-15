// Breakable star-crystal rocks, the player's Lunar Pickaxe (with upgrades)
// and the star drops that fly into the player's pocket.
import * as THREE from 'three';
import { canvasTexture } from '../utils/textures.js';
import { seededRandom } from '../utils/noise.js';
import { Ease, lerp } from '../utils/Tween.js';

export const PICKAXE_TIERS = [
  { id: 'lunar', name: 'Lunar Pickaxe', icon: '⛏️', power: 1, price: 0, color: '#c9d1e6', glow: null, desc: 'Your trusty starter tool.' },
  { id: 'plasma', name: 'Plasma Pickaxe', icon: '🔷', power: 2, price: 120, color: '#54B8F5', glow: '#54B8F5', desc: '2× mining power and 2× stars.' },
  { id: 'supernova', name: 'SuperNova Pickaxe', icon: '🌟', power: 4, price: 300, color: '#FF7894', glow: '#FFC857', desc: '4× mining power and 4× stars!' },
];

const ROCK_HP = 4;
const STARS_PER_ROCK = 6;
const RESPAWN_SECONDS = 25;

let starTex = null;
export function starTexture() {
  if (starTex) return starTex;
  starTex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 24 : 56;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#FFC857';
    ctx.shadowColor = '#fff2b0';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff6d8';
    ctx.stroke();
  });
  return starTex;
}

/** 3D pickaxe held in the astronaut's glove. Handle points forward (+Z), spike points down. */
export function buildPickaxe(tier) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: '#3a4577', roughness: 0.6 }),
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 0.35;
  g.add(handle);
  const headMat = new THREE.MeshStandardMaterial({
    color: tier.color, metalness: 0.6, roughness: 0.3,
    emissive: tier.glow || '#000000', emissiveIntensity: tier.glow ? 1.4 : 0,
  });
  const head = new THREE.Group();
  head.position.z = 0.78;
  g.add(head);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.12), headMat);
  head.add(bar);
  // Curved pick: two tapered prongs
  [-1, 1].forEach((side) => {
    const prong = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.38, 6), headMat);
    prong.position.y = side * 0.2;
    prong.rotation.x = side > 0 ? 0.25 : Math.PI - 0.25;
    head.add(prong);
  });
  if (tier.glow) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: tier.glow, emissiveIntensity: 2.5 }));
    gem.position.x = 0.07;
    head.add(gem);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function buildRockMesh(rand, { rockColor, crystalColor, size }) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    new THREE.MeshStandardMaterial({ color: rockColor, roughness: 0.9, flatShading: true }),
  );
  rock.scale.set(1, 0.75, 1);
  rock.position.y = size * 0.45;
  rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
  rock.castShadow = true;
  rock.receiveShadow = true;
  g.add(rock);
  const crystalMat = new THREE.MeshStandardMaterial({ color: crystalColor, emissive: crystalColor, emissiveIntensity: 1.3, roughness: 0.2, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(size * (0.22 + rand() * 0.12)), crystalMat);
    const a = rand() * Math.PI * 2;
    c.position.set(Math.cos(a) * size * 0.5, size * (0.75 + rand() * 0.25), Math.sin(a) * size * 0.5);
    c.scale.y = 1.7;
    c.rotation.set(rand() - 0.5, rand() * 3, rand() - 0.5);
    g.add(c);
  }
  return g;
}

export class Mining {
  constructor(game) {
    this.game = game;
    this.rocks = [];
    this.drops = [];
    this.cooldown = 0;
    this.rand = seededRandom(99);
  }

  get tier() { return PICKAXE_TIERS[this.game.state.pickaxeTier] || PICKAXE_TIERS[0]; }

  /** Equip the current pickaxe in the player's hand. */
  equip() {
    const astro = this.game.player?.astronaut;
    if (!astro) return;
    const tool = buildPickaxe(this.tier);
    tool.rotation.x = -0.25;
    astro.holdTool(tool);
  }

  /**
   * Add a breakable rock.
   * @param {object} o { x, z, y, zone, name, rockColor, crystalColor, size, colliders }
   */
  addRock(o) {
    const size = o.size ?? 0.9 + this.rand() * 0.5;
    const mesh = buildRockMesh(this.rand, { rockColor: o.rockColor || '#8f97c2', crystalColor: o.crystalColor || '#FFC857', size });
    mesh.position.set(o.x, o.y, o.z);
    this.game.scene.add(mesh);
    const collider = { x: o.x, z: o.z, r: size * 0.85 };
    (o.colliders || this.game.world.colliders).push(collider);
    const rock = {
      mesh, collider, size, alive: true, hp: ROCK_HP, zone: o.zone || 'moon',
      name: o.name || 'Star Rock', crystalColor: o.crystalColor || '#FFC857',
      position: new THREE.Vector3(o.x, o.y, o.z),
    };
    this.rocks.push(rock);
    this.game.interactions.add({
      id: `rock-${this.rocks.length}`,
      position: rock.position,
      radius: size + 1.8,
      priority: -1,
      label: () => `Mine ${rock.name} (E or click)`,
      isActive: () => rock.alive && this.game.canUseTools(),
      onInteract: () => this.mine(rock),
    });
    return rock;
  }

  /** Scatter star rocks around the Moon base. */
  populateMoon() {
    const W = this.game.world;
    const rand = seededRandom(2026);
    let placed = 0, tries = 0;
    while (placed < 34 && tries < 3000) {
      tries++;
      const a = rand() * Math.PI * 2;
      const d = 14 + rand() * 38;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (W.isBlocked(x, z, 1.4)) continue;
      if (W.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 2.2)) continue;
      if (this.rocks.some((r) => r.position.distanceTo(new THREE.Vector3(x, r.position.y, z)) < 5)) continue;
      this.addRock({ x, z, y: W.heightAt(x, z) - 0.1, name: 'Moon Rock' });
      placed++;
    }
  }

  nearestRock(pos, maxDist = 3, zone = null) {
    let best = null, bestD = maxDist;
    for (const r of this.rocks) {
      if (!r.alive || (zone && r.zone !== zone)) continue;
      const d = Math.hypot(r.position.x - pos.x, r.position.z - pos.z) - r.size;
      if (d < bestD) { best = r; bestD = d; }
    }
    return best;
  }

  /** Player swings the pickaxe. If a rock is given (or close), it gets hit. */
  swing(rock = null) {
    if (this.cooldown > 0) return;
    const g = this.game;
    this.cooldown = 0.45;
    const player = g.player;
    rock = rock || this.nearestRock(player.position, 1.9);
    if (rock) {
      player.heading = Math.atan2(rock.position.x - player.position.x, rock.position.z - player.position.z);
      player.group.rotation.y = player.heading;
    }
    player.astronaut.swing();
    g.tweens.wait(0.24, 'free').then(() => {
      if (rock && rock.alive) this.damage(rock, this.tier.power, { power: this.tier.power });
      else g.sound.whoosh();
    });
  }

  mine(rock) { this.swing(rock); }

  /** Damage a rock. `power` multiplies the stars it drops when it breaks. */
  damage(rock, amount, { power = 1, bonus = 0, byPet = false } = {}) {
    if (!rock.alive) return;
    const g = this.game;
    const W = g.world;
    rock.hp -= amount;
    g.sound.mine();
    const hitPos = rock.position.clone().add(new THREE.Vector3(0, rock.size * 0.8, 0));
    W.bursts.spawn(hitPos, { color: rock.crystalColor, count: 14, speed: 3.5, size: 0.35, life: 0.8, up: 1.5 });
    // Wobble
    g.tweens.add({ duration: 0.25, group: 'free', update: (k) => { rock.mesh.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.12); } });

    if (rock.hp > 0) return;
    // Break!
    rock.alive = false;
    rock.collider.r = 0;
    g.sound.rockBreak();
    W.bursts.spawn(hitPos, { color: rock.crystalColor, count: 50, speed: 6, size: 0.55, life: 1.3 });
    W.bursts.spawn(hitPos, { color: '#aab6d0', count: 30, speed: 4, size: 0.45, life: 1.1 });
    g.tweens.add({ duration: 0.25, group: 'free', update: (k) => { rock.mesh.scale.setScalar(1 - k); } }).then(() => { rock.mesh.visible = false; });

    const total = STARS_PER_ROCK * power + bonus;
    this.spawnDrops(hitPos, total, byPet ? 'pet mining' : 'mining');

    // Respawn later so mining never runs out
    g.tweens.wait(RESPAWN_SECONDS, 'free').then(() => {
      rock.alive = true;
      rock.hp = ROCK_HP;
      rock.collider.r = rock.size * 0.85;
      rock.mesh.visible = true;
      g.tweens.add({ duration: 0.6, ease: Ease.back, group: 'free', update: (k) => rock.mesh.scale.setScalar(k) });
    });
  }

  /** Star sprites that pop out of a rock and fly to the player. */
  spawnDrops(from, total, reason) {
    const count = Math.min(6, Math.max(2, Math.round(total / 6)));
    const per = Math.floor(total / count);
    let extra = total - per * count;
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false }));
      s.scale.setScalar(0.65);
      s.position.copy(from);
      this.game.scene.add(s);
      const value = per + (extra-- > 0 ? 1 : 0);
      this.drops.push({
        sprite: s, value, reason, t: -i * 0.08,
        start: from.clone(),
        pop: new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 1.2, (Math.random() - 0.5) * 3),
      });
    }
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const target = this.game.player?.position;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t += dt;
      if (d.t < 0) continue;
      const s = d.sprite;
      if (d.t < 0.45) {
        // Pop up out of the rock
        const k = d.t / 0.45;
        s.position.set(d.start.x + d.pop.x * k, d.start.y + d.pop.y * Math.sin(k * Math.PI * 0.5), d.start.z + d.pop.z * k);
        d.mid = s.position.clone();
      } else if (target) {
        // Fly to the player
        const k = Math.min(1, (d.t - 0.45) / 0.45);
        const e = Ease.in(k);
        s.position.set(lerp(d.mid.x, target.x, e), lerp(d.mid.y, target.y + 1.4, e), lerp(d.mid.z, target.z, e));
        if (k >= 1) {
          this.game.scene.remove(s);
          s.material.dispose();
          this.drops.splice(i, 1);
          this.game.sound.coin();
          this.game.state.addStars(d.value, d.reason);
        }
      }
      s.material.rotation += dt * 4;
    }
  }
}
