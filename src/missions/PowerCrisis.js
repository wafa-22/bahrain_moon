// MISSION 01 — POWER CRISIS (concept: Sequence)
import * as THREE from 'three';
import { Mission } from './Mission.js';
import { runSequence } from '../coding/CodeValidator.js';
import { LOCATIONS } from '../game/World.js';

const BLOCKS = [
  { id: 'connect', label: 'Connect Panels to Battery', icon: '🔋', category: 'power' },
  { id: 'inspect', label: 'Inspect Solar Panels', icon: '🔍', category: 'sensor' },
  { id: 'activate', label: 'Activate Solar Panels', icon: '☀️', category: 'power' },
];

// Each command needs what earlier commands produce — this is the real check.
const COMMANDS = {
  inspect: {
    label: 'Inspect Solar Panels', requires: [], gives: ['inspected'], doneText: 'Panels checked and cleaned',
  },
  activate: {
    label: 'Activate Solar Panels', requires: ['inspected'], gives: ['active'], doneText: 'Panels are making electricity',
    failShort: 'the panels haven\'t been checked yet',
    failMessage: 'The robot tried to switch on the panels, but nobody checked them first — they\'re still covered in moon dust! What should a technician do <b>before</b> switching equipment on?',
  },
  connect: {
    label: 'Connect Panels to Battery', requires: ['active'], gives: ['connected'], doneText: 'Electricity is flowing to the battery',
    failShort: 'no electricity is coming from the panels',
    failMessage: 'The battery is connected, but no electricity is flowing — the panels aren\'t switched on yet! Electricity has to be <b>made</b> before it can be stored.',
  },
};

export class PowerCrisis extends Mission {
  constructor(game) {
    super(game, { id: 'power', number: 1, title: 'Power Crisis', concept: 'Sequence', target: game.world.solar.interactPoint });
    game.interactions.add({
      id: 'solar-console',
      position: game.world.solar.interactPoint,
      radius: 2.8,
      priority: 1,
      label: 'Fix the Solar Panels',
      isActive: () => this.isStage('travel'),
      onInteract: () => this.openPuzzle(),
    });
  }

  onBegin(run) {
    const g = this.game;
    this.world.setOxygenScreen(this.state.resources.oxygen, 'NORMAL', '#54D6AE');
    g.sound.alarm(2);
    this.ui.mission.alert('⚠ POWER LOW — 30%');
    this.setObjective('Walk to the <b>Solar Station</b> and press <kbd>E</kbd> at the control console.');
    g.setObjectiveTarget(this.target);
    this.specialistSays(
      'ahmed',
      'Power is down to 30%! As the base engineer, it\'s my job to fix it. Let\'s get to the Solar Station!',
      '{name}! Our power is down to 30%. Please go to the Solar Station — follow the glowing beacon!',
    ).then(() => {
      if (!this.alive(run)) return;
      if (this.playerId === 'amal') this.ui.mission.say('amal', 'I\'m the programmer — I\'ll write the code that starts the solar panels!');
      else this.ui.mission.say('control', 'Tip: hold W to walk and drag the mouse to look around.');
    });
  }

  openPuzzle() {
    this.ui.mission.clearDialogue();
    this.openChallenge({
      title: 'Restart the Solar Panels',
      story: 'The solar panels stopped working and the base is running out of power. Put the instructions in the <b>right order</b> so the robot can bring the electricity back.',
      blocks: BLOCKS,
      slots: [
        { prefix: 'Step 1' }, { prefix: 'Step 2' }, { prefix: 'Step 3' },
      ],
      startHint: '💡 Drag the three blocks into Steps 1–3 (or just click them). Think about what a careful engineer does first!',
      emptyHint: '🧩 Your program has empty steps. Put all three blocks into the program.',
      onRun: (program, api) => this.validate(program, api),
    });
  }

  async validate(program, api) {
    const attempt = this.countAttempt();
    const result = await runSequence(program, COMMANDS, api);
    if (result.ok) return { ok: true, hint: '🎉 Perfect order! Watch the base come back to life…' };
    let hint = `${result.message}<br><small>Remember: computers follow instructions in the exact order you give them.</small>`;
    if (attempt >= 3) hint += '<br>💡 <b>Extra tip:</b> Step 1 should be about <i>looking</i> at the panels.';
    return { ok: false, hint };
  }

  /** Run the player's program in the 3D world, block by block. */
  async execute(program, run) {
    const g = this.game;
    const W = this.world;
    const S = LOCATIONS.solar;
    g.beginCinematic();
    g.setObjectiveTarget(null);
    await g.moveCamera(new THREE.Vector3(S.x + 11, 7.5, S.z + 10), new THREE.Vector3(S.x, 1.5, S.z - 0.5), 1.5);
    if (!this.alive(run)) return;

    g.ui.hud.showRunner('Running your code', program.map((id, i) => `${i + 1}. ${COMMANDS[id].label}`));
    const effects = {
      inspect: () => W.scanPanels(),
      activate: () => W.activateSolar(),
      connect: () => W.connectPower(),
    };
    for (let i = 0; i < program.length; i++) {
      g.ui.hud.runnerStep(i);
      await effects[program[i]]();
      if (!this.alive(run)) return;
      await g.tweens.wait(0.3, 'mission');
    }
    g.ui.hud.runnerDone();

    // Lights come back on all over the base
    const H = LOCATIONS.habitat;
    g.moveCamera(new THREE.Vector3(H.x - 16, 9, H.z + 18), new THREE.Vector3(H.x, 2.5, H.z), 2.2);
    g.ui.hud.showCaption('⚡ Electricity flows from the panels to the battery — the base lights turn on!');
    await W.setBasePower(true);
    if (!this.alive(run)) return;
    g.tweenResource('power', 95, 1.5);
    g.tweenResource('food', this.state.resources.food + 10, 1.5);   // greenhouse grow lights back on
    W.bursts.spawn(new THREE.Vector3(H.x, 8, H.z), { color: '#FFC857', count: 90, speed: 7 });
    this.ui.mission.lastAlert = null; // the emergency is over
    this.ui.mission.alert('✅ POWER RESTORED — 95%', true);
    await g.tweens.wait(2.6, 'mission');
    if (!this.alive(run)) return;
    g.ui.hud.hideCaption();
    g.ui.hud.hideRunner();
    g.endCinematic();
    g.setObjectiveTarget(null);

    this.finish({
      emoji: '☀️',
      title: 'Power Restored!',
      subtitle: 'You solved the Power Crisis.',
      happened: 'Your code checked the solar panels, switched them on, and connected them to the batteries. The lights, windows and greenhouse grow-lights all came back on!',
      why: 'Each step needs the one before it. Panels must be checked before switching on, and they must make electricity before it can be stored in the battery.',
      conceptName: 'Sequence',
      conceptText: 'A <b>sequence</b> is a list of instructions that run in order, one after another. Change the order and you change the result!',
      code: '1. inspectPanels()\n2. activatePanels()\n3. connectToBattery()',
    });
  }
}
