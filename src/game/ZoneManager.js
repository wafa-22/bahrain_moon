// Galaxy Portal travel between the Moon base and the bonus planet zones.
import * as THREE from 'three';
import { buildMarsZone, buildSaturnZone, buildNeptuneZone } from '../world/zones.js';

export const ZONES = [
  { id: 'moon', name: 'Moon Base', emoji: '🌙', price: 0, desc: 'Home sweet home — the Bahrain Moon Base.' },
  { id: 'mars', name: 'Mars Lava Zone', emoji: '🌋', price: 150, desc: 'Red rocks, a volcano and hot lava pools. Collect the stars!', build: buildMarsZone, origin: new THREE.Vector3(1200, 0, 0) },
  { id: 'saturn', name: 'Saturn Rings Parkour', emoji: '🪐', price: 250, desc: 'Jump across floating platforms beside Saturn\'s rings.', build: buildSaturnZone, origin: new THREE.Vector3(-1200, 20, 0) },
  { id: 'neptune', name: 'Neptune Ice World', emoji: '🧊', price: 350, desc: 'A slippery frozen world with ice crystals and snow.', build: buildNeptuneZone, origin: new THREE.Vector3(0, 0, 1200) },
];

export class ZoneManager {
  constructor(game) {
    this.game = game;
    this.built = {};
    this.current = null;      // null = Moon
    this.completed = new Set();
    this.busy = false;
  }

  get id() { return this.current ? this.current.id : 'moon'; }

  ensure(id) {
    if (this.built[id]) return this.built[id];
    const def = ZONES.find((z) => z.id === id);
    const zone = def.build(def.origin.clone());
    const g = this.game;
    g.scene.add(zone.group);
    // Mineable crystals for this zone
    (zone.rockSpots || []).forEach((p) => {
      zone.rocks.push(g.mining.addRock({
        ...p, zone: id, name: zone.rockName, rockColor: zone.rockColor, crystalColor: zone.crystalColor, colliders: zone.colliders,
      }));
    });
    // Portal home
    g.interactions.add({
      id: `portal-home-${id}`,
      position: zone.portal.interactPoint,
      radius: 2.6,
      priority: 2,
      label: 'Return to the Moon Base 🌙',
      isActive: () => this.current === zone && !this.busy,
      onInteract: () => this.travel('moon'),
    });
    this.built[id] = zone;
    return zone;
  }

  isUnlocked(id) { return this.game.state.unlockedZones.includes(id); }

  unlock(id) {
    const def = ZONES.find((z) => z.id === id);
    const s = this.game.state;
    if (this.isUnlocked(id)) return true;
    if (!s.spendStars(def.price, `unlock ${def.name}`)) return false;
    s.unlockedZones.push(id);
    this.game.sound.success();
    return true;
  }

  async travel(id) {
    if (this.busy || id === this.id) return;
    const g = this.game;
    this.busy = true;
    g.sound.portal();
    g.input.clear();
    await g.fade(true);
    const zone = id === 'moon' ? null : this.ensure(id);
    this.current = zone;
    g.world.setZone(zone);
    if (zone) {
      g.ui.mission.hideAlert();
      zone.checkpoint = zone.spawn.clone();
      zone.checkpointHeading = zone.spawnHeading;
      g.player.teleport(zone.spawn.x, zone.spawn.z, zone.spawnHeading);
    } else {
      const p = g.world.portal.interactPoint;
      g.player.teleport(p.x, p.z - 6, Math.PI);
    }
    g.cameraCtl.yaw = zone ? 0 : 0.9; // keep the camera out of the portal ring
    g.cameraCtl.snap(g.player.position);
    g.pet?.snapToPlayer();
    this.updateObjective();
    await g.fade(false);
    this.busy = false;
    g.ui.mission.clearDialogue();
    if (zone) g.ui.mission.say('control', `${zone.emoji} ${zone.intro}`);
    else g.ui.mission.say('control', 'Welcome back to the Moon Base! 🌙');
  }

