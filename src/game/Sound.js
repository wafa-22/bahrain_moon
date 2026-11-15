// Synthesized sound effects with the Web Audio API — no audio files needed.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  /** Browsers only allow audio after a user gesture, so we create it lazily. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  tone(freq, { start = 0, duration = 0.15, type = 'sine', volume = 0.5, slideTo = null } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  click() { this.tone(660, { duration: 0.08, type: 'triangle', volume: 0.3 }); }
  pick() { this.tone(520, { duration: 0.08, type: 'triangle', volume: 0.25, slideTo: 780 }); }
  drop() { this.tone(780, { duration: 0.1, type: 'triangle', volume: 0.25, slideTo: 420 }); }
  step() { this.tone(880, { duration: 0.12, type: 'sine', volume: 0.25 }); }

  error() {
    this.tone(220, { duration: 0.18, type: 'square', volume: 0.15 });
    this.tone(160, { start: 0.18, duration: 0.25, type: 'square', volume: 0.15 });
  }

  success() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, { start: i * 0.11, duration: 0.3, type: 'triangle', volume: 0.35 }));
  }

  powerUp() {
    this.tone(120, { duration: 1.2, type: 'sawtooth', volume: 0.12, slideTo: 880 });
    this.tone(240, { start: 0.2, duration: 1.0, type: 'sine', volume: 0.2, slideTo: 1200 });
  }

  whoosh() { this.tone(300, { duration: 0.6, type: 'sine', volume: 0.15, slideTo: 90 }); }

  alarm(times = 3) {
    for (let i = 0; i < times; i++) {
      this.tone(880, { start: i * 0.5, duration: 0.22, type: 'square', volume: 0.12 });
      this.tone(660, { start: i * 0.5 + 0.25, duration: 0.22, type: 'square', volume: 0.12 });
    }
  }

  door() { this.tone(90, { duration: 0.9, type: 'sawtooth', volume: 0.1, slideTo: 60 }); }
  mine() {
    this.tone(180, { duration: 0.09, type: 'square', volume: 0.12 });
    this.tone(1200, { start: 0.02, duration: 0.07, type: 'triangle', volume: 0.12 });
  }
  rockBreak() {
    this.tone(140, { duration: 0.35, type: 'sawtooth', volume: 0.12, slideTo: 60 });
    this.tone(900, { start: 0.05, duration: 0.15, type: 'triangle', volume: 0.12, slideTo: 1400 });
  }
  coin() { this.tone(988, { duration: 0.07, type: 'triangle', volume: 0.18 }); this.tone(1319, { start: 0.07, duration: 0.12, type: 'triangle', volume: 0.18 }); }
  hatch() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, { start: i * 0.08, duration: 0.25, type: 'triangle', volume: 0.25 })); }
  portal() { this.tone(200, { duration: 1.0, type: 'sine', volume: 0.2, slideTo: 1600 }); this.tone(300, { start: 0.1, duration: 0.9, type: 'triangle', volume: 0.12, slideTo: 2000 }); }
  engine() { this.tone(70, { duration: 0.5, type: 'sawtooth', volume: 0.08, slideTo: 140 }); }
  jump() { this.tone(300, { duration: 0.25, type: 'sine', volume: 0.15, slideTo: 600 }); }
}
