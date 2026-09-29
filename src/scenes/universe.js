// Universo compartido por las escenas 2b, 3 y 4 (9–27 s). Un único espacio con
// una cámara: juego → se aleja al universo → sigue a la figura por el camino →
// se centra en el mundo principal, que se ilumina y reparte luces a otras personas.
import {
  el, sv, slot, camLayer, applyCams, project, unproject, samplePath, pointAt,
  clamp, mix, smooth, uid, CX, CY,
} from '../lib/util.js';
import { planet, walkerSVG, personSVG } from '../lib/textures.js';
import { makePortal } from '../lib/portal.js';

// ---- Composición (coordenadas de mundo = pantalla con la cámara en reposo) ----
const A = { x: 230, y: 1480, r: 150 };
const M = { x: 770, y: 720, r: 190 };
const PATH_D = 'M 318 1372 C 470 1350, 560 1262, 520 1165 C 482 1072, 392 1016, 452 930 C 500 862, 590 870, 640 852';
const NODES = [0.25, 0.54, 0.8];
const ribbonW = (f) => mix(50, 15, f);
const ribbonT = (f) => mix(13, 4, f);

// Mundos extra: posición deseada en pantalla con la cámara alejada (z = 0.5).
const Z_OUT = 0.5;
const EXTRA = [
  { id: 'C', sx: 185, sy: 690, sr: 62, d: 0.8, seed: 21, kind: 'rock', craters: 12,
    stops: [[0, '#16161a'], [0.5, '#6f7078'], [1, '#e9e9ec']], atm: '#9aa7c7', orbit: true },
  { id: 'D', sx: 868, sy: 1180, sr: 72, d: 1.12, seed: 33, kind: 'gas', bands: 4,
    stops: [[0, '#061b2e'], [0.5, '#1d5f9a'], [1, '#bfd6f0']], atm: '#4d86ff', orbit: true },
  { id: 'E', sx: 322, sy: 1505, sr: 54, d: 0.9, seed: 44, kind: 'rock', craters: 5,
    stops: [[0, '#1c1436'], [0.5, '#7b4fb0'], [1, '#e2c7f0']], atm: '#cb6ce6' },
  { id: 'F', sx: 790, sy: 1525, sr: 42, d: 0.75, seed: 55, kind: 'rock', craters: 10,
    stops: [[0, '#141418'], [0.5, '#5f6068'], [1, '#d9d9de']], atm: '#8f9bb8' },
  { id: 'G', sx: 880, sy: 610, sr: 40, d: 0.7, seed: 66, kind: 'gas', bands: 9,
    stops: [[0, '#2a0f3a'], [0.5, '#9b4fc2'], [1, '#f3d9fb']], atm: '#cb6ce6' },
  { id: 'H', sx: 160, sy: 1085, sr: 34, d: 0.85, seed: 77, kind: 'rock', craters: 4,
    stops: [[0, '#0b1a3f'], [0.5, '#2c5ea8'], [1, '#d6e2f7']], atm: '#4d86ff' },
];
const LINKS = [['M', 'G'], ['M', 'D'], ['M', 'C'], ['A', 'H'], ['A', 'E'], ['E', 'F'], ['H', 'C'], ['D', 'F']];

// Personas (escena 4): posición deseada en pantalla con la cámara de la escena 4.
const CAM4 = { x: M.x - CX, y: 0, z: 1.25 };
CAM4.y = M.y - CY - 40 / CAM4.z; // mundo principal centrado un poco por debajo del centro
const PEOPLE = [
  { sx: 200, sy: 1335, s: 1.0, v: 0 },
  { sx: 868, sy: 1318, s: 0.95, v: 2 },
  { sx: 190, sy: 735, s: 0.82, v: 1 },
  { sx: 885, sy: 690, s: 0.72, v: 0 },
  { sx: 545, sy: 1500, s: 0.66, v: 2 },
];
const SPREAD = [
  { from: 'M', to: 0, wave: 0 }, { from: 'M', to: 1, wave: 0.22 }, { from: 'M', to: 2, wave: 0.44 },
  { from: 1, to: 3, wave: 1.45 }, { from: 0, to: 4, wave: 1.6 },
];

