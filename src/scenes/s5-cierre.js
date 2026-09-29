// Escena 5 (27–30 s): tras atravesar el portal, cierre limpio con el nombre y el CTA.
// Si existe assets/logo.(svg|png) sustituye automáticamente al nombre escrito.
import { el, slot } from '../lib/util.js';

export function buildS5({ gsap, tl, timing, stage }) {
  const { scenes: S, B } = timing;
  const root = el('div', 'layer', stage);
  root.id = 's5';
  el('div', 'layer s5-bg', root);
  const horizon = el('div', 's5-horizon', root);
  const flash = el('div', 'layer s5-flash', root);
  const brand = el('div', 's5-brand', root);
  const name = el('div', 's5-name', brand);
  name.innerHTML = 'ZENIT<br>EXPERIENCE';
  slot('logo', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 's5-logo optional', brand);
  const rule = el('i', 's5-rule', root);
  const cta = el('div', 's5-cta', root);
  cta.textContent = 'Visualiza tu formación';

  const t0 = S.s5.start;
  gsap.set(root, { autoAlpha: 0 });
  gsap.set(flash, { opacity: 1, scale: 1.25 });
  gsap.set(horizon, { y: 260 });
  gsap.set(brand, { autoAlpha: 0, y: 30, filter: 'blur(14px)', letterSpacing: '0.34em' });
  gsap.set(rule, { scaleX: 0 });
  gsap.set(cta, { autoAlpha: 0, y: 24 });

  tl.to(root, { autoAlpha: 1, duration: 0.14, ease: 'none' }, t0 - 0.16);
  tl.to(flash, { opacity: 0, scale: 1, duration: 1.0, ease: 'power2.out' }, t0 - 0.05);
  tl.to(horizon, { y: 0, duration: 1.6, ease: 'expo.out' }, t0);
  tl.to(brand, { autoAlpha: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.06em', duration: 1.1, ease: 'expo.out' }, t0 + 0.4);
  tl.to(rule, { scaleX: 1, duration: 0.8, ease: 'power3.inOut' }, B('s5.cta') - 0.25);
  tl.to(cta, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, B('s5.cta'));
  return root;
}
