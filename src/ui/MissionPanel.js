// Mission objective card, alert banner and character dialogue box.
import { getCharacter } from '../characters/characterData.js';

export class MissionPanel {
  constructor() {
    this.tag = document.getElementById('objective-tag');
    this.title = document.getElementById('objective-title');
    this.text = document.getElementById('objective-text');
    this.card = document.getElementById('objective');
    this.alertEl = document.getElementById('alert-banner');
    this.dialogue = document.getElementById('dialogue');
    this.dAvatar = document.getElementById('dialogue-avatar');
    this.dName = document.getElementById('dialogue-name');
    this.dText = document.getElementById('dialogue-text');
    this.queue = [];
    this.speaking = false;
    this.typeTimer = null;
    this.hideTimer = null;
    this.dialogue.addEventListener('click', () => this.next());
  }

  setObjective({ tag, title, text }) {
    this.tag.textContent = tag;
    this.title.textContent = title;
    this.text.innerHTML = text;
    this.card.style.animation = 'none';
    void this.card.offsetWidth;
    this.card.style.animation = 'popIn .45s var(--ease)';
  }

  alert(text, good = false) {
    this.alertEl.textContent = text;
    this.alertEl.classList.toggle('good', good);
    this.alertEl.classList.remove('hidden');
    clearTimeout(this.alertTimer);
    if (good) this.alertTimer = setTimeout(() => this.clearAlert(), 4000);
  }

  clearAlert() { this.alertEl.classList.add('hidden'); }

  /**
   * Queue a line of dialogue.
   * @param {string} speakerId  character id, or 'control' for Mission Control
   */
  say(speakerId, text, duration = null) {
    return new Promise((resolve) => {
      this.queue.push({ speakerId, text, duration, resolve });
      if (!this.speaking) this.next();
    });
  }

  clearDialogue() {
    this.queue.forEach((q) => q.resolve());
    this.queue = [];
    this.current?.resolve();
    this.current = null;
    this.speaking = false;
    clearInterval(this.typeTimer);
    clearTimeout(this.hideTimer);
    this.dialogue.classList.add('hidden');
  }

  next() {
    clearInterval(this.typeTimer);
    clearTimeout(this.hideTimer);
    // If still typing, finish the line instantly on click
    if (this.current && this.typing) {
      this.typing = false;
      this.dText.textContent = this.current.text;
      this.scheduleHide(this.current);
      return;
    }
    this.current?.resolve();
    const line = this.queue.shift();
    this.current = line || null;
    if (!line) {
      this.speaking = false;
      this.dialogue.classList.add('hidden');
      return;
    }
    this.speaking = true;
    if (line.speakerId === 'control') {
      this.dAvatar.textContent = '📡';
      this.dAvatar.style.background = 'var(--navy)';
      this.dName.textContent = 'Mission Control';
    } else {
      const c = getCharacter(line.speakerId);
      this.dAvatar.textContent = c.name[0];
      this.dAvatar.style.background = c.color;
      this.dName.textContent = `${c.name} · ${c.role}`;
    }
    this.dialogue.classList.remove('hidden');
    this.dialogue.style.animation = 'none';
    void this.dialogue.offsetWidth;
    this.dialogue.style.animation = '';
    // Typewriter effect
    let i = 0;
    this.typing = true;
    this.dText.textContent = '';
    this.typeTimer = setInterval(() => {
      i += 2;
      this.dText.textContent = line.text.slice(0, i);
      if (i >= line.text.length) {
        clearInterval(this.typeTimer);
        this.typing = false;
        this.scheduleHide(line);
      }
    }, 22);
  }

  scheduleHide(line) {
    const ms = line.duration ?? Math.max(2600, line.text.length * 55);
    this.hideTimer = setTimeout(() => this.next(), ms);
  }
}
