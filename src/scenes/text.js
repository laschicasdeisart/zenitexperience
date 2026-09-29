// Textos en pantalla: exclusivamente los del guion, por frases completas.
// Las palabras entre [corchetes] llevan una tira de papel con el degradado de marca.
import { el } from '../lib/util.js';

const PHRASES = [
  { id: 't1', html: 'Tu formación<br>ya funciona.', in: (t) => t.T('s1', 0.25), out: (t) => t.B('s1.question') - 0.3 },
  { id: 't2', html: '¿Se siente así<br>[por dentro?]', in: (t) => t.B('s1.question'), out: (t) => t.scenes.s2.start - 0.25 },
  { id: 't3', html: 'Tu propia [app.]', in: (t) => t.B('s2.app'), out: (t) => t.B('s2.juego') - 1.15 },
  { id: 't4', html: 'Tu propio [juego.]', in: (t) => t.B('s2.juego'), out: (t) => t.B('s2.universo') - 0.2 },
  { id: 't5', html: 'Tu propio<br>[universo.]', in: (t) => t.B('s2.universo'), out: (t) => t.scenes.s3.start - 0.05 },
  { id: 't6', html: 'Saben por dónde<br>[seguir.]', in: (t) => t.T('s3', 0.6), out: (t) => t.B('s3.avance') - 0.3 },
  { id: 't7', html: 'Ven cuánto han<br>[avanzado.]', in: (t) => t.B('s3.avance'), out: (t) => t.scenes.s4.start + 0.2 },
  { id: 't8', html: 'Una formación<br>que deja [huella.]', in: (t) => t.T('s4', 0.8), out: (t) => t.scenes.s5.start - 0.55 },
];

export function buildText({ gsap, tl, timing, stage }) {
  const hud = el('div', 'layer hud', stage);
  for (const p of PHRASES) {
    const e = el('div', 'phrase', hud);
    e.id = p.id;
    e.innerHTML = p.html.replace(/\[(.+?)\]/g, '<span class="hl"><i class="strip"></i><span>$1</span></span>');
    const strips = e.querySelectorAll('.strip');
    const tIn = p.in(timing), tOut = p.out(timing);
    gsap.set(e, { autoAlpha: 0, y: 34, filter: 'blur(12px)' });
    gsap.set(strips, { scaleX: 0 });
    tl.to(e, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }, tIn);
    tl.to(strips, { scaleX: 1, duration: 0.55, ease: 'power3.inOut' }, tIn + 0.18);
    tl.to(e, { autoAlpha: 0, y: -22, filter: 'blur(8px)', duration: 0.35, ease: 'power2.in' }, tOut);
  }
  return hud;
}
