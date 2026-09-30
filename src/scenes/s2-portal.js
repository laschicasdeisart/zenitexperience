// Escena 2a (6–9 s): se abre el portal y de él surge un móvil ("Tu propia app.").
// Después la cámara entra en la pantalla: su contenido es un mapa a escala del
// universo real, así que al llenar el encuadre el corte es invisible.
import { el, slot, CX, CY, W } from '../lib/util.js';
import { makePortal } from '../lib/portal.js';

const PHONE_W = 360, PHONE_H = 740, BEZEL = 12;
const SCREEN_W = PHONE_W - BEZEL * 2, SCREEN_H = PHONE_H - BEZEL * 2;
const K = SCREEN_W / W; // escala del mapa dentro de la pantalla

export function buildS2({ gsap, tl, timing, stage, universe }) {
  const { scenes: S, B } = timing;
  const root = el('div', 'layer', stage);
  root.id = 's2';

  const portal = makePortal(root, CX, 1045, 250); // donde estaba el planeta
  const phone = el('div', 'phone', root, {
    left: `${CX - PHONE_W / 2}px`, top: `${CY - PHONE_H / 2}px`, width: `${PHONE_W}px`, height: `${PHONE_H}px`,
  });
  const screen = el('div', 'phone-screen', phone, {
    left: `${BEZEL}px`, top: `${BEZEL}px`, width: `${SCREEN_W}px`, height: `${SCREEN_H}px`,
  });
  // Mapa: copia del núcleo del universo, a escala.
  const map = universe.coreMap.cloneNode(true);
  map.classList.add('phone-map');
  Object.assign(map.style, { transform: `translateY(${(SCREEN_H - 1920 * K) / 2}px) scale(${K})` });
  screen.appendChild(map);
  // Interfaz de la app, sin texto: progreso, isla y barra de pestañas.
  const chrome = el('div', 'phone-chrome', screen);
  chrome.innerHTML = `
    <svg viewBox="0 0 ${SCREEN_W} ${SCREEN_H}" width="${SCREEN_W}" height="${SCREEN_H}">
      <defs><linearGradient id="phg" x1="0" x2="1"><stop offset="0" stop-color="#004aad"/><stop offset="1" stop-color="#cb6ce6"/></linearGradient></defs>
      <rect x="${SCREEN_W / 2 - 50}" y="12" width="100" height="28" rx="14" fill="#000"/>
      <rect x="28" y="62" width="${SCREEN_W - 56}" height="7" rx="3.5" fill="#edeef0" fill-opacity="0.16"/>
      <rect x="28" y="62" width="${(SCREEN_W - 56) * 0.34}" height="7" rx="3.5" fill="url(#phg)"/>
      <rect x="0" y="${SCREEN_H - 76}" width="${SCREEN_W}" height="76" fill="#0a0c18" fill-opacity="0.82"/>
      <g fill="#edeef0" fill-opacity="0.5">
        <circle cx="${SCREEN_W * 0.14}" cy="${SCREEN_H - 40}" r="9"/>
        <rect x="${SCREEN_W * 0.38 - 9}" y="${SCREEN_H - 49}" width="18" height="18" rx="4"/>
        <path d="M${SCREEN_W * 0.62} ${SCREEN_H - 50} l9 18 h-18 z"/>
        <circle cx="${SCREEN_W * 0.86}" cy="${SCREEN_H - 44}" r="6"/><path d="M${SCREEN_W * 0.86 - 11} ${SCREEN_H - 28} q11 -12 22 0 z"/>
      </g>
      <circle cx="${SCREEN_W * 0.38}" cy="${SCREEN_H - 40}" r="20" fill="none" stroke="url(#phg)" stroke-width="2"/>
      <rect x="${SCREEN_W / 2 - 60}" y="${SCREEN_H - 12}" width="120" height="4" rx="2" fill="#edeef0" fill-opacity="0.6"/>
    </svg>`;
  // Si existe assets/phone-screen.png, sustituye mapa + interfaz.
  slot('phone-screen', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'fill phone-shot optional', screen);

  const tOpen = S.s2.start - 0.15;
  const tApp = B('s2.app');
  const tZoom = B('s2.juego') - 0.9;

  // Portal
  gsap.set(portal.root, { scale: 0.12, autoAlpha: 0, rotation: -40 });
  gsap.set(portal.swirl, { rotation: 0 });
  tl.to(portal.root, { scale: 1, autoAlpha: 1, rotation: 0, duration: 1.2, ease: 'expo.out' }, tOpen);
  tl.to(portal.swirl, { rotation: 140, duration: tZoom + 1 - tOpen, ease: 'none' }, tOpen);
  tl.to(portal.root, { scale: 1.05, duration: tZoom - tOpen - 1.2, ease: 'sine.inOut' }, tOpen + 1.2);

  // Móvil: surge desde el interior del portal
  gsap.set(phone, { scale: 0.18, y: 60, rotation: -9, autoAlpha: 0 });
  tl.to(phone, { autoAlpha: 1, duration: 0.25 }, tApp - 0.45);
  tl.to(phone, { scale: 1, y: 0, rotation: -3, duration: 1.1, ease: 'expo.out' }, tApp - 0.45);
  tl.to(phone, { y: -14, rotation: -1.5, duration: tZoom - (tApp + 0.65), ease: 'sine.inOut' }, tApp + 0.65);

  // Entrada en la pantalla: escala exacta para que el mapa ocupe el encuadre.
  tl.to(phone, { scale: 1 / K, y: 0, rotation: 0, duration: 0.85, ease: 'power3.inOut' }, tZoom);
  tl.to(portal.root, { scale: 2.6, autoAlpha: 0, duration: 0.7, ease: 'power2.in' }, tZoom);
  tl.to(chrome, { autoAlpha: 0, duration: 0.3 }, tZoom + 0.35);
  tl.to(phone, { autoAlpha: 0, duration: 0.5, ease: 'sine.inOut' }, tZoom + 0.45); // fundido largo: funciona también con una captura real
  tl.to(root, { autoAlpha: 0, duration: 0.01 }, tZoom + 1.0);
  return { phone, portal, tZoom, K };
}
