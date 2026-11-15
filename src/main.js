// Entry point — Bahrain to the Moon: A Family Space Coding Adventure
// Fonts are bundled locally (no internet needed at the hackathon!)
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-500.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './styles/main.css';
import './styles/ui.css';
import { Game } from './game/Game.js';

async function waitForFonts() {
  // Canvas textures (signs, name tags) look best once Fredoka has loaded.
  // Never wait more than 2.5 s — the game works with fallback fonts too.
  if (!document.fonts?.load) return;
  const timeout = new Promise((r) => setTimeout(r, 2500));
  await Promise.race([
    Promise.all([document.fonts.load('700 40px Fredoka'), document.fonts.load('700 16px Nunito')]).catch(() => {}),
    timeout,
  ]);
}

function showError(err) {
  console.error(err);
  const el = document.getElementById('loading');
  el.classList.remove('hidden');
  el.innerHTML = `<div class="card" style="padding:28px;max-width:520px;text-align:center">
    <h2>😕 The Moon base couldn't start</h2>
    <p style="margin-top:10px;color:#AAB6D0">Your browser may not support WebGL, or it is turned off.
    Try the latest Chrome, Edge or Firefox.</p>
    <p style="margin-top:10px;font-size:.8rem;color:#F25F6C">${String(err?.message || err)}</p></div>`;
}

(async () => {
  try {
    await waitForFonts();
    const game = new Game(document.getElementById('game-canvas'));
    game.start();
    window.__game = game; // handy for debugging in the browser console
  } catch (err) {
    showError(err);
  }
})();
