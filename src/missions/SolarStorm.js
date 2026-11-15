// MISSION 03 — SOLAR STORM (concept: Problem-Solving & Safety Decisions)
import * as THREE from 'three';
import { Mission } from './Mission.js';
import { checkPlan } from '../coding/CodeValidator.js';
import { LOCATIONS } from '../game/World.js';

const BLOCKS = [
  { id: 'watch', label: 'Go Outside to Watch the Storm', icon: '🔭', category: 'danger' },
  { id: 'enter', label: 'Enter the Shelter', icon: '🛡️', category: 'safety' },
  { id: 'allOn', label: 'Turn On All Machines', icon: '💡', category: 'danger' },
  { id: 'gather', label: 'Call the Family Together', icon: '👨‍👩‍👧‍👦', category: 'safety' },
  { id: 'close', label: 'Close the Shelter Doors', icon: '🚪', category: 'action' },
  { id: 'stop', label: 'Try to Stop the Storm', icon: '🌪️', category: 'danger' },
  { id: 'essential', label: 'Keep Only Essential Systems On', icon: '🔋', category: 'power' },
];
const LABEL = Object.fromEntries(BLOCKS.map((b) => [b.id, b.label]));

const RULES = {
  required: ['gather', 'essential', 'enter', 'close'],
  forbidden: {
    watch: 'Going outside during a solar storm exposes astronauts to dangerous radiation. The safe choice is to stay protected inside the shelter!',
    allOn: 'Turning on every machine would drain our power during the storm. Keep only the <b>essential</b> systems (like oxygen) running.',
    stop: 'Nobody can stop a solar storm — it comes from the Sun, millions of kilometres away! Our job is to plan, protect people and wait until it passes.',
  },
  before: [
    ['gather', 'enter', 'Wait — someone could be left outside! Make sure the whole family is together <b>before</b> entering the shelter.'],
    ['enter', 'close', 'You can\'t close the doors before everyone is inside — you\'d be locked out!'],
  ],
  emptyMessage: 'Your plan has empty steps. A good plan has all four steps filled in.',
  missingMessage: 'Your plan is missing something important. Think: <b>who</b> needs protecting, and which <b>systems</b> must keep running?',
};

const STEP_TEXT = {
  gather: 'Family called — everyone is heading to the shelter',
  essential: 'Only oxygen and life support stay on — power is saved',
  enter: 'Everyone is inside the shelter',
  close: 'Shelter doors closed — shielding is protecting the family',
};

export class SolarStorm extends Mission {
  constructor(game) {
    super(game, { id: 'storm', number: 3, title: 'Solar Storm', concept: 'Problem-Solving & Safety', target: game.world.shelter.interactPoint });
    this.drainTimer = 0;
    game.interactions.add({
      id: 'shelter-door',
      position: game.world.shelter.interactPoint,
      radius: 3.2,
      priority: 1,
      label: 'Make a Storm Safety Plan',
      isActive: () => this.isStage('travel'),
      onInteract: () => this.openPuzzle(),
    });
  }

  onBegin(run) {
    const g = this.game;
    g.sound.alarm(4);
    this.ui.mission.alert('☀️ SOLAR STORM WARNING!');
    this.setObjective('Hurry to the <b>Emergency Shelter</b> and make a safety plan for the family.');
    g.setObjectiveTarget(this.target, '#FF7894');
    this.world.setStorm(true, 3);
    g.tweens.wait(1.5, 'mission').then(() => { if (this.alive(run)) this.world.setShelterDoors(true); });
    this.specialistSays(
      'ahmed',
      'A solar storm is coming! It sends out dangerous radiation. We can\'t stop a storm — but we can protect ourselves. To the shelter!',
      '{name}! A solar storm is coming. We can\'t stop it, but we CAN protect ourselves. Meet us at the Emergency Shelter!',
    ).then(() => {
      if (this.alive(run)) this.ui.mission.say('control', 'The shelter has thick walls that block most of the radiation. Safety drops while you\'re outside — move quickly!');
    });
  }

  update(dt) {
    // Safety slowly drops while the family is outside during the storm (never below 60%)
    if (!(this.isStage('travel') || this.isStage('coding'))) return;
    this.drainTimer += dt;
    if (this.drainTimer > 2.5) {
      this.drainTimer = 0;
      if (this.state.resources.safety > 60) this.state.addResource('safety', -1);
    }
  }

  openPuzzle() {
    this.ui.mission.clearDialogue();
    this.openChallenge({
      title: 'Storm Safety Plan',
      story: 'The storm will last a while. Choose the <b>4 best actions</b> and put them in a <b>safe order</b>. Careful — some blocks are bad ideas!',
      blocks: BLOCKS,
      slots: [{ prefix: 'Step 1' }, { prefix: 'Step 2' }, { prefix: 'Step 3' }, { prefix: 'Step 4' }],
      programTitle: 'Your Safety Plan',
      programHint: 'steps run from top to bottom',
      startHint: '💡 Ask yourself: Who must be protected? What must keep working? What order makes sense?',
      emptyHint: '🧩 Your plan needs 4 steps. Fill every slot.',
      onRun: (program, api) => this.validate(program, api),
    });
  }

