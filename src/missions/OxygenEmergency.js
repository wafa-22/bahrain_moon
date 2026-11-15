// MISSION 02 — OXYGEN EMERGENCY (concept: IF / ELSE)
import * as THREE from 'three';
import { Mission } from './Mission.js';
import { evaluateIfElse } from '../coding/CodeValidator.js';
import { LOCATIONS } from '../game/World.js';

const BLOCKS = [
  { id: 'low', label: 'oxygen < 40%', icon: '🫁', category: 'condition' },
  { id: 'backup', label: 'Activate Backup Oxygen', icon: '💨', category: 'action' },
  { id: 'power', label: 'power > 90%', icon: '⚡', category: 'condition' },
  { id: 'normal', label: 'Keep Normal System Running', icon: '✅', category: 'action' },
  { id: 'high', label: 'oxygen ≥ 40%', icon: '🫁', category: 'condition' },
  { id: 'off', label: 'Turn Off Oxygen System', icon: '⛔', category: 'danger' },
];
const CONDITIONS = {
  low: { sensor: 'oxygen', op: '<', value: 40, code: 'oxygen < 40' },
  high: { sensor: 'oxygen', op: '>=', value: 40, code: 'oxygen >= 40' },
  power: { sensor: 'power', op: '>', value: 90, code: 'power > 90' },
};
const ACTIONS = {
  backup: { label: 'Activate Backup Oxygen', code: 'activateBackupOxygen()' },
  normal: { label: 'Keep Normal System Running', code: 'keepNormalSystem()' },
  off: { label: 'Turn Off Oxygen System', code: 'turnOffOxygen()' },
};
const TEST_LEVELS = [25, 38, 40, 70, 95];
const DROP_TO = 35;

export class OxygenEmergency extends Mission {
  constructor(game) {
    super(game, { id: 'oxygen', number: 2, title: 'Oxygen Emergency', concept: 'IF / ELSE', target: game.world.oxygen.interactPoint });
    game.interactions.add({
      id: 'oxygen-console',
      position: game.world.oxygen.interactPoint,
      radius: 2.8,
      priority: 1,
      label: 'Program the Backup Oxygen',
      isActive: () => this.isStage('travel'),
      onInteract: () => this.openPuzzle(),
    });
  }

  onBegin(run) {
    const g = this.game;
    g.sound.alarm(3);
    this.ui.mission.alert('⚠ OXYGEN DROPPING!');
    this.setObjective('Go to the <b>Oxygen Station</b> and program the backup system.');
    g.setObjectiveTarget(this.target);
    // Story event: the oxygen level falls (gently) to 35%
    this.dropDone = false;
    const from = this.state.resources.oxygen;
    g.tweens.add({
      duration: 3.5,
      group: 'mission',
      update: (k) => {
        if (!this.alive(run) || this.dropDone) return;
        const v = Math.round(from + (DROP_TO - from) * k);
        this.state.setResource('oxygen', v);
        this.world.setOxygenScreen(v, v < 40 ? 'LOW! ⚠' : 'DROPPING', '#F25F6C');
      },
    });
    this.specialistSays(
      'maryam',
      'Oxygen is dropping! I\'m the life support specialist — I know the backup system must switch on by itself whenever oxygen gets too low. Let\'s program it!',
      '{name}, oxygen is dropping! The backup system must switch on automatically when oxygen gets too low. Can you program it at the Oxygen Station?',
    );
  }

  openPuzzle() {
    this.ui.mission.clearDialogue();
    // If the player is very fast, finish the oxygen drop now so the story matches the numbers
    if (!this.dropDone) {
      this.dropDone = true;
      this.state.setResource('oxygen', DROP_TO);
      this.world.setOxygenScreen(DROP_TO, 'LOW! ⚠', '#F25F6C');
    }
    this.openChallenge({
      title: 'Smart Backup Oxygen',
      story: `Oxygen is at <b>${this.state.resources.oxygen}%</b>. Build a rule that makes the right choice <b>for any oxygen level</b>: turn on the backup when oxygen is too low (under 40%), otherwise keep the normal system running.`,
      blocks: BLOCKS,
      slots: [
        { prefix: 'IF', logic: true, accepts: ['condition'], placeholder: 'Drop a condition block' },
        { prefix: 'THEN', logic: true, indent: true, accepts: ['action', 'danger'], placeholder: 'What happens if it\'s TRUE?' },
        { prefix: 'ELSE', logic: true, indent: true, accepts: ['action', 'danger'], placeholder: 'What happens otherwise?' },
      ],
      programHint: 'your code will be tested at different oxygen levels',
      showTests: true,
      startHint: '💡 Purple blocks are <b>conditions</b> (questions with a yes/no answer). Blue blocks are <b>actions</b>.',
      emptyHint: '🧩 Fill the IF, THEN and ELSE slots before running your code.',
      onRun: (program, api) => this.validate(program, api),
    });
  }

  toProgram([cond, then, otherwise]) {
    return { condition: CONDITIONS[cond], condId: cond, then, else: otherwise };
  }

