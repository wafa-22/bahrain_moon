// Main game controller: renderer, loop, game modes (menus → intro → play),
// player + family, cinematics, pause and restart.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { GameState } from './GameState.js';
import { Sound } from './Sound.js';
import { Input } from './Input.js';
import { World, LOCATIONS } from './World.js';
import { Player } from './Player.js';
import { CameraController } from './CameraController.js';
import { Interactions } from './Interactions.js';
import { Tweens, Ease, lerp } from '../utils/Tween.js';
import { padTexture } from '../utils/textures.js';
import { Astronaut } from '../characters/CharacterFactory.js';
import { CHARACTERS, getCharacter } from '../characters/characterData.js';
import { CodingBlocks } from '../coding/CodingBlocks.js';
import { MissionManager } from '../missions/MissionManager.js';
import { HUD } from '../ui/HUD.js';
import { MissionPanel } from '../ui/MissionPanel.js';
import { MainMenu, showScreen, openModal, closeModal } from '../ui/MainMenu.js';
import { CharacterSelection } from '../ui/CharacterSelection.js';
import { SuccessScreen } from '../ui/SuccessScreen.js';

const SHOWCASE = new THREE.Vector3(0, 120, 0); // "deck" floating in space for the menus
const DEFAULT_LOOK = { accent: '#CE1126', visor: '#FFC857', headlamp: true };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.initRenderer();

    this.state = new GameState();
    this.sound = new Sound();
    this.tweens = new Tweens();
    this.input = new Input();
    this.world = new World(this.scene, this.tweens, this.sound);
    this.cameraCtl = new CameraController(this.camera, canvas, this.world);
    this.interactions = new Interactions(document.getElementById('prompt'), document.getElementById('prompt-text'));
    this.coding = new CodingBlocks(document.getElementById('coding-modal'), this.sound);
    this.ui = {
      hud: new HUD(this.state),
      mission: new MissionPanel(),
      success: new SuccessScreen(this.sound),
    };
    this.missions = new MissionManager(this);

    this.mode = 'splash';
    this.cinematic = false;
    this.paused = false;
    this.player = null;
    this.npcs = [];
    this.objective = null;
    this.camLook = new THREE.Vector3(0, 2, 0);
    this.menuAngle = 0.6;
    this.clock = new THREE.Clock();
    this.maxDt = Number(new URLSearchParams(window.location.search).get('maxdt')) || 0.05;

    this.buildShowcase();
    this.setupMenus();
    this.setupKeys();
    this.setupHudButtons();
    this.setupWorldInteractions();
    window.addEventListener('resize', () => this.resize());
  }

  // ======================================================
  // Setup
  // ======================================================
  initRenderer() {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' }));
    this.pixelRatio = Math.min(window.devicePixelRatio, 1.75);
    r.setPixelRatio(this.pixelRatio);
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);

    // Soft bloom makes screens, lights and the beacon glow
    try {
      this.composer = new EffectComposer(r);
      this.composer.setPixelRatio(this.pixelRatio);
      this.composer.setSize(window.innerWidth, window.innerHeight);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 0.85);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    } catch (err) {
      console.warn('Bloom unavailable, rendering without post-processing.', err);
      this.composer = null;
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  }

  buildShowcase() {
    const g = (this.showcase = new THREE.Group());
    g.position.copy(SHOWCASE);
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 6, 0.5, 48),
      [new THREE.MeshStandardMaterial({ color: '#2a2f63' }), new THREE.MeshStandardMaterial({ map: padTexture(), roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#2a2f63' })],
    );
    deck.position.y = -0.25;
    deck.receiveShadow = true;
    g.add(deck);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.07, 8, 64), new THREE.MeshStandardMaterial({ color: '#54D6AE', emissive: '#54D6AE', emissiveIntensity: 2 }));
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    const key = new THREE.PointLight('#ffffff', 40, 25, 2);
    key.position.set(0, 6, 6);
    g.add(key);

    this.showcaseChars = CHARACTERS.map((data, i) => {
      const a = new Astronaut(data, DEFAULT_LOOK);
      a.homeX = -3.15 + i * 2.1;
      a.group.position.set(a.homeX, 0, 0);
      g.add(a.group);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 0.95, 40),
        new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(a.homeX, 0.02, 0);
      g.add(ring);
      a.ring = ring;
      return a;
    });
    this.scene.add(g);
  }

  setupMenus() {
    this.menu = new MainMenu({ sound: this.sound, onStart: () => this.goToSelect() });
    this.selection = new CharacterSelection({
      state: this.state,
      sound: this.sound,
      onSelect: (id) => this.showcaseSelect(id),
      onLook: () => this.applyLookToShowcase(),
      onBack: () => this.goToSplash(),
      onNext: () => this.goToCustom(),
      onCustomBack: () => this.goToSelect(true),
      onLaunch: () => this.playIntro(),
    });
    document.getElementById('btn-skip-intro').addEventListener('click', () => this.skipIntro());
    document.getElementById('btn-resume').addEventListener('click', () => { this.sound.click(); this.setPaused(false); });
    document.getElementById('btn-restart-mission').addEventListener('click', () => {
      this.sound.click();
      this.setPaused(false);
      if (!this.missions.restart()) this.ui.mission.say('control', 'There\'s no mission running right now — enjoy exploring the base!');
    });
    document.getElementById('btn-pause-howto').addEventListener('click', () => { this.sound.click(); openModal('howto'); });
    document.getElementById('btn-pause-info').addEventListener('click', () => { this.sound.click(); this.ui.success.showInfo(); });
    document.getElementById('btn-main-menu').addEventListener('click', () => window.location.reload());
  }

  setupKeys() {
    this.input.onKey('e', () => {
      if (this.mode === 'play' && !this.isBlocked()) this.interactions.interact();
    });
    this.input.onKey(' ', () => {
      if (this.mode === 'play' && !this.isBlocked()) this.player.jump(this.sound);
    });
    this.input.onKey('escape', () => this.handleEscape());
    this.input.onKey('h', () => document.getElementById('controls-hint').classList.toggle('hidden'));
  }

  setupHudButtons() {
    const soundBtn = document.getElementById('btn-sound');
    soundBtn.addEventListener('click', () => {
      this.sound.unlock();
      soundBtn.textContent = this.sound.toggleMute() ? '🔇' : '🔊';
    });
    document.getElementById('btn-info').addEventListener('click', () => { this.sound.click(); this.ui.success.showInfo(); });
    document.getElementById('btn-pause').addEventListener('click', () => { this.sound.click(); this.setPaused(true); });
  }

  /** Optional things to discover while exploring (makes the world feel alive). */
  setupWorldInteractions() {
    const W = this.world;
    const notBusy = () => !this.cinematic;
    this.interactions.add({
      id: 'greenhouse', position: W.greenhouse.interactPoint, label: 'Look inside the Greenhouse', isActive: notBusy,
      onInteract: () => this.ui.mission.say('maryam', W.powerOn
        ? `The grow lights are on and the plants are happy! Food supply: ${this.state.resources.food}%.`
        : 'Our plants need light to grow, but the grow lights need electricity. We have to fix the power!'),
    });
    this.interactions.add({
      id: 'antenna', position: W.antenna.interactPoint, label: 'Send a message to Earth', isActive: notBusy,
      onInteract: () => {
        this.sound.success();
        W.bursts.spawn(new THREE.Vector3(LOCATIONS.antenna.x, 8, LOCATIONS.antenna.z), { color: '#54B8F5', count: 40, speed: 3 });
        this.ui.mission.say('control', '📡 Message sent to Bahrain: “Marhaba from the Moon!” Radio signals take about 1.3 seconds to travel from the Moon to Earth.');
      },
    });
    this.interactions.add({
      id: 'flag', position: W.flag.interactPoint, label: 'Salute the Bahrain flag', isActive: notBusy,
      onInteract: () => {
        this.player.astronaut.wave(2.5);
        this.ui.mission.say(this.state.characterId, 'Bahrain on the Moon! 🇧🇭 The flag hangs from a rod at the top because there\'s no wind here.');
      },
    });
    this.interactions.add({
      id: 'habitat', position: new THREE.Vector3(0, 0, 8.4), radius: 2.2, label: 'Visit the Habitat', isActive: notBusy,
      onInteract: () => this.ui.mission.say('control', W.powerOn
        ? 'The habitat is warm and bright — this is where the family eats, sleeps and works.'
        : 'The habitat is dark because the power is low. The family\'s home needs electricity!'),
    });
  }

  // ======================================================
  // Menus & showcase
  // ======================================================
  start() {
    this.goToSplash(true);
    document.getElementById('loading').classList.add('hidden');
    this.renderer.setAnimationLoop(() => this.frame());
  }

  goToSplash(instant = false) {
    this.mode = 'splash';
    this.menu.show();
    if (!instant) this.fadeFlash();
  }

  async goToSelect(fromCustom = false) {
    if (!fromCustom) await this.fadeFlash();
    this.mode = 'select';
    this.selection.showSelect();
    this.applyLookToShowcase();
    if (!fromCustom) {
      this.camera.position.set(0, SHOWCASE.y + 1.4, 8.6);
      this.camLook.set(0, SHOWCASE.y - 0.35, 0);
      this.camera.lookAt(this.camLook);
    } else {
      this.moveCamera(new THREE.Vector3(0, SHOWCASE.y + 1.4, 8.6), new THREE.Vector3(0, SHOWCASE.y - 0.35, 0), 1.1);
    }
  }

  goToCustom() {
    this.mode = 'custom';
    this.selection.showCustom();
    const a = this.selectedShowcase();
    // Selected astronaut on the left of the screen (panel is on the right)
    this.moveCamera(
      new THREE.Vector3(a.homeX + 1.3, SHOWCASE.y + 1.7, 4.2),
      new THREE.Vector3(a.homeX + 1.15, SHOWCASE.y + 1.25, 0),
      1.2,
    );
  }

  selectedShowcase() {
    return this.showcaseChars.find((a) => a.data.id === this.state.characterId);
  }

  showcaseSelect(id) {
    this.showcaseChars.forEach((a) => {
      const sel = a.data.id === id;
      a.ring.material.opacity = sel ? 0.9 : 0.2;
      if (sel) { a.wave(1.6); a.hop = 0; }
    });
    this.applyLookToShowcase();
  }

  applyLookToShowcase() {
    const s = this.state;
    this.showcaseChars.forEach((a) => {
      const sel = a.data.id === s.characterId;
      a.setAccent(sel ? s.accent : DEFAULT_LOOK.accent);
      a.setVisor(sel ? s.visor : DEFAULT_LOOK.visor);
      a.setHeadlamp(sel ? s.headlamp : true);
    });
  }

  // ======================================================
  // Family (player + NPCs)
  // ======================================================
  createFamily() {
    const s = this.state;
    const data = getCharacter(s.characterId);
    const astro = new Astronaut(data, { accent: s.accent, visor: s.visor, headlamp: s.headlamp });
    if (this.player) this.player.setAstronaut(astro);
    else this.player = new Player(this.scene, this.world, astro);
    this.playerActor = { group: this.player.group, astronaut: astro, isPlayer: true, walking: false };

    this.npcs.forEach((n) => { this.scene.remove(n.group); this.interactions.remove(`npc-${n.data.id}`); });
    this.npcs = CHARACTERS.filter((c) => c.id !== s.characterId).map((c) => {
      const a = new Astronaut(c, DEFAULT_LOOK, { nameTag: true });
      const npc = { data: c, astronaut: a, group: a.group, home: c.npcSpot, talkIndex: 0, walking: false };
      this.scene.add(a.group);
      this.interactions.add({
        id: `npc-${c.id}`,
        position: a.group.position,
        radius: 2.4,
        label: `Talk to ${c.name}`,
        isActive: () => a.group.visible && !this.cinematic,
        onInteract: () => this.talkTo(npc),
      });
      return npc;
    });
    this.player.extraColliders = this.npcs.map(() => ({ x: 0, z: 0, r: 0.55 }));
    this.resetFamilyPositions();
  }

  resetFamilyPositions() {
    this.npcs.forEach((n) => {
      n.group.visible = true;
      n.walking = false;
      n.group.position.set(n.home.x, this.world.heightAt(n.home.x, n.home.z), n.home.z);
      n.group.rotation.y = n.home.rot;
    });
    this.player.group.visible = true;
  }

  talkTo(npc) {
    const line = npc.data.talk[npc.talkIndex % npc.data.talk.length];
    npc.talkIndex++;
    npc.astronaut.wave(1.5);
    const m = this.missions.active;
    const hint = m && m.stage === 'travel' ? ` Right now we need you at the ${m.title === 'Power Crisis' ? 'Solar Station' : m.title === 'Oxygen Emergency' ? 'Oxygen Station' : 'Emergency Shelter'}!` : '';
    this.ui.mission.say(npc.data.id, line + hint);
  }

  /** Everyone who walks in cutscenes. */
  familyActors() {
    return [this.playerActor, ...this.npcs];
  }

  walkActor(actor, x, z, duration) {
    const g = actor.group;
    const fromX = g.position.x, fromZ = g.position.z;
    g.rotation.y = Math.atan2(x - fromX, z - fromZ);
    actor.walking = true;
    return this.tweens.add({
      duration, ease: Ease.linear, group: 'mission',
      update: (k) => {
        const px = lerp(fromX, x, k), pz = lerp(fromZ, z, k);
        g.position.set(px, this.world.heightAt(px, pz), pz);
        if (k >= 1) actor.walking = false;
      },
    }).then(() => { actor.walking = false; });
  }

  // ======================================================
  // Intro cinematic (Screen 4)
  // ======================================================
  async playIntro() {
    this.introDone = false;
    this.introSkipped = false;
    await this.fade(true);
    this.mode = 'intro';
    this.showcase.visible = false;
    this.createFamily();
    this.player.group.visible = false;
    const pad = this.world.pad;
    pad.lander.position.y = 40;
    pad.flame.visible = true;
    showScreen('screen-intro');
    const caption = document.getElementById('intro-caption');
    const say = (t) => { caption.style.opacity = 0; setTimeout(() => { caption.innerHTML = t; caption.style.opacity = 1; }, 250); };
    const P = LOCATIONS.pad;
    this.camera.position.set(P.x + 20, 10, P.z + 24);
    this.camLook.set(P.x, 18, P.z);
    this.camera.lookAt(this.camLook);
    await this.fade(false);
    if (this.introSkipped) return;

    const name = getCharacter(this.state.characterId).name;
    say('After a long journey from Earth, a Bahraini family arrives at the Moon… 🌍➡️🌙');
    this.sound.whoosh();
    await this.tweens.add({
      duration: 5.5, ease: Ease.out, group: 'intro',
      update: (k) => {
        const y = lerp(40, 0.2, k);
        pad.lander.position.y = y;
        pad.flame.scale.set(1, 0.8 + Math.random() * 0.4, 1);
        this.camLook.set(P.x, y * 0.55 + 2, P.z);
        this.camera.position.set(P.x + lerp(20, 12, k), lerp(10, 5, k), P.z + lerp(24, 13, k));
        this.camera.lookAt(this.camLook);
      },
    });
    if (this.introSkipped) return;
    pad.flame.visible = false;
    this.world.bursts.spawn(new THREE.Vector3(P.x, 0.5, P.z), { color: '#d8d0ff', count: 140, speed: 7, up: 0.5, size: 0.7, life: 1.8 });
    this.sound.door();
    say('Their mission: keep the <b>Bahrain Moon Base</b> running — power, oxygen, food and safety.');
    await this.tweens.wait(2.6, 'intro');
    if (this.introSkipped) return;

    // The player walks down the ramp
    const spawn = pad.spawnPoint;
    this.player.teleport(P.x, P.z - 2.0, Math.PI);
    this.player.group.visible = true;
    const actor = this.playerActor;
    this.moveCamera(new THREE.Vector3(spawn.x + 4, 3.2, spawn.z - 6.5), new THREE.Vector3(spawn.x, 1.6, spawn.z + 1), 2.6);
    await this.walkActor(actor, spawn.x, spawn.z, 2.2);
    if (this.introSkipped) return;
    this.player.astronaut.wave(2);
    say(`📡 Mission Control: “Welcome to the Moon, <b>${name}</b>! Your family is counting on you.”`);
    await this.tweens.wait(3, 'intro');
    if (this.introSkipped) return;
    this.finishIntro();
  }

  skipIntro() {
    if (this.introDone) return;
    this.introSkipped = true;
    this.tweens.cancelGroup('intro');
    this.tweens.cancelGroup('mission');
    this.tweens.cancelGroup('camera');
    this.finishIntro();
  }

  finishIntro() {
    if (this.introDone) return;
    this.introDone = true;
    const pad = this.world.pad;
    pad.lander.position.y = 0.2;
    pad.flame.visible = false;
    if (!this.player) this.createFamily();
    const spawn = pad.spawnPoint;
    this.player.group.visible = true;
    this.player.teleport(spawn.x, spawn.z, Math.PI);
    showScreen(null);
    this.ui.hud.show();
    this.mode = 'play';
    this.cameraCtl.yaw = 0.55; // slightly to the side so the lander doesn't block the view
    this.cameraCtl.pitch = 0.32;
    this.cameraCtl.enabled = true;
    this.cameraCtl.snap(this.player.position);
    this.missions.startNext();
  }

  // ======================================================
  // Cinematics & camera helpers
  // ======================================================
  beginCinematic() {
    this.cinematic = true;
    document.body.classList.add('cinematic');
    this.cameraCtl.enabled = false;
    this.camLook.copy(this.cameraCtl.lookAt);
    this.interactions.hidePrompt();
    this.ui.mission.clearDialogue();
    this.input.clear();
  }

  endCinematic() {
    this.cinematic = false;
    document.body.classList.remove('cinematic');
    this.tweens.cancelGroup('camera');
    this.cameraCtl.current.copy(this.camera.position);
    this.cameraCtl.lookAt.copy(this.camLook);
    this.player.heading = this.player.group.rotation.y;
    this.player.velocity.set(0, 0, 0);
    this.cameraCtl.enabled = true;
  }

  moveCamera(position, look, duration = 1.5) {
    this.tweens.cancelGroup('camera');
    const fromP = this.camera.position.clone();
    const fromL = this.camLook.clone();
    return this.tweens.add({
      duration, group: 'camera',
      update: (k) => {
        this.camera.position.lerpVectors(fromP, position, k);
        this.camLook.lerpVectors(fromL, look, k);
        this.camera.lookAt(this.camLook);
      },
    });
  }

  fade(on) {
    document.getElementById('fade').classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, 720));
  }

  async fadeFlash() {
    await this.fade(true);
    this.fade(false);
  }

  /** Smoothly animate a resource to a value (stays in sync with the HUD via GameState). */
  tweenResource(key, to, duration = 1.2) {
    const from = this.state.resources[key];
    return this.tweens.add({ duration, group: 'mission', update: (k) => this.state.setResource(key, from + (to - from) * k) });
  }

  setObjectiveTarget(position, color = '#FFC857') {
    this.objective = position ? position.clone() : null;
    if (position) {
      const p = position.clone();
      p.y = this.world.heightAt(p.x, p.z);
      this.world.beacon.setTarget(p, color);
    } else {
      this.world.beacon.setTarget(null);
    }
  }

  // ======================================================
  // Coding / pause / restart
  // ======================================================
  openCoding(config) {
    this.interactions.hidePrompt();
    this.input.clear();
    this.coding.open(config);
  }

  closeCoding() { this.input.clear(); }

  isBlocked() {
    return this.paused || this.cinematic || this.coding.isOpen || this.ui.success.isOpen
      || !document.getElementById('howto').classList.contains('hidden')
      || !document.getElementById('info-panel').classList.contains('hidden');
  }

  handleEscape() {
    if (!document.getElementById('howto').classList.contains('hidden')) { closeModal('howto'); return; }
    if (!document.getElementById('info-panel').classList.contains('hidden')) { closeModal('info-panel'); return; }
    if (this.coding.isOpen) { if (!this.coding.running) this.coding.close(); return; }
    if (this.mode !== 'play' || this.cinematic || this.ui.success.isOpen) return;
    this.setPaused(!this.paused);
  }

  setPaused(p) {
    this.paused = p;
    document.getElementById('pause-menu').classList.toggle('hidden', !p);
    if (p) this.input.clear();
  }

  /** Bring the world, family and UI back to the start of the current mission. */
  resetForMission() {
    this.tweens.cancelGroup('mission');
    this.tweens.cancelGroup('camera');
    this.coding.close(true);
    this.ui.success.hideAll();
    this.ui.mission.clearDialogue();
    this.ui.mission.clearAlert();
    this.ui.hud.hideRunner();
    this.ui.hud.hideCaption();
    this.world.applyProgress(this.state.completedMissions.length);
    if (this.cinematic) this.endCinematic();
    this.resetFamilyPositions();
    const start = this.state.completedMissions.length === 0 ? this.world.pad.spawnPoint : new THREE.Vector3(2.5, 0, 11);
    this.player.teleport(start.x, start.z, Math.PI);
    this.cameraCtl.yaw = 0;
    this.cameraCtl.snap(this.player.position);
    this.setObjectiveTarget(null);
  }

  showFinal() {
    this.setObjectiveTarget(null);
    this.ui.mission.setObjective({ tag: 'Complete!', title: 'Base Saved 🏆', text: 'Explore the base and talk to your family.' });
    this.ui.success.showFinal({
      name: getCharacter(this.state.characterId).name,
      resources: this.state.resources,
      onReplay: () => this.missions.restartAll(),
      onExplore: () => this.ui.mission.say('control', 'Great job! Feel free to explore the base. Try the antenna, the greenhouse and the flag!'),
      onMenu: () => window.location.reload(),
    });
  }

  // ======================================================
  // Main loop
  // ======================================================
  frame() {
    const dt = Math.min(this.clock.getDelta(), this.maxDt);
    this.tweens.update(dt);

    let focus;
    if (this.mode === 'splash') {
      this.menuAngle += dt * 0.05;
      this.camera.position.set(Math.sin(this.menuAngle) * 42, 15, Math.cos(this.menuAngle) * 42);
      this.camera.lookAt(0, 2, 0);
      focus = LOCATIONS.habitat;
    } else if (this.mode === 'select' || this.mode === 'custom') {
      focus = SHOWCASE;
      this.updateShowcase(dt);
    } else {
      focus = this.player ? this.player.position : LOCATIONS.pad;
      if (this.mode === 'play') this.updatePlay(dt);
      else this.updateActors(dt);
    }
    this.world.update(dt, focus);

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  updateShowcase(dt) {
    const selId = this.state.characterId;
    this.showcaseChars.forEach((a) => {
      const sel = a.data.id === selId;
      a.group.visible = sel || this.mode === 'select';
      a.ring.visible = a.group.visible;
      a.update(dt, { speed: 0 });
      // Selected astronaut does a happy little moon hop, and spins on the customize screen
      a.hop = (a.hop ?? 0) + dt;
      a.group.position.y = sel ? Math.abs(Math.sin(a.hop * 2.4)) * 0.18 : 0;
      const targetRot = sel && this.mode === 'custom' ? a.group.rotation.y + dt * 0.6 : 0;
      a.group.rotation.y = sel && this.mode === 'custom' ? targetRot : a.group.rotation.y * 0.9;
    });
  }

  updateActors(dt) {
    if (!this.player) return;
    this.player.astronaut.update(dt, { speed: this.playerActor.walking ? 1 : 0 });
    this.npcs.forEach((n) => n.astronaut.update(dt, { speed: n.walking ? 1 : 0 }));
  }

  updatePlay(dt) {
    const blocked = this.isBlocked();
    if (this.cinematic) {
      this.updateActors(dt);
    } else {
      const move = blocked ? { x: 0, z: 0 } : this.input.movement();
      this.player.update(dt, move, this.cameraCtl.yaw);
      this.cameraCtl.update(dt, this.player.position);
      this.npcs.forEach((n, i) => {
        n.astronaut.update(dt, { speed: n.walking ? 1 : 0 });
        const c = this.player.extraColliders[i];
        c.x = n.group.position.x; c.z = n.group.position.z;
        c.r = n.group.visible ? 0.55 : 0;
        // NPCs turn to face the player when nearby
        const dx = this.player.position.x - n.group.position.x;
        const dz = this.player.position.z - n.group.position.z;
        if (dx * dx + dz * dz < 36 && !n.walking) {
          const want = Math.atan2(dx, dz);
          let diff = want - n.group.rotation.y;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          n.group.rotation.y += diff * Math.min(1, dt * 4);
        }
      });
    }
    this.interactions.enabled = !blocked;
    this.interactions.update(this.player.position);

    // Compass toward the objective
    if (this.objective && !this.cinematic) {
      const dx = this.objective.x - this.player.position.x;
      const dz = this.objective.z - this.player.position.z;
      const yaw = this.cameraCtl.yaw;
      const fwd = dx * -Math.sin(yaw) + dz * -Math.cos(yaw);
      const right = dx * Math.cos(yaw) + dz * -Math.sin(yaw);
      this.ui.hud.updateCompass(Math.atan2(right, fwd), Math.hypot(dx, dz));
    } else {
      this.ui.hud.updateCompass(0, null);
    }

    if (!this.paused) this.missions.update(dt);
  }
}
