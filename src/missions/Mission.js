// Base class shared by all missions: stages, dialogue helpers, coding hand-off,
// success screen. Each mission subclass fills in its own story and logic.
import { getCharacter } from '../characters/characterData.js';

export class Mission {
  constructor(game, { id, number, title, concept, target }) {
    this.game = game;
    this.id = id;
    this.number = number;
    this.title = title;
    this.concept = concept;
    this.target = target;        // Vector3 the player must reach
    this.stage = 'idle';         // idle → travel → coding → executing → done
    this.run = 0;                // increases on every (re)start so old async work stops
  }

  get state() { return this.game.state; }
  get world() { return this.game.world; }
  get ui() { return this.game.ui; }
  get tag() { return `Mission ${String(this.number).padStart(2, '0')}`; }
  get playerId() { return this.state.characterId; }
  get playerName() { return getCharacter(this.playerId).name; }
  get attempts() { return this.state.attempts[this.id] || 0; }

  /** True while this mission is the one being played and in the given stage. */
  isStage(stage) { return this.game.missions.active === this && this.stage === stage; }

  begin() {
    this.run += 1;
    this.stage = 'travel';
    this.before = { ...this.state.resources };
    this.state.attempts[this.id] = 0;
    this.onBegin(this.run);
  }

  cancel() {
    this.run += 1;
    this.stage = 'idle';
  }

  alive(run) { return run === this.run && this.game.missions.active === this; }

  /**
   * The specialist for this mission talks. If the player IS the specialist,
   * they get a first-person line instead.
   */
  specialistSays(specialistId, ifPlayer, ifOther) {
    if (this.playerId === specialistId) return this.ui.mission.say(specialistId, ifPlayer);
    return this.ui.mission.say(specialistId, ifOther.replace('{name}', this.playerName));
  }

  setObjective(text) {
    this.ui.mission.setObjective({ tag: this.tag, title: this.title, text });
  }

  openChallenge(config) {
    this.stage = 'coding';
    this.game.openCoding({
      missionTag: this.tag,
      concept: this.concept,
      ...config,
      onClose: () => {
        if (this.stage === 'coding') this.stage = 'travel';
        this.game.closeCoding();
      },
      onSuccess: (program) => {
        this.game.closeCoding();
        this.stage = 'executing';
        this.execute(program, this.run);
      },
    });
  }

  /** Count a Run Code press; returns the attempt number. */
  countAttempt() { return this.state.countAttempt(this.id); }

  finish(data) {
    this.stage = 'done';
    this.state.completeMission(this.id);
    this.ui.success.show({
      ...data,
      before: this.before,
      after: { ...this.state.resources },
      attempts: this.attempts,
      onContinue: () => this.game.missions.startNext(),
      continueLabel: this.game.missions.isLast(this) ? 'Finish Adventure 🏆' : 'Continue Adventure →',
    });
  }

  // Subclasses implement:
  onBegin() {}
  execute() {}
  update() {}
}
