// Reusable visual block-programming interface used by every mission.
// Blocks can be dragged into slots OR simply clicked (click = auto-place / remove).

const CATEGORY_NAMES = {
  sensor: 'Check', power: 'Power', action: 'Action', condition: 'Condition', safety: 'Safety', danger: 'Action',
};

export class CodingBlocks {
  constructor(root, sound) {
    this.root = root;
    this.sound = sound;
    this.config = null;
    this.program = [];
    this.running = false;
    this.drag = null;
    this.onMove = (e) => this.handleMove(e);
    this.onUp = (e) => this.handleUp(e);
  }

  get isOpen() { return !!this.config; }

  /**
   * @param {object} config
   *  missionTag, title, concept, story (HTML string),
   *  blocks: [{ id, label, icon, category }],
   *  slots:  [{ prefix, logic?, indent?, accepts?: string[], placeholder? }],
   *  onRun:  async (program, api) => ({ ok, hint })
   *  onSuccess, onClose
   */
  open(config) {
    this.config = config;
    this.program = config.slots.map(() => null);
    this.running = false;
    this.renderShell();
    this.render();
    this.root.classList.remove('hidden');
  }

  close(silent = false) {
    if (!this.config) return;
    const cfg = this.config;
    this.config = null;
    this.endDrag();
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
    if (!silent) cfg.onClose?.();
  }

  // ---------- Rendering ----------
  renderShell() {
    const c = this.config;
    this.root.innerHTML = `
      <div class="card code-card">
        <div class="code-head">
          <span class="code-head__tag">${c.missionTag}</span>
          <h2>🧩 ${c.title}</h2>
          <span class="code-head__concept">Concept: ${c.concept}</span>
          <button class="code-close" title="Close (Esc)">✕</button>
        </div>
        <p class="code-story">${c.story}</p>
        <div class="code-body">
          <div class="code-col">
            <h3>Blocks <small>drag or click</small></h3>
            <div class="palette" data-zone="palette"></div>
          </div>
          <div class="code-col">
            <h3>${c.programTitle || 'Your Program'} <small>${c.programHint || 'blocks run from top to bottom'}</small></h3>
            <div class="program">
              <div class="program-start">▶ When Run Code is pressed</div>
              <div class="slots"></div>
            </div>
            <div class="tests ${c.showTests ? '' : 'hidden'}"></div>
            <div class="code-output"><div class="ln">// Output will appear here</div></div>
          </div>
        </div>
        <div class="code-foot">
          <div class="hint">${c.startHint || '💡 Build your program, then press <b>Run Code</b>.'}</div>
          <button class="btn btn--ghost" data-act="reset">↺ Reset</button>
          <button class="btn btn--mint btn--lg" data-act="run">▶ Run Code</button>
        </div>
      </div>`;
    this.$ = (sel) => this.root.querySelector(sel);
    this.$('.code-close').addEventListener('click', () => { if (!this.running) { this.sound.click(); this.close(); } });
    this.$('[data-act="reset"]').addEventListener('click', () => this.reset());
    this.$('[data-act="run"]').addEventListener('click', () => this.run());
  }

  blockHTML(block) {
    return `<div class="block block--${block.category}" data-id="${block.id}" title="${CATEGORY_NAMES[block.category] || ''} block">
      <span class="block__icon">${block.icon || '•'}</span><span>${block.label}</span></div>`;
  }

