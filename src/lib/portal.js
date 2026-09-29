// Portal circular retrofuturista: disco con remolino azul/violeta y anillos finos.
import { el, sv, uid } from './util.js';

export function makePortal(parent, x, y, r) {
  const size = r * 2.6;
  const root = el('div', 'portal', parent, {
    left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`,
  });
  const glow = el('div', 'portal-glow', root);
  const disk = el('div', 'portal-disk', root, {
    left: `${size / 2 - r}px`, top: `${size / 2 - r}px`, width: `${r * 2}px`, height: `${r * 2}px`,
  });
  const swirl = el('div', 'portal-swirl', disk);
  el('div', 'portal-depth', disk);
  const g = uid('pg');
  const s = sv('svg', { class: 'portal-rings', viewBox: `0 0 ${size} ${size}`, width: size, height: size }, root);
  s.innerHTML = `
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#004aad"/><stop offset="0.55" stop-color="#cb6ce6"/><stop offset="1" stop-color="#edeef0"/>
    </linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r + 2}" fill="none" stroke="url(#${g})" stroke-width="${r * 0.05}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r * 1.1}" fill="none" stroke="#edeef0" stroke-opacity="0.55" stroke-width="2"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r * 1.2}" fill="none" stroke="#edeef0" stroke-opacity="0.22" stroke-width="1.5" stroke-dasharray="2 12" stroke-linecap="round"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r * 0.9}" fill="none" stroke="#edeef0" stroke-opacity="0.25" stroke-width="1.5"/>`;
  return { root, disk, swirl, glow, rings: s };
}