export function buildUniverse({ gsap, tl, timing, stage, onUpdate }) {
  const { scenes: S, B, T } = timing;
  const root = el('div', 'layer', stage);
  root.id = 'universe';

  const free = { x: 0, y: 0, z: 1 }; // cámara libre (tweens)
  const cam = { x: 0, y: 0, z: 1 }; // cámara final (libre ⟷ seguimiento)
  const st = {
    follow: 0, walk: 0.02, walkerA: 0, conn: LINKS.map(() => 0), ping: NODES.map(() => 0),
    links: SPREAD.map(() => 0), moon: -0.2,
  };

  // ---- Mundos extra, cada uno en su plano de profundidad ----
  const worlds = { A: { ...A, d: 1 }, M: { ...M, d: 1 } };
  for (const w of EXTRA) {
    const s = Math.pow(Z_OUT, w.d);
    const p = unproject({ x: 0, y: 0, z: Z_OUT }, w.d, w.sx, w.sy);
    const r = w.sr / s;
    worlds[w.id] = { x: p.x, y: p.y, r, d: w.d };
    const lay = camLayer(root, cam, w.d);
    if (w.orbit) {
      const o = sv('svg', { class: 'abs', width: r * 4, height: r * 4, viewBox: `0 0 ${r * 4} ${r * 4}` }, lay);
      Object.assign(o.style, { left: `${p.x - r * 2}px`, top: `${p.y - r * 2}px` });
      sv('ellipse', {
        cx: r * 2, cy: r * 2, rx: r * 1.75, ry: r * 0.45, transform: `rotate(-14 ${r * 2} ${r * 2})`,
        fill: 'none', stroke: '#edeef0', 'stroke-opacity': 0.35, 'stroke-width': 2 / s, 'stroke-dasharray': `${3 / s} ${9 / s}`,
      }, o);
    }
    const wrap = el('div', 'cutout world', lay, {
      left: `${p.x - r}px`, top: `${p.y - r}px`, width: `${r * 2}px`, height: `${r * 2}px`,
    });
    slot(`planet-${w.id.toLowerCase()}`, planet({
      size: 360, seed: w.seed, kind: w.kind, craters: w.craters || 0, bands: w.bands || 6, stops: w.stops, atmosphere: w.atm,
    }), 'fill', wrap);
  }

  // ---- Conexiones entre mundos (en pantalla, recalculadas cada fotograma) ----
  const connSvg = sv('svg', { class: 'layer', viewBox: '0 0 1080 1920', width: 1080, height: 1920 }, el('div', 'layer', root));
  const conns = LINKS.map(() => {
    const g = sv('g', {}, connSvg);
    const glow = sv('path', { fill: 'none', stroke: '#cb6ce6', 'stroke-opacity': 0.14, 'stroke-width': 7, pathLength: 1, 'stroke-linecap': 'round' }, g);
    const line = sv('path', { fill: 'none', stroke: '#edeef0', 'stroke-opacity': 0.5, 'stroke-width': 1.8, pathLength: 1, 'stroke-linecap': 'round' }, g);
    const dotA = sv('circle', { r: 4, fill: '#edeef0' }, g);
    const dotB = sv('circle', { r: 4, fill: '#edeef0' }, g);
    return { glow, line, dotA, dotB };
  });

  // ---- Núcleo (profundidad 1): mapa copiable + figura, personas, luces, portal ----
  const core = camLayer(root, cam, 1);
  const coreMap = el('div', 'layer core-map', core);

  const aWrap = el('div', 'cutout world', coreMap, {
    left: `${A.x - A.r}px`, top: `${A.y - A.r}px`, width: `${A.r * 2}px`, height: `${A.r * 2}px`,
  });
  slot('planet-a', planet({
    size: 420, seed: 12, kind: 'rock', craters: 7, atmosphere: '#4d86ff',
    stops: [[0, '#0b1a3f'], [0.45, '#1f4f9a'], [0.72, '#6d8fcf'], [1, '#dfe6f5']],
  }), 'fill', aWrap);

  // Mundo principal
  const mBox = 760;
  const m = el('div', 'm-world', coreMap, { left: `${M.x - mBox / 2}px`, top: `${M.y - mBox / 2}px`, width: `${mBox}px`, height: `${mBox}px` });
  const mGlow = el('div', 'm-glow', m);
  const ringG = uid('rg');
  const ringSvg = (half) => {
    const s = sv('svg', { class: 'abs m-ring', viewBox: `0 0 ${mBox} ${mBox}`, width: mBox, height: mBox }, m);
    const c = mBox / 2, sweep = half === 'back' ? 1 : 0;
    s.innerHTML = `
      <defs><linearGradient id="${ringG}${half}" x1="0" x2="1"><stop offset="0" stop-color="#004aad"/><stop offset="0.6" stop-color="#cb6ce6"/><stop offset="1" stop-color="#edeef0"/></linearGradient></defs>
      <g transform="rotate(-16 ${c} ${c})" fill="none">
        <path class="ring-a" pathLength="1" d="M ${c - 330} ${c} A 330 78 0 0 ${sweep} ${c + 330} ${c}" stroke="url(#${ringG}${half})" stroke-width="7"/>
        <path class="ring-b" pathLength="1" d="M ${c - 300} ${c} A 300 68 0 0 ${sweep} ${c + 300} ${c}" stroke="#edeef0" stroke-opacity="0.45" stroke-width="2"/>
      </g>`;
    return s;
  };
  const ringBack = ringSvg('back');
  const mPlanetWrap = el('div', 'cutout m-planet-wrap', m, {
    left: `${mBox / 2 - M.r}px`, top: `${mBox / 2 - M.r}px`, width: `${M.r * 2}px`, height: `${M.r * 2}px`,
  });
  const mPlanet = slot('planet-main', planet({
    size: 640, seed: 91, kind: 'gas', bands: 5, atmosphere: '#cb6ce6',
    stops: [[0, '#0d0f3a'], [0.3, '#004aad'], [0.55, '#6a5bd6'], [0.78, '#cb6ce6'], [1, '#f4e3f9']],
  }), 'fill m-planet', mPlanetWrap);
  const mSweep = el('div', 'm-sweep', el('div', 'm-sweep-clip', mPlanetWrap));
  const ringFront = ringSvg('front');
  const moonWrap = el('div', 'cutout m-moon', m);
  slot('moon', planet({
    size: 160, seed: 101, kind: 'rock', craters: 6, stops: [[0, '#1a1a1e'], [0.5, '#8a8a92'], [1, '#f0f0f2']], atmosphere: '#cfd6ea',
  }), 'fill', moonWrap);

  // Camino suspendido
  const pathSvg = sv('svg', { class: 'layer', viewBox: '0 0 1080 1920', width: 1080, height: 1920, overflow: 'visible' }, coreMap);
  const gid = uid('path');
  pathSvg.innerHTML = `
    <defs>
      <linearGradient id="${gid}s" x1="318" y1="1372" x2="640" y2="852" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#edeef0"/><stop offset="1" stop-color="#a3a9c4"/>
      </linearGradient>
      <linearGradient id="${gid}p" x1="318" y1="1372" x2="640" y2="852" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#004aad"/><stop offset="1" stop-color="#cb6ce6"/>
      </linearGradient>
      <radialGradient id="${gid}h"><stop offset="0" stop-color="#cb6ce6" stop-opacity="0.75"/><stop offset="1" stop-color="#cb6ce6" stop-opacity="0"/></radialGradient>
      <filter id="${gid}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    </defs>`;
  const center = sv('path', { d: PATH_D, fill: 'none', stroke: 'none' }, pathSvg);
  const samples = samplePath(center, 220);
  const edge = (f, side) => {
    const p = pointAt(samples, f), w = ribbonW(f) / 2;
    return [p.x - p.ty * w * side, p.y + p.tx * w * side];
  };
  const ribbon = (f0, f1, dy = 0) => {
    const n = Math.max(2, Math.ceil((f1 - f0) * 220));
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const f = mix(f0, f1, i / n);
      const t = typeof dy === 'function' ? dy(f) : dy;
      const a = edge(f, 1), b = edge(f, -1);
      L.push(`${a[0].toFixed(1)},${(a[1] + t).toFixed(1)}`);
      R.unshift(`${b[0].toFixed(1)},${(b[1] + t).toFixed(1)}`);
    }
    return L.concat(R).join(' ');
  };
  sv('polygon', { points: ribbon(0, 1, 46), fill: '#000', 'fill-opacity': 0.55, filter: `url(#${gid}b)` }, pathSvg);
  sv('polygon', { points: ribbon(0, 1, ribbonT), fill: '#3a3f5c' }, pathSvg);
  sv('polygon', { points: ribbon(0, 1, 0), fill: `url(#${gid}s)` }, pathSvg);
  const slats = sv('g', { stroke: '#06070d', 'stroke-opacity': 0.16, 'stroke-width': 1.6 }, pathSvg);
  for (let f = 0.03; f < 0.99; f += 0.032) {
    const a = edge(f, 1), b = edge(f, -1);
    sv('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, slats);
  }
  const progress = sv('polygon', { points: '', fill: `url(#${gid}p)` }, pathSvg);
  const nodes = NODES.map((f) => {
    const p = pointAt(samples, f), w = ribbonW(f);
    const g = sv('g', { transform: `translate(${p.x} ${p.y})` }, pathSvg);
    const halo = sv('ellipse', { rx: w * 2.2, ry: w * 1.4, fill: `url(#${gid}h)`, opacity: 0 }, g);
    const ping = sv('ellipse', { rx: w * 0.7, ry: w * 0.45, fill: 'none', stroke: '#cb6ce6', 'stroke-width': 3, opacity: 0 }, g);
    sv('ellipse', { rx: w * 0.62, ry: w * 0.4, fill: '#10132a', stroke: '#edeef0', 'stroke-width': 3 }, g);
    const lit = sv('ellipse', { rx: w * 0.62, ry: w * 0.4, fill: `url(#${gid}p)`, stroke: '#edeef0', 'stroke-width': 3, opacity: 0 }, g);
    return { f, w, halo, ping, lit };
  });

  // ---- Fuera del mapa copiable ----
  const walker = el('div', 'walker', core);
  walker.innerHTML = walkerSVG(uid('wk'));
  const wkImg = slot('walker', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'walker-img optional', walker);
  const wk = {
    body: walker.querySelector('.w-body'), legL: walker.querySelector('.w-legL'), legR: walker.querySelector('.w-legR'),
    armL: walker.querySelector('.w-armL'), armR: walker.querySelector('.w-armR'), svg: walker.querySelector('svg'), img: wkImg,
  };

  const trailSvg = sv('svg', { class: 'layer', viewBox: '0 0 1080 1920', width: 1080, height: 1920, overflow: 'visible' }, core);
  const people = PEOPLE.map((p, i) => {
    const w = unproject(CAM4, 1, p.sx, p.sy);
    const size = (190 * p.s) / CAM4.z;
    const box = el('div', 'person', core, {
      left: `${w.x - size / 2}px`, top: `${w.y - size * 0.55}px`, width: `${size}px`, height: `${size * 1.1}px`,
    });
    const halo = el('div', 'person-halo', box);
    const dark = el('div', 'person-fig', box);
    dark.innerHTML = personSVG(p.v, uid('pd'), false);
    slot(`person-${i + 1}`, 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'fill optional', dark);
    const lit = el('div', 'person-fig person-lit', box);
    lit.innerHTML = personSVG(p.v, uid('pl'), true);
    return { box, halo, lit, x: w.x, y: w.y, size };
  });
  const tg = uid('tr');
  trailSvg.innerHTML = `<defs><radialGradient id="${tg}d"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="#edeef0"/><stop offset="0.5" stop-color="#cb6ce6" stop-opacity="0.55"/><stop offset="1" stop-color="#cb6ce6" stop-opacity="0"/></radialGradient></defs>`;
  const trails = SPREAD.map((s, i) => {
    const src = s.from === 'M' ? M : people[s.from];
    const dst = people[s.to];
    const dx = dst.x - src.x, dy = dst.y - src.y, len = Math.hypot(dx, dy);
    const r0 = s.from === 'M' ? M.r * 0.92 : 30;
    const x0 = src.x + (dx / len) * r0, y0 = src.y + (dy / len) * r0;
    const x1 = dst.x - (dx / len) * dst.size * 0.28, y1 = dst.y - (dy / len) * dst.size * 0.28;
    const bend = (i % 2 ? -1 : 1) * 0.22 * len;
    const qx = (x0 + x1) / 2 - (dy / len) * bend, qy = (y0 + y1) / 2 + (dx / len) * bend;
    const lg = sv('linearGradient', { id: `${tg}${i}`, gradientUnits: 'userSpaceOnUse', x1: x0, y1: y0, x2: x1, y2: y1 }, trailSvg.querySelector('defs'));
    lg.innerHTML = '<stop offset="0" stop-color="#cb6ce6"/><stop offset="1" stop-color="#edeef0"/>';
    const path = sv('path', {
      d: `M ${x0} ${y0} Q ${qx} ${qy} ${x1} ${y1}`, fill: 'none', stroke: `url(#${tg}${i})`, 'stroke-width': 3.2,
      'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1,
    }, trailSvg);
    const dot = sv('circle', { r: 22, fill: `url(#${tg}d)`, opacity: 0 }, trailSvg);
    return { path, dot, len: path.getTotalLength(), to: s.to };
  });

  const portal = makePortal(core, M.x, M.y, 300);

  // ================= Timeline =================
  const tJuego = B('s2.juego');
  const tUni = B('s2.universo');
  const tRec = B('s4.recomendado');

  gsap.set(root, { autoAlpha: 0 });
  tl.to(root, { autoAlpha: 1, duration: 0.01 }, tJuego - 0.4);
  tl.to(root, { autoAlpha: 0, duration: 0.01 }, S.s5.start + 0.02); // el destello del cierre ya lo cubre

  // Juego: los niveles "laten" en secuencia y salen caminos hacia fuera
  gsap.set(free, { x: 0, y: 0, z: 1 });
  NODES.forEach((_, i) => tl.to(st.ping, { [i]: 1, duration: 0.9, ease: 'power2.out' }, tJuego + 0.15 + i * 0.22));
  tl.to(free, { z: 0.93, y: -20, duration: tUni - 0.3 - tJuego, ease: 'sine.inOut' }, tJuego);

  // Universo: la cámara se aleja; las conexiones se dibujan
  tl.to(free, { z: Z_OUT, x: 0, y: 0, duration: 2.4, ease: 'power2.inOut' }, tUni - 0.3);
  LINKS.forEach((_, i) => tl.to(st.conn, { [i]: 1, duration: 1.1, ease: 'power2.inOut' }, tJuego + 0.5 + (i < 3 ? i * 0.15 : 1.3 + i * 0.13)));
  tl.to(free, { z: Z_OUT * 0.94, duration: S.s3.start - (tUni + 2.1), ease: 'sine.inOut' }, tUni + 2.1);

  // Escena 3: la cámara baja al camino y sigue a la figura
  tl.to(st, { follow: 1, duration: 1.4, ease: 'power3.inOut' }, S.s3.start - 0.15);
  tl.to(st, { walkerA: 1, duration: 0.5 }, T('s3', 0.45));
  tl.to(st, { walk: 0.955, duration: S.s4.start - 0.2 - T('s3', 0.85), ease: 'power1.inOut' }, T('s3', 0.85));

  // Escena 4: el mundo principal toma luz y personalidad
  tl.set(free, { x: CAM4.x, y: CAM4.y, z: CAM4.z }, S.s4.start - 0.3);
  tl.to(st, { follow: 0, duration: 1.5, ease: 'power2.inOut' }, S.s4.start - 0.25);
  tl.to(st, { walkerA: 0, duration: 0.45 }, S.s4.start - 0.05);
  const tLight = T('s4', 0.35);
  tl.to(mPlanet, { filter: 'grayscale(0) brightness(1.06) contrast(1.05)', duration: 1.6, ease: 'power2.inOut' }, tLight);
  tl.to(mGlow, { opacity: 1, scale: 1, duration: 1.8, ease: 'power2.out' }, tLight + 0.2);
  tl.fromTo(mSweep, { xPercent: -70, opacity: 0 }, { xPercent: 10, opacity: 0.75, duration: 1.2, ease: 'power2.out' }, tLight);
  tl.to(mSweep, { opacity: 0.25, duration: 1.2 }, tLight + 1.2);
  tl.to([...ringBack.querySelectorAll('path'), ...ringFront.querySelectorAll('path')], {
    strokeDashoffset: 0, duration: 1.2, ease: 'power3.inOut', stagger: 0.08,
  }, tLight + 0.5);
  tl.to(moonWrap, { opacity: 1, duration: 0.6 }, tLight + 0.9);
  tl.to(st, { moon: 0.55, duration: S.s5.start - tLight - 0.9, ease: 'none' }, tLight + 0.9);
  people.forEach((p, i) => {
    tl.fromTo(p.box, { autoAlpha: 0, scale: 0.85, y: 16 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: 'power3.out' }, tLight + 0.8 + i * 0.1);
  });
  SPREAD.forEach((s, i) => tl.to(st.links, { [i]: 1, duration: s.wave >= 1 ? 0.8 : 1.0, ease: 'power2.inOut' }, tRec + s.wave));

  // Transición al cierre: el portal se abre en el mundo principal y lo atravesamos
  const tPortal = S.s5.start - 0.85;
  gsap.set(portal.root, { scale: 0, autoAlpha: 0, rotation: 60 });
  tl.to(portal.root, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.7, ease: 'expo.out' }, tPortal);
  tl.to(portal.swirl, { rotation: 200, duration: 1.4, ease: 'none' }, tPortal);
  tl.to(free, { x: M.x - CX, y: M.y - CY, duration: 0.5, ease: 'power2.inOut' }, tPortal);
  tl.to(free, { z: 7, duration: 0.7, ease: 'power3.in' }, tPortal + 0.3);

  // ================= Actualización por fotograma =================
  const rib = { f: -1 };
  onUpdate((t) => {
    // Cámara: mezcla entre la libre y la de seguimiento (zoom en escala logarítmica)
    const wp = pointAt(samples, st.walk);
    const zf = mix(1.5, 1.2, st.walk);
    const fx = wp.x - CX - (mix(560, 520, st.walk) - CX) / zf, fy = wp.y - CY - (mix(1420, 1300, st.walk) - CY) / zf;
    const k = st.follow;
    cam.x = mix(free.x, fx, k);
    cam.y = mix(free.y, fy, k);
    cam.z = Math.exp(mix(Math.log(free.z), Math.log(zf), k));

    // Conexiones
    LINKS.forEach(([a, b], i) => {
      const c = conns[i], v = st.conn[i];
      const wa = worlds[a], wb = worlds[b];
      const pa = project(cam, wa.d, wa.x, wa.y), pb = project(cam, wb.d, wb.x, wb.y);
      const dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.hypot(dx, dy) || 1;
      const ra = wa.r * pa.s + 10, rb = wb.r * pb.s + 10;
      const x0 = pa.x + (dx / len) * ra, y0 = pa.y + (dy / len) * ra;
      const x1 = pb.x - (dx / len) * rb, y1 = pb.y - (dy / len) * rb;
      const qx = (x0 + x1) / 2 + (dy / len) * len * 0.12, qy = (y0 + y1) / 2 - (dx / len) * len * 0.12;
      const d = `M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      for (const p of [c.line, c.glow]) {
        p.setAttribute('d', d);
        p.style.strokeDasharray = '1 1';
        p.style.strokeDashoffset = 1 - v;
        p.style.opacity = v > 0 ? 1 : 0;
      }
      c.dotA.setAttribute('cx', x0); c.dotA.setAttribute('cy', y0); c.dotA.style.opacity = v > 0.02 ? 0.8 : 0;
      c.dotB.setAttribute('cx', x1); c.dotB.setAttribute('cy', y1); c.dotB.style.opacity = smooth(0.9, 1, v) * 0.8;
    });

    // Recorrido completado + niveles
    // El recorrido sólo avanza en la escena 3 y queda visible después.
    const pf = st.walk;
    const walked = pf > 0.03;
    if (Math.abs(rib.f - pf) > 1e-4) {
      progress.setAttribute('points', walked ? ribbon(0, pf - 0.01, 0) : '');
      rib.f = pf;
    }
    nodes.forEach((n, i) => {
      const on = walked ? smooth(n.f - 0.012, n.f + 0.012, pf) : 0;
      const kick = on > 0 ? clamp((pf - n.f) / 0.09) : st.ping[i];
      n.lit.setAttribute('opacity', on);
      n.halo.setAttribute('opacity', on * 0.9);
      const pk = kick > 0 && kick < 1 ? 1 : 0;
      n.ping.setAttribute('opacity', pk * (1 - kick));
      n.ping.setAttribute('transform', `scale(${1 + kick * 2.2})`);
    });

    // Figura: pies sobre la cinta, escala por perspectiva, ciclo de paso
    const sc = mix(1, 0.45, st.walk) * 0.6;
    walker.style.opacity = st.walkerA;
    walker.style.transform = `translate(${wp.x - 60}px, ${wp.y - 296}px) scale(${sc}) rotate(${wp.tx * 3}deg)`;
    const ph = st.walk * Math.PI * 2 * 11;
    const bob = Math.abs(Math.cos(ph)) * 4;
    wk.body.setAttribute('transform', `translate(0 ${-bob}) rotate(${Math.sin(ph) * 1.4} 60 150)`);
    wk.legL.setAttribute('transform', `translate(0 ${-Math.max(0, Math.sin(ph)) * 11})`);
    wk.legR.setAttribute('transform', `translate(0 ${-Math.max(0, -Math.sin(ph)) * 11})`);
    wk.armL.setAttribute('transform', `rotate(${Math.sin(ph) * 6} 34 68)`);
    wk.armR.setAttribute('transform', `rotate(${-Math.sin(ph) * 6} 86 68)`);

    // Luna en órbita (sobre el arco delantero del anillo)
    const ma = Math.PI * (0.15 + st.moon);
    const rot = (-16 * Math.PI) / 180;
    const ex = Math.cos(ma) * 350, ey = Math.sin(ma) * 86;
    moonWrap.style.transform = `translate(${ex * Math.cos(rot) - ey * Math.sin(rot)}px, ${ex * Math.sin(rot) + ey * Math.cos(rot)}px)`;

    // Luces de recomendación y personas que se iluminan
    const litBy = people.map(() => 0);
    trails.forEach((tr, i) => {
      const v = st.links[i];
      tr.path.style.strokeDashoffset = 1 - v;
      tr.path.style.opacity = v > 0 ? mix(1, 0.5, smooth(0.95, 1, v)) : 0;
      const p = tr.path.getPointAtLength(v * tr.len);
      tr.dot.setAttribute('cx', p.x);
      tr.dot.setAttribute('cy', p.y);
      tr.dot.setAttribute('opacity', v > 0 && v < 1 ? 1 : 0);
      litBy[tr.to] = smooth(0.9, 1, v);
    });
    people.forEach((p, i) => {
      p.lit.style.opacity = litBy[i];
      p.halo.style.opacity = litBy[i];
      p.halo.style.transform = `scale(${0.6 + 0.4 * litBy[i]})`;
    });

    applyCams();
  });

  // Estado inicial de elementos animados por CSS/tween
  gsap.set(mGlow, { opacity: 0.12, scale: 0.85 });
  gsap.set([...ringBack.querySelectorAll('path'), ...ringFront.querySelectorAll('path')], { strokeDasharray: '1 1', strokeDashoffset: 1 });
  gsap.set(moonWrap, { opacity: 0 });

  return { root, coreMap, cam, free, st };
}
