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

    // ⭐ Stars counter + current tool
    this.starsEl = document.createElement('div');
    this.starsEl.className = 'stars-pill';
    this.starsEl.innerHTML = '<span class="stars-pill__icon">⭐</span><span class="stars-pill__value">0</span><span class="stars-pill__tool">⛏️ Lunar Pickaxe</span>';
    document.getElementById('resources').appendChild(this.starsEl);
    this.starsValue = this.starsEl.querySelector('.stars-pill__value');
    this.toolEl = this.starsEl.querySelector('.stars-pill__tool');
    this.shownStars = state.stars;
    this.starsValue.textContent = state.stars;
    state.on('stars', ({ stars, delta }) => this.updateStars(stars, delta));

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

  updateStars(stars, delta) {
    const from = this.shownStars;
    this.shownStars = stars;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 600);
      this.starsValue.textContent = Math.round(from + (stars - from) * k);
      if (k < 1 && this.shownStars === stars) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    this.starsEl.classList.remove('bump');
    void this.starsEl.offsetWidth;
    this.starsEl.classList.add('bump');
    // Floating "+6 ⭐" toast
    const toast = document.createElement('div');
    toast.className = `stars-toast ${delta < 0 ? 'minus' : ''}`;
    toast.textContent = `${delta > 0 ? '+' : ''}${delta} ⭐`;
    this.starsEl.appendChild(toast);
    setTimeout(() => toast.remove(), 1200);
  }

  setTool(name) { this.toolEl.textContent = name; }

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
