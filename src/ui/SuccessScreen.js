// Mission success (Screen 6), final completion (Screen 7) and the science info panel.
import { RESOURCE_KEYS } from '../game/GameState.js';

const RES_LABEL = { power: '⚡ Power', oxygen: '🫁 Oxygen', food: '🍎 Food', safety: '🛡️ Safety' };

/** Simple canvas confetti burst. */
export function confetti(container, duration = 3500) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  container.appendChild(canvas);
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width; canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  const colors = ['#6046C8', '#54B8F5', '#FFC857', '#FF7894', '#54D6AE', '#F7F8FF'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 120,
    y: canvas.height * 0.25,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 3,
    s: 5 + Math.random() * 7,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  const frame = (now) => {
    const t = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.vy += 0.22; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= 0.99;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / duration);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    });
    if (t < duration) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}

export class SuccessScreen {
  constructor(sound) {
    this.sound = sound;
    this.root = document.getElementById('success-screen');
    this.finalRoot = document.getElementById('final-screen');
    this.infoRoot = document.getElementById('info-panel');
  }

  get isOpen() { return !this.root.classList.contains('hidden') || !this.finalRoot.classList.contains('hidden'); }

  /**
   * @param {object} d { emoji, title, subtitle, happened, why, conceptName, conceptText, code, before, after, attempts, onContinue, continueLabel }
   */
  show(d) {
    const changes = RESOURCE_KEYS
      .filter((k) => d.before[k] !== d.after[k])
      .map((k) => {
        const diff = d.after[k] - d.before[k];
        return `<span class="res-change">${RES_LABEL[k]} ${d.before[k]}% → <b class="${diff > 0 ? 'up' : 'down'}">${d.after[k]}%</b></span>`;
      }).join('');
    const tries = d.attempts <= 1 ? 'Solved on the first try — brilliant!' : `Solved in ${d.attempts} tries — testing and fixing is what real programmers do!`;
    this.root.innerHTML = `
      <div class="card success-card">
        <div class="success-emoji">${d.emoji}</div>
        <h2>${d.title}</h2>
        <p class="success-sub">${d.subtitle}</p>
        <div class="stars"><span>⭐</span><span style="animation-delay:.15s">⭐</span><span style="animation-delay:.3s">⭐</span></div>
        <p class="muted" style="margin-bottom:10px">${tries}</p>
        <div class="res-changes">${changes}${d.starsEarned ? `<span class="res-change"><b class="up">+${d.starsEarned} ⭐</b> stars earned</span>` : ''}</div>
        <div class="learn-grid">
          <div class="learn-box"><h4>🔎 What happened</h4><p>${d.happened}</p></div>
          <div class="learn-box"><h4>💡 Why it worked</h4><p>${d.why}</p></div>
          <div class="learn-box"><h4>🧠 ${d.conceptName}</h4><p>${d.conceptText}</p>${d.code ? `<code>${d.code}</code>` : ''}</div>
        </div>
        <div class="success-actions">
          <button class="btn btn--secondary" data-act="info">🔭 Learn More</button>
          <button class="btn btn--primary btn--lg" data-act="continue">${d.continueLabel || 'Continue Adventure →'}</button>
        </div>
      </div>`;
    this.root.classList.remove('hidden');
    this.sound.success();
    confetti(this.root.querySelector('.success-card'));
    this.root.querySelector('[data-act="info"]').addEventListener('click', () => { this.sound.click(); this.showInfo(); });
    this.root.querySelector('[data-act="continue"]').addEventListener('click', () => {
      this.sound.click();
      this.root.classList.add('hidden');
      d.onContinue?.();
    });
  }

