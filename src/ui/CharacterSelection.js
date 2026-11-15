// Character selection (Screen 2) and spacesuit customization (Screen 3).
import { CHARACTERS, ACCENT_COLORS, VISOR_COLORS, getCharacter } from '../characters/characterData.js';
import { showScreen } from './MainMenu.js';

export class CharacterSelection {
  /**
   * @param {object} opts { state, sound, onSelect(id), onLook(), onBack(), onNext(), onCustomBack(), onLaunch() }
   */
  constructor(opts) {
    this.opts = opts;
    const { state, sound } = opts;
    this.state = state;
    this.sound = sound;

    // ---- Cards ----
    const cards = document.getElementById('character-cards');
    cards.innerHTML = CHARACTERS.map((c) => `
      <div class="char-card" data-id="${c.id}" style="--card-color:${c.color};--card-glow:${c.color}88" tabindex="0">
        <div class="char-card__top">
          <div class="char-card__avatar">${c.name[0]}</div>
          <div><div class="char-card__name">${c.name}</div><div class="char-card__arabic">${c.arabic}</div></div>
        </div>
        <div class="char-card__role">${c.role}</div>
        <div class="char-card__home">📍 ${c.hometown} · ${c.hometownAr}</div>
        <div class="char-card__desc">${c.description}</div>
        <div class="char-card__traits">${c.traits.map((t) => `<span>${t}</span>`).join('')}</div>
        <button class="char-card__btn">Select</button>
      </div>`).join('');
    cards.querySelectorAll('.char-card').forEach((card) => {
      const pick = () => this.select(card.dataset.id);
      card.addEventListener('click', pick);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
    });

    document.getElementById('btn-select-back').addEventListener('click', () => { sound.click(); opts.onBack(); });
    document.getElementById('btn-select-next').addEventListener('click', () => { sound.click(); opts.onNext(); });

    // ---- Customization ----
    this.buildSwatches('swatch-accent', ACCENT_COLORS, 'accent');
    this.buildSwatches('swatch-visor', VISOR_COLORS, 'visor');
    const on = document.getElementById('btn-lamp-on');
    const off = document.getElementById('btn-lamp-off');
    const setLamp = (v) => {
      state.headlamp = v;
      on.classList.toggle('chip--active', v);
      off.classList.toggle('chip--active', !v);
      sound.click();
      opts.onLook();
    };
    on.addEventListener('click', () => setLamp(true));
    off.addEventListener('click', () => setLamp(false));
    document.getElementById('btn-custom-back').addEventListener('click', () => { sound.click(); opts.onCustomBack(); });
    document.getElementById('btn-launch').addEventListener('click', () => { sound.click(); opts.onLaunch(); });
  }

  buildSwatches(id, colors, key) {
    const el = document.getElementById(id);
    el.innerHTML = colors.map((c) => `<button class="swatch ${this.state[key] === c.value ? 'active' : ''}" title="${c.name}" data-value="${c.value}" style="background:${c.value}"></button>`).join('');
    el.querySelectorAll('.swatch').forEach((sw) => {
      sw.addEventListener('click', () => {
        this.state[key] = sw.dataset.value;
        el.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s === sw));
        this.sound.pick();
        this.opts.onLook();
      });
    });
  }

  select(id) {
    this.state.characterId = id;
    document.querySelectorAll('.char-card').forEach((c) => {
      const sel = c.dataset.id === id;
      c.classList.toggle('selected', sel);
      c.querySelector('.char-card__btn').textContent = sel ? '✓ Selected' : 'Select';
    });
    const c = getCharacter(id);
    const sub = document.querySelector('#screen-select .screen-header p');
    if (sub) sub.innerHTML = `<b style="color:${c.color}">${c.name}:</b> “${c.greeting}”`;
    this.sound.pick();
    this.opts.onSelect(id);
  }

  showSelect() {
    showScreen('screen-select');
    this.select(this.state.characterId);
  }

  showCustom() { showScreen('screen-custom'); }
}
