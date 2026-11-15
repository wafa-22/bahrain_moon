// Runs the missions in order, handles restarts and the final celebration.
import { PowerCrisis } from './PowerCrisis.js';
import { OxygenEmergency } from './OxygenEmergency.js';
import { SolarStorm } from './SolarStorm.js';

export class MissionManager {
  constructor(game) {
    this.game = game;
    this.list = [new PowerCrisis(game), new OxygenEmergency(game), new SolarStorm(game)];
    this.active = null;
    this.snapshot = null;
  }

  get current() { return this.list[this.game.state.currentMission] || null; }
  isLast(mission) { return this.list.indexOf(mission) === this.list.length - 1; }

  startNext() {
    const mission = this.current;
    this.active = null;
    if (!mission) {
      this.game.showFinal();
      return;
    }
    this.snapshot = this.game.state.snapshot();
    this.active = mission;
    // Small pause so the player can look around before the next emergency
    const run = mission.run;
    this.game.tweens.wait(mission.number === 1 ? 0.5 : 2.5, 'mission').then(() => {
      if (this.active === mission && mission.run === run) mission.begin();
    });
  }

  /** Restart the mission in progress from its beginning. */
  restart() {
    const mission = this.active;
    if (!mission || !this.snapshot) return false;
    mission.cancel();
    this.game.state.restore(this.snapshot);
    this.game.resetForMission();
    mission.begin();
    return true;
  }

  /** Start the whole adventure again from Mission 01. */
  restartAll() {
    this.active?.cancel();
    this.active = null;
    this.game.state.resetProgress();
    this.game.resetForMission();
    this.startNext();
  }

  update(dt) {
    this.active?.update(dt);
  }
}