  render() {
    const c = this.config;
    const used = new Set(this.program.filter(Boolean));
    const palette = this.$('.palette');
    const free = c.blocks.filter((b) => !used.has(b.id));
    palette.innerHTML = free.length ? free.map((b) => this.blockHTML(b)).join('') : '<div class="palette-empty">All blocks are in your program ✨</div>';

    const slotsEl = this.$('.slots');
    slotsEl.innerHTML = c.slots.map((s, i) => {
      const block = this.program[i] ? c.blocks.find((b) => b.id === this.program[i]) : null;
      return `<div class="slot-row ${s.indent ? 'indent' : ''}">
        <span class="slot-prefix ${s.logic ? 'slot-prefix--logic' : ''}">${s.prefix}</span>
        <div class="slot" data-slot="${i}" data-placeholder="${s.placeholder || 'Drop a block here'}">${block ? this.blockHTML(block) : ''}</div>
      </div>`;
    }).join('');
    slotsEl.style.display = 'flex';
    slotsEl.style.flexDirection = 'column';
    slotsEl.style.gap = '10px';
    slotsEl.style.marginTop = '10px';

    this.root.querySelectorAll('.block').forEach((el) => {
      el.addEventListener('pointerdown', (e) => this.startPointer(e, el));
    });
  }

  // ---------- Placement logic ----------
  accepts(slotIndex, blockId) {
    const slot = this.config.slots[slotIndex];
    if (!slot.accepts) return true;
    const block = this.config.blocks.find((b) => b.id === blockId);
    return slot.accepts.includes(block.category);
  }

  place(blockId, slotIndex) {
    const from = this.program.indexOf(blockId);
    const existing = this.program[slotIndex];
    if (from >= 0) this.program[from] = null;
    // Swap: the block already in the target slot moves to where the dragged block came from
    if (existing && existing !== blockId) {
      if (from >= 0 && this.accepts(from, existing)) this.program[from] = existing;
    }
    this.program[slotIndex] = blockId;
    this.sound.drop();
    this.clearStatus();
    this.render();
  }

  removeToPalette(blockId) {
    const i = this.program.indexOf(blockId);
    if (i >= 0) this.program[i] = null;
    this.sound.pick();
    this.clearStatus();
    this.render();
  }

  autoPlace(blockId) {
    const idx = this.program.findIndex((v, i) => v === null && this.accepts(i, blockId));
    if (idx >= 0) this.place(blockId, idx);
    else this.setHint('🤔 There\'s no empty slot that fits this block. Remove a block first, or drag it onto a slot to swap.', 'error');
  }

  reset() {
    if (this.running) return;
    this.sound.click();
    this.program = this.config.slots.map(() => null);
    this.clearStatus();
    this.render();
    this.setHint(this.config.startHint || '💡 Build your program, then press <b>Run Code</b>.');
    this.$('.code-output').innerHTML = '<div class="ln">// Output will appear here</div>';
    const tests = this.$('.tests');
    if (tests) tests.innerHTML = '';
  }

  // ---------- Drag & drop (pointer events: mouse + touch) ----------
  startPointer(e, el) {
    if (this.running) return;
    e.preventDefault();
    const inSlot = el.closest('.slot');
    this.drag = {
      id: el.dataset.id, el, startX: e.clientX, startY: e.clientY, moved: false,
      fromSlot: inSlot ? Number(inSlot.dataset.slot) : -1, ghost: null,
    };
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
  }

