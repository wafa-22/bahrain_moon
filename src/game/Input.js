// Keyboard state. Movement keys are read every frame; one-shot keys fire callbacks.
export class Input {
  constructor() {
    this.keys = new Set();
    this.handlers = {};
    this.enabled = true;
    window.addEventListener('keydown', (e) => {
      // Don't steal keys while typing in a form field
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!e.repeat && this.handlers[k]) this.handlers[k].forEach((fn) => fn(e));
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  onKey(key, fn) {
    (this.handlers[key] ||= []).push(fn);
  }

  /** Returns {x, z} in -1..1 (x = right, z = forward). */
  movement() {
    if (!this.enabled) return { x: 0, z: 0 };
    const k = this.keys;
    let x = 0, z = 0;
    if (k.has('w') || k.has('arrowup')) z += 1;
    if (k.has('s') || k.has('arrowdown')) z -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    const len = Math.hypot(x, z);
    return len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
  }

  clear() { this.keys.clear(); }
}
