// Resource HUD, objective compass, code-runner overlay and cinematic captions.
import { RESOURCE_KEYS } from '../game/GameState.js';

const RESOURCE_INFO = {
  power: { name: 'Power', icon: '⚡', color: 'var(--yellow)' },
  oxygen: { name: 'Oxygen', icon: '🫁', color: 'var(--blue)' },
  food: { name: 'Food', icon: '🍎', color: 'var(--coral)' },
  safety: { name: 'Safety', icon: '🛡️', color: 'var(--mint)' },
};

export class HUD {
  constructor(state) {
    this.root = document.getElementById('hud');
    this.state = state;
    this.displayed = {};
    this.buildResources();
    state.on('resources', (r) => this.updateResources(r));
    this.updateResources(state.resources, true);

    this.compassArrow = document.querySelector('.compass__arrow');
    this.distanceEl = document.getElementById('objective-distance');

    this.runner = document.createElement('div');
    this.runner.className = 'runner card hidden';
    this.root.appendChild(this.runner);

    this.caption = document.createElement('div');
    this.caption.className = 'cine-caption hidden';
    this.root.appendChild(this.caption);
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  buildResources() {
    const el = document.getElementById('resources');
    el.innerHTML = RESOURCE_KEYS.map((k) => {
      const r = RESOURCE_INFO[k];
      return `<div class="res" id="res-${k}" style="--res-color:${r.color}">
        <div class="res__icon">${r.icon}</div>
        <div class="res__name">${r.name}</div>
        <div class="res__value">0%</div>
        <div class="res__bar"><div class="res__fill" style="width:0%"></div></div>
      </div>`;
    }).join('');
  }

  updateResources(resources, instant = false) {
    RESOURCE_KEYS.forEach((k) => {
      const card = document.getElementById(`res-${k}`);
      const value = resources[k];
      card.querySelector('.res__fill').style.width = `${value}%`;
      card.classList.toggle('low', value < 40);
      const from = this.displayed[k] ?? value;
      this.displayed[k] = value;
      const valueEl = card.querySelector('.res__value');
      if (instant || from === value) { valueEl.textContent = `${value}%`; return; }
      // Count up / down smoothly
      card.classList.add('bump');
      setTimeout(() => card.classList.remove('bump'), 300);
      const start = performance.now();
      const step = (now) => {
        const k2 = Math.min(1, (now - start) / 1000);
        valueEl.textContent = `${Math.round(from + (value - from) * k2)}%`;
        if (k2 < 1 && this.displayed[k] === value) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /** angle: radians relative to camera forward (0 = straight ahead). */
  updateCompass(angle, distance) {
    if (distance == null) {
      this.distanceEl.textContent = '';
      this.compassArrow.parentElement.style.visibility = 'hidden';
      return;
    }
    this.compassArrow.parentElement.style.visibility = 'visible';
    // The arrow glyph points right by default, so subtract 90°.
    this.compassArrow.style.transform = `rotate(${angle - Math.PI / 2}rad)`;
    this.distanceEl.textContent = distance < 3 ? 'You\'re here!' : `${Math.round(distance)} m`;
  }

  // ---- Program runner overlay ----
  showRunner(title, lines) {
    this.runner.innerHTML = `<h4>▶ ${title}</h4>${lines.map((l) => `<div class="runner__line">${l}</div>`).join('')}`;
    this.runner.classList.remove('hidden');
  }
  runnerStep(i) {
    this.runner.querySelectorAll('.runner__line').forEach((el, j) => {
      el.classList.toggle('active', j === i);
      if (j < i) el.classList.add('done');
    });
  }
  runnerDone() {
    this.runner.querySelectorAll('.runner__line').forEach((el) => { el.classList.remove('active'); el.classList.add('done'); });
  }
  hideRunner() { this.runner.classList.add('hidden'); }

  // ---- Captions during in-game cutscenes ----
  showCaption(text) {
    this.caption.innerHTML = text;
    this.caption.classList.remove('hidden');
    this.caption.style.animation = 'none';
    void this.caption.offsetWidth;
    this.caption.style.animation = '';
  }
  hideCaption() { this.caption.classList.add('hidden'); }
}
