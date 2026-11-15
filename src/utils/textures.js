// Procedural canvas textures — the game ships with zero image assets,
// so nothing can fail to load.
import * as THREE from 'three';
import { seededRandom } from './noise.js';

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Bahrain flag: white band at the hoist with five white points into red. */
export function drawBahrainFlag(ctx, x, y, w, h) {
  ctx.fillStyle = '#CE1126';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#FFFFFF';
  const band = w * 0.25;
  const tip = w * 0.12;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + band, y);
  for (let i = 0; i < 5; i++) {
    const y0 = y + (i * h) / 5;
    ctx.lineTo(x + band + tip, y0 + h / 10);
    ctx.lineTo(x + band, y0 + h / 5);
  }
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
}

let flagTex = null;
export function flagTexture() {
  if (!flagTex) flagTex = canvasTexture(256, 160, (ctx, w, h) => drawBahrainFlag(ctx, 0, 0, w, h));
  return flagTex;
}

/** Rounded sign with big friendly text. */
export function signTexture(text, { bg = '#172448', fg = '#F7F8FF', accent = '#FFC857', icon = '', width = 512, height = 128 } = {}) {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = bg;
    roundRect(ctx, 4, 4, w - 8, h - 8, 26);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = `700 ${Math.floor(h * 0.42)}px Fredoka, 'Trebuchet MS', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${icon ? icon + ' ' : ''}${text}`, w / 2, h / 2 + 3);
  });
}

/** Mission emblem for the landing pad. */
export function padTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#3b3f66';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#FFC857';
    ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 6;
    ctx.setLineDash([24, 18]);
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.33, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#F7F8FF';
    ctx.font = `700 ${w * 0.3}px Fredoka, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BH', w / 2, h / 2 + 8);
  });
}

/** Yellow / navy hazard stripes. */
export function hazardTexture() {
  const tex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#FFC857';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#172448';
    for (let x = -h; x < w + h; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, h); ctx.lineTo(x + 24, h); ctx.lineTo(x + 24 + h, 0); ctx.lineTo(x + h, 0);
      ctx.closePath(); ctx.fill();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Solar cell grid. */
export function solarCellTexture() {
  return canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#1b2a6b';
    ctx.fillRect(0, 0, w, h);
    const cols = 8, rows = 5;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const g = ctx.createLinearGradient(0, 0, w / cols, h / rows);
        g.addColorStop(0, '#5aa8ff');
        g.addColorStop(1, '#2847b8');
        ctx.fillStyle = g;
        ctx.fillRect(i * (w / cols) + 3, j * (h / rows) + 3, w / cols - 6, h / rows - 6);
      }
    }
  });
}

/** Stylized Earth: oceans, continents and clouds. */
export function earthTexture() {
  const rand = seededRandom(42);
  return canvasTexture(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3f8ff0');
    g.addColorStop(0.5, '#1f6fd6');
    g.addColorStop(1, '#3f8ff0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const blob = (cx, cy, r, color) => {
      ctx.fillStyle = color;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(cx + (rand() - 0.5) * r * 1.6, cy + (rand() - 0.5) * r, r * (0.35 + rand() * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    blob(120, 90, 46, '#54c27a');
    blob(150, 170, 34, '#54c27a');
    blob(290, 80, 50, '#6fcf6a');
    blob(300, 150, 36, '#d9b46a'); // desert (Arabian peninsula-ish)
    blob(420, 120, 44, '#54c27a');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillRect(0, h - 14, w, 14);
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 20 + rand() * 40, 5 + rand() * 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

/** Soft radial glow for sprites. */
export function glowTexture(color = '#ffffff') {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color + 'aa');
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * A console screen whose content can be redrawn at runtime
 * (e.g. "POWER 30% — OFFLINE" → "ONLINE").
 */
export class ScreenDisplay {
  constructor(width = 256, height = 160) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  show({ title, value, status, color = '#F25F6C' }) {
    const { ctx } = this;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = '#0a1230';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    roundRect(ctx, 6, 6, w - 12, h - 12, 14);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#AAB6D0';
    ctx.font = `700 ${h * 0.14}px Fredoka, sans-serif`;
    ctx.fillText(title, w / 2, h * 0.27);
    ctx.fillStyle = color;
    ctx.font = `700 ${h * 0.32}px Fredoka, sans-serif`;
    ctx.fillText(value, w / 2, h * 0.6);
    ctx.font = `700 ${h * 0.13}px Fredoka, sans-serif`;
    ctx.fillText(status, w / 2, h * 0.84);
    this.texture.needsUpdate = true;
  }
}
