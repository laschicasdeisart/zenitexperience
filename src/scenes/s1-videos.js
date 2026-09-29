// Escena 1 (0–6 s): tarjetas de vídeo se acumulan hasta ocultar un pequeño planeta.
// La cámara se acerca; la acumulación se detiene con la pregunta y, al final,
// las tarjetas se separan como dos hojas de una puerta para abrir el portal.
import { el, slot, camLayer, CX } from '../lib/util.js';
import { mulberry32 } from '../lib/noise.js';
import { planet, videoThumb } from '../lib/textures.js';

const PY = 1090; // centro vertical del planeta
const N = 14;

export function buildS1({ gsap, tl, timing, stage }) {
  const { scenes: S, B, T } = timing;
  const root = el('div', 'layer', stage);
  root.id = 's1';
  const cam = { x: 0, y: 0, z: 1 };

  const back = camLayer(root, cam, 0.85);
  const glow = el('div', 's1-glow', back, { left: `${CX - 330}px`, top: `${PY - 330}px` });
  const pwrap = el('div', 's1-planet', back, { left: `${CX - 150}px`, top: `${PY - 150}px` });
  slot('planet-intro', planet({
    size: 420, seed: 5, kind: 'rock', craters: 9, atmosphere: '#cb6ce6',
    stops: [[0, '#1c1436'], [0.45, '#5b3f8f'], [0.75, '#a57fcf'], [1, '#efe2f7']],
  }), 'cutout fill', pwrap);

  const front = camLayer(root, cam, 1.0);
  const pile = el('div', 'layer', front);
  const rnd = mulberry32(42);
  const thumbs = Array.from({ length: 6 }, (_, i) => videoThumb(i));
  const tStop = B('s1.question') - 0.12;
  const tFirst = T('s1', 0.2);
  const cards = [];

  for (let i = 0; i < N; i++) {
    const k = i / (N - 1);
    const ang = i * 2.399 + 0.6;
    const rad = 160 * (1 - k * 0.85) + rnd() * 26;
    const x = CX + Math.cos(ang) * rad * 1.15;
    const y = PY + Math.sin(ang) * rad * 0.85;
    const rot = (rnd() - 0.5) * 34;
    const card = el('div', 'card', pile, { left: `${x - 170}px`, top: `${y - 97}px` });
    slot(`video-${(i % 6) + 1}`, thumbs[i % 6], 'fill', card);
    if (i % 5 === 1) el('i', 'tape', card, { transform: `rotate(${(rnd() - 0.5) * 30}deg)`, left: `${40 + rnd() * 200}px` });
    cards.push({ card, x, y, rot });

    // Las dos primeras ya están en el primer fotograma (miniatura del reel).
    const land = i < 2 ? -1 : tFirst + (tStop - 0.45 - tFirst) * Math.pow((i - 2) / (N - 3), 1.35);
    const a0 = ang + (rnd() - 0.5) * 0.9;
    const from = {
      x: Math.cos(a0) * 1400, y: Math.sin(a0) * 1400, rotation: rot + (rnd() - 0.5) * 80, scale: 1.3, autoAlpha: 1,
    };
    if (land < 0) {
      gsap.set(card, { x: 0, y: 0, rotation: rot, scale: 1, autoAlpha: 1 });
    } else {
      gsap.set(card, from);
      tl.to(card, { x: 0, y: 0, rotation: rot, scale: 1, duration: 0.5, ease: 'power3.out' }, land);
      // pequeño asentamiento al caer sobre el montón
      tl.to(pile, { y: 3, duration: 0.07, ease: 'power1.out', yoyo: true, repeat: 1 }, land + 0.42);
    }
  }

  // La acumulación se detiene con la pregunta: el montón pesa.
  gsap.set(pile, { filter: 'brightness(1) saturate(1)', scale: 1, transformOrigin: `${CX}px ${PY}px` });
  tl.to(pile, { filter: 'brightness(0.72) saturate(0.55)', scale: 0.975, duration: 0.9, ease: 'power2.out' }, tStop);
  gsap.set(glow, { autoAlpha: 0.9, scale: 1 });
  tl.to(glow, { autoAlpha: 0.35, scale: 0.9, duration: 1.2, ease: 'power2.out' }, tStop);

  // Cámara: acercamiento lento durante toda la escena.
  gsap.set(cam, { x: 0, y: 0, z: 1 });
  tl.to(cam, { z: 1.18, y: 60, duration: S.s2.start - S.s1.start + 0.4, ease: 'sine.inOut' }, S.s1.start);

  // Apertura: las tarjetas se separan hacia los lados y dejan ver el portal.
  const tOpen = S.s2.start - 0.2;
  cards.forEach(({ card, x, y }, i) => {
    const side = x < CX ? -1 : 1;
    tl.to(card, {
      x: side * (820 + (i % 3) * 90), y: (y - PY) * 1.6 + (i % 2 ? 60 : -60),
      rotation: `+=${side * (18 + (i % 4) * 7)}`, scale: 1.15,
      duration: 1.05, ease: 'power3.inOut',
    }, tOpen + Math.abs(x - CX) / 2000);
  });
  tl.to(pile, { filter: 'brightness(1) saturate(1)', duration: 0.5 }, tOpen);
  tl.to(pwrap, { scale: 0.55, autoAlpha: 0, duration: 0.7, ease: 'power2.in' }, tOpen + 0.15);
  tl.to(glow, { autoAlpha: 0, duration: 0.5 }, tOpen + 0.2);
  tl.to(root, { autoAlpha: 0, duration: 0.2 }, tOpen + 1.3);
  return cam;
}
