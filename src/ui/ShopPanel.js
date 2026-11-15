// Generic shop / menu modal used by the Tool Shop, Alien Egg Incubator and Galaxy Portal.
export class ShopPanel {
  constructor(root, sound) {
    this.root = root;
    this.sound = sound;
    this.config = null;
  }

  get isOpen() { return !this.root.classList.contains('hidden'); }

  /**
   * @param {() => object} build  returns { tag, title, subtitle, items: [{ icon, name, desc, badge, button: { label, disabled, primary, onClick } }], footer }
   */
  open(build) {
    this.build = build;
    this.root.classList.remove('hidden');
    this.render();
  }

  refresh() { if (this.isOpen) this.render(); }

  close() {
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
    this.build = null;
  }

  render() {
    const c = this.build();
    this.root.innerHTML = `
      <div class="card shop-card">
        <div class="code-head">
          <span class="code-head__tag">${c.tag}</span>
          <h2>${c.title}</h2>
          <span class="code-head__concept">⭐ ${c.stars}</span>
          <button class="code-close" data-act="close" title="Close (Esc)">✕</button>
        </div>
        ${c.subtitle ? `<p class="code-story">${c.subtitle}</p>` : ''}
        <div class="shop-items">
          ${c.items.map((it, i) => `
            <div class="shop-item ${it.highlight ? 'highlight' : ''}">
              <div class="shop-item__icon">${it.icon}</div>
              <div class="shop-item__body">
                <div class="shop-item__name">${it.name} ${it.badge ? `<span class="shop-badge">${it.badge}</span>` : ''}</div>
                <div class="shop-item__desc">${it.desc}</div>
              </div>
              ${it.button ? `<button class="btn ${it.button.primary ? 'btn--primary' : 'btn--secondary'} btn--sm" data-i="${i}" ${it.button.disabled ? 'disabled' : ''}>${it.button.label}</button>` : ''}
            </div>`).join('')}
        </div>
        ${c.footer ? `<p class="muted shop-footer">${c.footer}</p>` : ''}
      </div>`;
    this.root.querySelector('[data-act="close"]').addEventListener('click', () => { this.sound.click(); this.close(); });
    this.root.querySelectorAll('.shop-item button').forEach((b) => b.addEventListener('click', () => {
      const it = c.items[Number(b.dataset.i)];
      it.button.onClick();
    }));
  }
}