  showFinal({ name, resources, onReplay, onExplore, onMenu }) {
    this.finalRoot.innerHTML = `
      <div class="card final-card">
        <div class="success-emoji">🏆</div>
        <h2>Lunar Base Saved!</h2>
        <p class="success-sub">Amazing work, ${name}! The whole family is safe and the Bahrain Moon Base is running. 🇧🇭🌙</p>
        <div class="badges">
          <div class="badge"><div class="badge__icon">☀️</div><h4>Sequence</h4><p>Instructions run in order. You restored power step by step.</p></div>
          <div class="badge" style="animation-delay:.15s"><div class="badge__icon">🫁</div><h4>IF / ELSE</h4><p>Programs make decisions. Your code turns on backup oxygen only when it's needed.</p></div>
          <div class="badge" style="animation-delay:.3s"><div class="badge__icon">🛡️</div><h4>Problem-Solving</h4><p>You planned the safest steps to protect your family from the solar storm.</p></div>
        </div>
        <div class="res-changes">${RESOURCE_KEYS.map((k) => `<span class="res-change">${RES_LABEL[k]} <b class="up">${resources[k]}%</b></span>`).join('')}</div>
        <div class="success-actions">
          <button class="btn btn--secondary" data-act="explore">🚶 Keep Exploring</button>
          <button class="btn btn--secondary" data-act="info">🔭 Moon Science</button>
          <button class="btn btn--primary btn--lg" data-act="replay">🔄 Play Again</button>
          <button class="btn btn--ghost" data-act="menu">🏠 Main Menu</button>
        </div>
      </div>`;
    this.finalRoot.classList.remove('hidden');
    this.sound.success();
    confetti(this.finalRoot.querySelector('.final-card'), 5000);
    const on = (act, fn) => this.finalRoot.querySelector(`[data-act="${act}"]`).addEventListener('click', () => {
      this.sound.click();
      if (act !== 'info') this.finalRoot.classList.add('hidden');
      fn();
    });
    on('replay', onReplay);
    on('explore', onExplore);
    on('menu', onMenu);
    on('info', () => this.showInfo());
  }

  hideAll() {
    this.root.classList.add('hidden');
    this.finalRoot.classList.add('hidden');
    this.infoRoot.classList.add('hidden');
  }

  /** Optional science panel with real NASA learning resources. */
  showInfo() {
    this.infoRoot.innerHTML = `
      <div class="card info-card">
        <h2>🔭 Moon Science</h2>
        <div class="info-item"><h4>☀️ Solar power</h4><p>Solar panels turn sunlight into electricity. On the Moon, one "day" lasts about two Earth weeks, followed by a long, cold night — so bases need batteries to store energy.</p></div>
        <div class="info-item"><h4>🫁 Oxygen</h4><p>The Moon has almost no air. Astronauts depend on life-support systems that supply, recycle and monitor oxygen, with backups in case something goes wrong.</p></div>
        <div class="info-item"><h4>🌪️ Solar storms</h4><p>The Sun can release bursts of high-energy particles. The Moon has no thick atmosphere or global magnetic field to block them, so astronauts shelter behind shielding until the danger passes. Nobody can stop a solar storm — but good planning keeps people safe.</p></div>
        <div class="info-item"><h4>🇧🇭 Flags on the Moon</h4><p>There's no wind on the Moon! That's why the flag in our base hangs from a horizontal rod, just like the flags real astronauts placed.</p></div>
        <div class="info-item info-links">
          <h4>📚 Learn more from NASA</h4>
          <a href="https://www.nasa.gov/humans-in-space/artemis/" target="_blank" rel="noopener">NASA Artemis — returning humans to the Moon</a>
          <a href="https://science.nasa.gov/moon/" target="_blank" rel="noopener">NASA Science — Earth's Moon</a>
          <a href="https://spaceplace.nasa.gov/solar-activity/" target="_blank" rel="noopener">NASA Space Place — Sunspots and Solar Flares</a>
        </div>
        <button class="btn btn--primary" data-act="close">Close</button>
      </div>`;
    this.infoRoot.classList.remove('hidden');
    this.infoRoot.querySelector('[data-act="close"]').addEventListener('click', () => {
      this.sound.click();
      this.infoRoot.classList.add('hidden');
    });
  }
}