  async validate(raw, api) {
    this.countAttempt();
    const program = this.toProgram(raw);

    if (program.then === 'off' || program.else === 'off') {
      api.highlight(program.then === 'off' ? 1 : 2, 'failed');
      return { ok: false, hint: 'Never turn off the oxygen system — astronauts need it to breathe! Choose a safer action.' };
    }

    api.log('🧪 Testing your code with different oxygen levels…', 'info');
    const results = [];
    const power = this.state.resources.power;
    for (const level of TEST_LEVELS) {
      const reading = { oxygen: level, power };
      const { passes, action } = evaluateIfElse(program, reading);
      const expected = level < 40 ? 'backup' : 'normal';
      const ok = action === expected;
      results.push({ level, action, ok, passes });
      api.highlight(0, 'running');
      api.log(`oxygen = ${level}% → condition is ${passes ? 'TRUE' : 'FALSE'} → ${ACTIONS[action].label} ${ok ? '✓' : '✗'}`, ok ? 'ok' : 'err');
      api.tests(results.map((r) => `<div class="test ${r.ok ? 'pass' : 'fail'}"><b>Oxygen ${r.level}%</b><br>${r.ok ? '✅' : '❌'} ${ACTIONS[r.action].label}</div>`).join(''));
      await api.wait(0.35);
    }
    api.highlight(0, null);

    const failed = results.find((r) => !r.ok);
    if (!failed) {
      [0, 1, 2].forEach((i) => api.highlight(i, 'passed'));
      return { ok: true, hint: `🎉 All ${TEST_LEVELS.length} tests passed! Your code makes the safe choice at every oxygen level.` };
    }
    api.highlight(failed.passes ? 1 : 2, 'failed');
    if (program.condId === 'power') {
      api.highlight(0, 'failed');
      return { ok: false, hint: 'Your IF checks <b>power</b>, but this emergency is about <b>oxygen</b>. Which sensor should the backup system watch?' };
    }
    if (program.then === program.else) {
      return { ok: false, hint: 'THEN and ELSE do the same thing, so the condition doesn\'t matter! One branch should handle <b>low</b> oxygen and the other <b>normal</b> oxygen.' };
    }
    return {
      ok: false,
      hint: `When oxygen is <b>${failed.level}%</b>, your code chose “${ACTIONS[failed.action].label}”. Is that the safe choice? Check which branch runs when the condition is TRUE and which runs when it's FALSE.`,
    };
  }

  async execute(raw, run) {
    const g = this.game;
    const W = this.world;
    const O = LOCATIONS.oxygen;
    const program = this.toProgram(raw);
    const level = this.state.resources.oxygen;
    const { passes, action } = evaluateIfElse(program, { oxygen: level, power: this.state.resources.power });

    g.beginCinematic();
    g.setObjectiveTarget(null);
    await g.moveCamera(new THREE.Vector3(O.x - 9, 6.5, O.z + 9), new THREE.Vector3(O.x + 0.8, 2, O.z - 1), 1.5);
    if (!this.alive(run)) return;
    const condLabel = BLOCKS.find((b) => b.id === program.condId).label;
    g.ui.hud.showRunner('Running your code', [
      `IF ${condLabel} &nbsp;(now: ${level}%)`,
      `→ ${passes ? 'TRUE' : 'FALSE'}: ${ACTIONS[action].label}`,
    ]);
    g.ui.hud.runnerStep(0);
    await g.tweens.wait(1.2, 'mission');
    if (!this.alive(run)) return;
    g.ui.hud.runnerStep(1);

    g.ui.hud.showCaption('💨 Backup oxygen ON — the tank fills and fresh air flows to the habitat.');
    await W.activateOxygen();
    if (!this.alive(run)) return;
    W.setOxygenScreen(92, 'BACKUP ON ✓', '#54D6AE');
    g.tweenResource('oxygen', 92, 1.6);
    g.tweenResource('power', this.state.resources.power - 8, 1.6); // the backup pump uses some electricity
    this.ui.mission.lastAlert = null; // the emergency is over
    this.ui.mission.alert('✅ OXYGEN SAFE — 92%', true);
    g.ui.hud.runnerDone();
    await g.tweens.wait(2.4, 'mission');
    if (!this.alive(run)) return;
    g.ui.hud.hideCaption();
    g.ui.hud.hideRunner();
    g.endCinematic();
    g.setObjectiveTarget(null);

    const c = program.condition.code;
    this.finish({
      emoji: '🫁',
      title: 'Oxygen Is Safe!',
      subtitle: 'You solved the Oxygen Emergency.',
      happened: `Oxygen was at ${level}%. Your IF condition checked the level, saw it was too low, and ran the backup oxygen. Oxygen is now back to 92%.`,
      why: 'Your rule makes the right choice for every oxygen level you tested. The backup only runs when it\'s needed — it uses some power (−8%), so we don\'t want it on all the time.',
      conceptName: 'IF / ELSE',
      conceptText: '<b>IF</b> a condition is true, the program does one thing. <b>ELSE</b> (otherwise), it does something different. This is how programs make decisions!',
      code: `if (${c}) {\n  ${ACTIONS[program.then].code};\n} else {\n  ${ACTIONS[program.else].code};\n}`,
    });
  }
}
