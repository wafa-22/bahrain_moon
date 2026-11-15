// Tiny promise-based tween helper. Every animation in the game goes through
// one Tweens instance so it updates in the main loop (and can be awaited).

export const Ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  back: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  bounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export class Tweens {
  constructor() {
    this.list = [];
  }

  /**
   * Animate from 0 → 1 over `duration` seconds, calling update(k).
   * Returns a promise that resolves when finished (or when cancelled).
   */
  add({ duration = 1, delay = 0, ease = Ease.inOut, update = () => {}, group = 'default' }) {
    return new Promise((resolve) => {
      this.list.push({ t: -delay, duration: Math.max(0.0001, duration), ease, update, resolve, group });
    });
  }

  /** Wait for `seconds` using game time. */
  wait(seconds, group = 'default') {
    return this.add({ duration: seconds, group });
  }

  /** Cancel all tweens in a group (they resolve immediately, without finishing). */
  cancelGroup(group) {
    this.list = this.list.filter((tw) => {
      if (tw.group === group) { tw.resolve(); return false; }
      return true;
    });
  }

  update(dt) {
    if (!this.list.length) return;
    const done = [];
    for (const tw of this.list) {
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.duration);
      tw.update(tw.ease(k));
      if (k >= 1) done.push(tw);
    }
    if (done.length) {
      this.list = this.list.filter((tw) => !done.includes(tw));
      done.forEach((tw) => tw.resolve());
    }
  }
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
