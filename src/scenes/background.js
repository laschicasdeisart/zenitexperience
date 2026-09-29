// Fondo continuo (nebulosa + dos planos de estrellas) con su propia cámara,
// para que la profundidad nunca "salte" entre escenas.
import { el, slot, camLayer } from '../lib/util.js';
import { nebula, stars, grain } from '../lib/textures.js';

export function buildBackground({ gsap, tl, timing, stage }) {
  const { scenes: S, B } = timing;
  const cam = { x: 0, y: 0, z: 1 };
  const neb = camLayer(stage, cam, 0.15, 'bg');
  slot('bg-nebula', nebula(), 'bg-img', neb, { left: '-110px', top: '-190px', width: '1300px', height: '2300px' });
  const far = camLayer(stage, cam, 0.32, 'bg');
  el('img', 'bg-img', far, { left: '-260px', top: '-440px', width: '1600px', height: '2800px' }).src = stars(1600, 2800, 150, 11);
  const near = camLayer(stage, cam, 0.6, 'bg');
  el('img', 'bg-img', near, { left: '-260px', top: '-440px', width: '1600px', height: '2800px' }).src = stars(1600, 2800, 26, 29, 3);

  gsap.set(cam, { x: 0, y: 0, z: 1 });
  tl.to(cam, { z: 1.08, y: 20, duration: S.s2.start, ease: 'sine.inOut' }, 0);
  tl.to(cam, { z: 1.02, y: -10, duration: 1.4, ease: 'power2.inOut' }, S.s2.start);
  tl.to(cam, { z: 0.86, duration: 2.4, ease: 'power2.inOut' }, B('s2.universo') - 0.3);
  tl.to(cam, { z: 1.1, y: -60, duration: 1.3, ease: 'power3.inOut' }, S.s3.start - 0.1);
  tl.to(cam, { y: -210, x: 40, duration: S.s4.start - S.s3.start, ease: 'sine.inOut' }, S.s3.start + 1.2);
  tl.to(cam, { z: 1.04, y: -250, x: 60, duration: 1.6, ease: 'power2.inOut' }, S.s4.start);
  tl.to(cam, { z: 1.5, duration: 1.0, ease: 'power3.in' }, S.s5.start - 0.6);
  tl.to(cam, { z: 1.58, y: -270, duration: S.s5.dur + 0.4, ease: 'sine.out' }, S.s5.start + 0.4);
  return cam;
}

export function buildOverlay({ stage, onUpdate }) {
  const grainEl = el('div', 'layer grain', stage);
  grainEl.style.backgroundImage = `url(${grain()})`;
  el('div', 'layer vignette', stage);
  const guides = el('div', 'layer guides', stage);
  guides.innerHTML = '<i class="g-top"></i><i class="g-bottom"></i><i class="g-right"></i><i class="g-margin"></i>';
  // Grano "vivo" a 12 fps, determinista según el tiempo.
  onUpdate((t) => {
    const f = Math.floor(t * 12);
    grainEl.style.backgroundPosition = `${(f * 73) % 256}px ${(f * 151) % 256}px`;
  });
  return { grainEl, guides };
}