  handleMove(e) {
    const d = this.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6) {
      d.moved = true;
      const rect = d.el.getBoundingClientRect();
      d.offX = d.startX - rect.left; d.offY = d.startY - rect.top;
      d.ghost = d.el.cloneNode(true);
      d.ghost.classList.add('block-ghost');
      d.ghost.style.width = `${rect.width}px`;
      document.body.appendChild(d.ghost);
      d.el.classList.add('dragging-source');
      this.sound.pick();
    }
    if (!d.moved) return;
    d.ghost.style.left = `${e.clientX - d.offX}px`;
    d.ghost.style.top = `${e.clientY - d.offY}px`;
    this.root.querySelectorAll('.slot').forEach((s) => s.classList.remove('drop-ok', 'drop-bad'));
    const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.slot');
    if (slot) slot.classList.add(this.accepts(Number(slot.dataset.slot), d.id) ? 'drop-ok' : 'drop-bad');
  }

  handleUp(e) {
    const d = this.drag;
    if (!d) return;
    if (!d.moved) {
      // Simple click
      this.endDrag();
      if (d.fromSlot >= 0) this.removeToPalette(d.id);
      else this.autoPlace(d.id);
      return;
    }
    const target = document.elementFromPoint(e.clientX, e.clientY);
    this.endDrag();
    const slot = target?.closest?.('.slot');
    if (slot) {
      const idx = Number(slot.dataset.slot);
      if (this.accepts(idx, d.id)) this.place(d.id, idx);
      else {
        this.sound.error();
        const s = this.config.slots[idx];
        this.setHint(`🧐 That slot needs a <b>${(s.accepts || []).map((a) => CATEGORY_NAMES[a]).join(' / ')}</b> block.`, 'error');
        this.render();
      }
    } else if (target?.closest?.('[data-zone="palette"]') && d.fromSlot >= 0) {
      this.removeToPalette(d.id);
    } else {
      this.render();
    }
  }

  endDrag() {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    if (this.drag?.ghost) this.drag.ghost.remove();
    this.drag = null;
    this.root.querySelectorAll?.('.slot').forEach((s) => s.classList.remove('drop-ok', 'drop-bad'));
  }

  // ---------- Running ----------
  setHint(html, type = '') {
    const h = this.$('.hint');
    if (!h) return;
    h.className = `hint ${type}`;
    h.innerHTML = html;
  }

  clearStatus() {
    this.root.querySelectorAll('.slot').forEach((s) => s.classList.remove('running', 'passed', 'failed'));
  }

  api() {
    return {
      highlight: (i, status) => {
        const slot = this.root.querySelector(`.slot[data-slot="${i}"]`);
        if (!slot) return;
        slot.classList.remove('running', 'passed', 'failed');
        if (status) slot.classList.add(status);
        if (status === 'passed') this.sound.step();
      },
      log: (text, type = '') => {
        const out = this.$('.code-output');
        if (!out) return;
        if (out.dataset.fresh !== '1') { out.innerHTML = ''; out.dataset.fresh = '1'; }
        const ln = document.createElement('div');
        ln.className = `ln ${type}`;
        ln.textContent = text;
        out.appendChild(ln);
        out.scrollTop = out.scrollHeight;
      },
      tests: (html) => { const t = this.$('.tests'); if (t) t.innerHTML = html; },
      wait: (s) => new Promise((r) => setTimeout(r, s * 1000)),
      hint: (html, type) => this.setHint(html, type),
    };
  }

  async run() {
    if (this.running || !this.config) return;
    const cfg = this.config;
    this.sound.click();
    this.clearStatus();
    const out = this.$('.code-output');
    out.dataset.fresh = '0';

    if (this.program.some((v) => v === null) && !cfg.allowEmpty) {
      this.sound.error();
      this.setHint(cfg.emptyHint || '🧩 Your program has empty slots. Fill every slot before running it!', 'error');
      this.root.querySelectorAll('.slot').forEach((s) => { if (!s.children.length) s.classList.add('failed'); });
      return;
    }

    this.running = true;
    this.root.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    this.setHint('⚙️ Running your code…');
    let result;
    try {
      result = await cfg.onRun([...this.program], this.api());
    } catch (err) {
      console.error(err);
      result = { ok: false, hint: 'Something went wrong while running the code. Try again!' };
    }
    if (!this.config) return; // closed while running (e.g. mission restarted)
    this.running = false;
    this.root.querySelectorAll('button').forEach((b) => { b.disabled = false; });

    if (result.ok) {
      this.setHint(result.hint || '🎉 Your code works!', 'success');
      this.sound.success();
      await new Promise((r) => setTimeout(r, 900));
      if (!this.config) return;
      const program = [...this.program];
      this.close(true);
      cfg.onSuccess?.(program);
    } else {
      this.sound.error();
      this.setHint(`🤖 ${result.hint}`, 'error');
    }
  }
}
