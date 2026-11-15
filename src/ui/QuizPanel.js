// Code Output Quiz: read a tiny program, pick what it prints, earn stars.
import { QUIZ, QUIZ_REWARD } from '../coding/quizData.js';

export class QuizPanel {
  constructor(root, { state, sound }) {
    this.root = root;
    this.state = state;
    this.sound = sound;
    this.index = 0;
  }

  get isOpen() { return !this.root.classList.contains('hidden'); }

  open() {
    const firstUnsolved = QUIZ.findIndex((q) => !this.state.quizSolved.includes(q.id));
    this.index = firstUnsolved >= 0 ? firstUnsolved : 0;
    this.root.classList.remove('hidden');
    this.render();
  }

  close() {
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }

  render() {
    const q = QUIZ[this.index];
    const solved = this.state.quizSolved;
    this.answered = false;
    this.root.innerHTML = `
      <div class="card quiz-card">
        <div class="code-head">
          <span class="code-head__tag">Code Output Quiz</span>
          <h2>🧠 What will this code print?</h2>
          <span class="code-head__concept">${q.emoji} ${q.topic}</span>
          <button class="code-close" data-act="close" title="Close (Esc)">✕</button>
        </div>
        <div class="quiz-dots">${QUIZ.map((x, i) => `<button class="quiz-dot ${i === this.index ? 'current' : ''} ${solved.includes(x.id) ? 'done' : ''}" data-i="${i}" title="${x.topic}">${solved.includes(x.id) ? '⭐' : i + 1}</button>`).join('')}</div>
        <pre class="quiz-code">${q.code.replace(/</g, '&lt;')}</pre>
        <div class="quiz-options">${q.options.map((o, i) => `<button class="quiz-option" data-o="${i}"><span>${'ABCD'[i]}</span>${o}</button>`).join('')}</div>
        <div class="hint quiz-feedback">${solved.includes(q.id) ? '⭐ You already earned stars for this one — try it again for practice!' : `💡 Pick an answer. Correct = <b>+${QUIZ_REWARD} ⭐</b>`}</div>
        <div class="success-actions">
          <button class="btn btn--ghost" data-act="prev">← Previous</button>
          <button class="btn btn--primary" data-act="next">Next →</button>
        </div>
      </div>`;
    this.root.querySelector('[data-act="close"]').addEventListener('click', () => { this.sound.click(); this.close(); });
    this.root.querySelector('[data-act="prev"]').addEventListener('click', () => this.go(-1));
    this.root.querySelector('[data-act="next"]').addEventListener('click', () => this.go(1));
    this.root.querySelectorAll('.quiz-dot').forEach((b) => b.addEventListener('click', () => { this.sound.click(); this.index = Number(b.dataset.i); this.render(); }));
    this.root.querySelectorAll('.quiz-option').forEach((b) => b.addEventListener('click', () => this.answer(Number(b.dataset.o))));
  }

  go(step) {
    this.sound.click();
    this.index = (this.index + step + QUIZ.length) % QUIZ.length;
    this.render();
  }

  answer(i) {
    if (this.answered) return;
    const q = QUIZ[this.index];
    const fb = this.root.querySelector('.quiz-feedback');
    const buttons = [...this.root.querySelectorAll('.quiz-option')];
    if (i === q.answer) {
      this.answered = true;
      buttons[i].classList.add('correct');
      buttons.forEach((b) => { b.disabled = true; });
      let reward = '';
      if (!this.state.quizSolved.includes(q.id)) {
        this.state.quizSolved.push(q.id);
        this.state.addStars(QUIZ_REWARD, 'quiz');
        reward = ` <b>+${QUIZ_REWARD} ⭐</b>`;
      }
      this.sound.success();
      fb.className = 'hint quiz-feedback success';
      fb.innerHTML = `🎉 Correct!${reward}<br>${q.explain}`;
      const dot = this.root.querySelector(`.quiz-dot[data-i="${this.index}"]`);
      dot.classList.add('done');
      dot.textContent = '⭐';
    } else {
      // Mistakes are OK — let them try again
      buttons[i].classList.add('wrong');
      buttons[i].disabled = true;
      this.sound.error();
      fb.className = 'hint quiz-feedback error';
      fb.innerHTML = '🤔 Not quite! Read the code one line at a time, like the computer does, and try again.';
    }
  }
}