  updateObjective() {
    const g = this.game;
    const z = this.current;
    if (!z) {
      g.showFreePlayObjective();
      return;
    }
    const left = z.tokens.filter((t) => !t.taken).length;
    const total = z.tokens.length;
    let text = `${z.goalText}<br>⭐ Tokens: <b>${total - left}/${total}</b>`;
    if (this.completed.has(z.id)) text += ' · ✅ Zone complete!';
    g.ui.mission.setObjective({ tag: `${z.emoji} Zone`, title: z.name, text });
    // Point the compass at the goal or the nearest token
    if (z.goal && !this.completed.has(z.id)) g.setObjectiveTarget(new THREE.Vector3(z.goal.x, z.goal.y, z.goal.z));
    else g.setObjectiveTarget(this.nearestToken()?.mesh.position || null);
  }

  nearestToken() {
    const p = this.game.player.position;
    let best = null, bd = Infinity;
    this.current?.tokens.forEach((t) => {
      if (t.taken) return;
      const d = t.mesh.position.distanceTo(p);
      if (d < bd) { bd = d; best = t; }
    });
    return best;
  }

  respawn(message) {
    const g = this.game;
    const z = this.current;
    g.sound.error();
    if (message) g.ui.mission.say('control', message);
    g.player.teleport(z.checkpoint.x, z.checkpoint.z, z.checkpointHeading);
    g.cameraCtl.snap(g.player.position);
  }

  completeZone(z) {
    if (this.completed.has(z.id)) return;
    this.completed.add(z.id);
    const g = this.game;
    g.state.addStars(z.completeReward, `${z.name} complete`);
    g.sound.success();
    g.world.bursts.spawn(g.player.position.clone().add(new THREE.Vector3(0, 2, 0)), { color: '#FFC857', count: 100, speed: 7 });
    g.ui.mission.alert(`🏆 ${z.name} complete! +${z.completeReward} ⭐`, true);
    this.updateObjective();
  }

  update(dt, t) {
    const z = this.current;
    if (!z) return;
    z.update(dt, t);
    if (this.busy || this.game.cinematic) return;
    const g = this.game;
    const p = g.player.position;

    // Star tokens
    z.tokens.forEach((tok) => {
      if (tok.taken) return;
      tok.mesh.rotation.y += dt * 2.5;
      tok.mesh.position.y = tok.base + Math.sin(t * 3 + tok.base) * 0.15;
      if (tok.mesh.position.distanceTo(new THREE.Vector3(p.x, p.y + 0.9, p.z)) < 1.4) {
        tok.taken = true;
        tok.mesh.visible = false;
        g.sound.coin();
        g.world.bursts.spawn(tok.mesh.position.clone(), { color: '#FFC857', count: 30, speed: 4, size: 0.4 });
        g.state.addStars(10, 'star token');
        this.updateObjective();
        if (!z.goal && z.tokens.every((x) => x.taken)) this.completeZone(z);
      }
    });

    // Hazards & falling
    const msg = z.hazard(p.x, p.z, p.y);
    if (msg) { this.respawn(msg); return; }
    if (p.y < z.killY) { this.respawn('Whoops! You fell into space. Back to your last checkpoint! 🚀'); return; }

    // Parkour checkpoints and goal
    if (z.platformAt && g.player.onGround) {
      const plat = z.platformAt(p.x, p.z, p.y);
      if (plat?.cp && z.checkpoint.distanceTo(new THREE.Vector3(plat.wx, 0, plat.wz)) > 0.5) {
        z.checkpoint = new THREE.Vector3(plat.wx, 0, plat.wz);
        z.checkpointHeading = g.player.heading;
        g.sound.step();
        g.ui.mission.alert('🚩 Checkpoint!', true);
      }
      if (plat?.goal) this.completeZone(z);
    }
  }
}
