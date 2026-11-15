// Finds the closest interactable object and shows the "Press E" prompt.
export class Interactions {
  constructor(promptEl, promptTextEl) {
    this.items = [];
    this.promptEl = promptEl;
    this.promptTextEl = promptTextEl;
    this.current = null;
    this.enabled = true;
    this.filter = null;   // optional (item) => boolean, e.g. only "Exit Rover" while driving
    promptEl.addEventListener('click', () => this.interact());
  }

  /**
   * @param {object} item { id, position: Vector3, radius, label, isActive?: () => boolean, onInteract: () => void, priority?: number }
   */
  add(item) {
    this.items.push({ radius: 2.6, priority: 0, isActive: () => true, ...item });
  }

  remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  update(playerPos) {
    let best = null, bestScore = Infinity;
    if (this.enabled) {
      for (const item of this.items) {
        if (this.filter && !this.filter(item)) continue;
        if (!item.isActive()) continue;
        const d = Math.hypot(playerPos.x - item.position.x, playerPos.z - item.position.z);
        if (d > item.radius) continue;
        const score = d - item.priority * 10;
        if (score < bestScore) { best = item; bestScore = score; }
      }
    }
    if (best !== this.current) {
      this.current = best;
      if (best) {
        this.promptTextEl.textContent = typeof best.label === 'function' ? best.label() : best.label;
        this.promptEl.classList.remove('hidden');
      } else {
        this.promptEl.classList.add('hidden');
      }
    }
  }

  interact() {
    if (!this.enabled || !this.current) return false;
    const item = this.current;
    this.current = null;
    this.promptEl.classList.add('hidden');
    item.onInteract();
    return true;
  }

  hidePrompt() {
    this.current = null;
    this.promptEl.classList.add('hidden');
  }
}
