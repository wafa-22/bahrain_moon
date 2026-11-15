// Splash screen + "How to play" + generic screen helpers.
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  if (id) document.getElementById(id).classList.remove('hidden');
}

export function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
export function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

export class MainMenu {
  constructor({ onStart, sound }) {
    document.getElementById('btn-start').addEventListener('click', () => {
      sound.unlock();
      sound.click();
      onStart();
    });
    document.getElementById('btn-howto').addEventListener('click', () => { sound.unlock(); sound.click(); openModal('howto'); });
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => { sound.click(); closeModal(btn.dataset.close); });
    });
  }

  show() { showScreen('screen-splash'); }
}
