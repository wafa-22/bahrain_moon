// Central game state. The HUD, the 3D world and the missions all read from
// (and listen to) this single object, so they always stay in sync.

export const START_RESOURCES = Object.freeze({ power: 30, oxygen: 85, food: 60, safety: 90 });
export const RESOURCE_KEYS = ['power', 'oxygen', 'food', 'safety'];

export class GameState {
  constructor() {
    this.listeners = {};

    // Player choices (kept when a mission restarts)
    this.characterId = 'amal';
    this.accent = '#CE1126';
    this.visor = '#FFC857';
    this.headlamp = true;

    // Free-play economy (kept across mission restarts and "Play Again")
    this.stars = 100;
    this.pickaxeTier = 0;          // index into PICKAXE_TIERS (Mining.js)
    this.unlockedZones = ['moon'];
    this.pet = null;               // id of the hatched pet companion
    this.quizSolved = [];          // ids of quiz questions already rewarded

    this.resetProgress();
  }

  // ---- Tiny event system ----
  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== fn);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach((fn) => fn(data));
  }

  // ---- Progress ----
  resetProgress() {
    this.resources = { ...START_RESOURCES };
    this.currentMission = 0;      // index into the mission list
    this.completedMissions = [];  // mission ids
    this.attempts = {};           // mission id → number of Run Code attempts
    this.emit('resources', this.resources);
  }

  /** Snapshot used when restarting a mission. */
  snapshot() {
    return { resources: { ...this.resources }, currentMission: this.currentMission, completed: [...this.completedMissions] };
  }

  restore(snap) {
    this.resources = { ...snap.resources };
    this.currentMission = snap.currentMission;
    this.completedMissions = [...snap.completed];
    this.emit('resources', this.resources);
  }

  // ---- Resources (always clamped 0–100) ----
  setResource(key, value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const old = this.resources[key];
    if (old === v) return;
    this.resources[key] = v;
    this.emit('resources', this.resources);
    this.emit('resource-change', { key, old, value: v });
  }

  addResource(key, delta) {
    this.setResource(key, this.resources[key] + delta);
  }

  // ---- Stars ⭐ ----
  addStars(amount, reason = '') {
    if (!amount) return;
    this.stars = Math.max(0, this.stars + Math.round(amount));
    this.emit('stars', { stars: this.stars, delta: Math.round(amount), reason });
  }

  /** Spend stars if there are enough. Returns true on success. */
  spendStars(amount, reason = '') {
    if (this.stars < amount) return false;
    this.addStars(-amount, reason);
    return true;
  }

  // ---- Missions ----
  countAttempt(missionId) {
    this.attempts[missionId] = (this.attempts[missionId] || 0) + 1;
    return this.attempts[missionId];
  }

  completeMission(id) {
    if (!this.completedMissions.includes(id)) this.completedMissions.push(id);
    this.currentMission += 1;
    this.emit('mission-complete', id);
  }
}