  async validate(program, api) {
    this.countAttempt();
    const result = checkPlan(program, RULES);
    // Walk through the plan, stopping at the first problem
    for (let i = 0; i < program.length; i++) {
      const id = program[i];
      api.highlight(i, 'running');
      await api.wait(0.35);
      if (!result.ok && result.badId === id) {
        api.highlight(i, 'failed');
        api.log(`✖ Step ${i + 1}: ${LABEL[id]} — not safe!`, 'err');
        return { ok: false, hint: result.message };
      }
      api.highlight(i, 'passed');
      api.log(`✔ Step ${i + 1}: ${LABEL[id]}`, 'ok');
    }
    if (!result.ok) return { ok: false, hint: result.message };
    return { ok: true, hint: '🎉 That\'s a safe plan! Let\'s protect the family…' };
  }

  async execute(program, run) {
    const g = this.game;
    const W = this.world;
    const H = LOCATIONS.shelter;
    const door = W.shelter.interactPoint;
    const inside = W.shelter.insidePoint;

    g.beginCinematic();
    g.setObjectiveTarget(null);
    await g.moveCamera(new THREE.Vector3(H.x + 12, 8, H.z + 17), new THREE.Vector3(H.x, 1.5, H.z + 3), 1.5);
    if (!this.alive(run)) return;
    g.ui.hud.showRunner('Running your safety plan', program.map((id, i) => `${i + 1}. ${LABEL[id]}`));

    const family = g.familyActors(); // player + NPCs
    const effects = {
      gather: async () => {
        g.sound.whoosh();
        await Promise.all(family.map((a, i) => g.walkActor(a, door.x + (i - 1.5) * 1.3, door.z + 1.5, 2.2)));
      },
      essential: async () => {
        const M = W.materials;
        const from = { w: M.window.emissiveIntensity, l: M.lamp.emissiveIntensity };
        await g.tweens.add({ duration: 1, group: 'mission', update: (k) => { M.window.emissiveIntensity = from.w * (1 - k * 0.6); M.lamp.emissiveIntensity = from.l * (1 - k * 0.7); } });
      },
      enter: async () => {
        await Promise.all(family.map((a, i) => g.walkActor(a, inside.x + (i - 1.5) * 0.5, inside.z, 1.6)));
        family.forEach((a) => { a.group.visible = false; });
      },
      close: () => W.setShelterDoors(false),
    };
    for (let i = 0; i < program.length; i++) {
      g.ui.hud.runnerStep(i);
      g.ui.hud.showCaption(`✔ ${STEP_TEXT[program[i]]}`);
      await effects[program[i]]();
      if (!this.alive(run)) return;
      await g.tweens.wait(0.4, 'mission');
    }
    g.ui.hud.runnerDone();

    // The storm peaks while everyone waits safely inside
    g.ui.hud.showCaption('🛡️ The shelter\'s thick walls block most of the radiation. The family waits safely until the storm passes…');
    g.tweenResource('safety', 100, 3);
    g.moveCamera(new THREE.Vector3(H.x - 14, 10, H.z + 14), new THREE.Vector3(H.x, 2, H.z), 4.5);
    await g.tweens.wait(4.5, 'mission');
    if (!this.alive(run)) return;
    g.ui.hud.showCaption('🌤️ The storm has passed. It\'s safe to go outside again!');
    await W.setStorm(false, 2.5);
    if (!this.alive(run)) return;
    await W.setShelterDoors(true);
    family.forEach((a, i) => {
      a.group.visible = true;
      a.group.position.set(inside.x + (i - 1.5) * 0.6, W.heightAt(inside.x, inside.z), inside.z);
    });
    await Promise.all(family.map((a, i) => g.walkActor(a, door.x + (i - 1.5) * 1.6, door.z + 2.2, 1.6)));
    if (!this.alive(run)) return;
    family.forEach((a) => a.astronaut?.wave(2.5));
    W.setBasePower(true);
    W.bursts.spawn(new THREE.Vector3(door.x, 3, door.z + 1), { color: '#54D6AE', count: 90, speed: 6 });
    this.ui.mission.alert('✅ STORM PASSED — EVERYONE IS SAFE', true);
    g.ui.hud.runnerDone();
    await g.tweens.wait(2.2, 'mission');
    if (!this.alive(run)) return;
    g.ui.hud.hideCaption();
    g.ui.hud.hideRunner();
    g.endCinematic();
    g.setObjectiveTarget(null);

    this.finish({
      emoji: '🛡️',
      title: 'Everyone Is Safe!',
      subtitle: 'You survived the Solar Storm.',
      happened: 'Your plan gathered the family, saved power, moved everyone into the shelter and closed the doors. The family waited safely until the storm passed.',
      why: 'Good plans put steps in a smart order: you can\'t close the doors before everyone is inside. And since nobody can stop a solar storm, the best choice is to protect people and save resources.',
      conceptName: 'Problem-Solving',
      conceptText: 'Break a big problem into small steps, think about what could go wrong, and choose the <b>safest order</b>. Engineers and programmers do this every day!',
      code: program.map((id, i) => `${i + 1}. ${LABEL[id]}`).join('\n'),
    });
  }
}
