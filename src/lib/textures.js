// Placeholders procedurales con estética de collage impreso (semitono, grano,
// fotografía desaturada). Cada uno se puede sustituir por un archivo en /assets.

import { mulberry32, makeNoise } from './noise.js';
import { clamp, mix, smooth } from './util.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
function ramp(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1], [p1, c1] = stops[i];
      const k = (t - p0) / (p1 - p0 || 1);
      return [mix(c0[0], c1[0], k), mix(c0[1], c1[1], k), mix(c0[2], c1[2], k)];
    }
  }
  return stops[stops.length - 1][1];
}

// Planeta esférico con iluminación lateral, semitono en la zona de sombra y grano.
export function planet({
  size = 512, seed = 1, kind = 'rock', stops, atmosphere = '#4d86ff',
  light = [-0.62, -0.5, 0.6], halftone = 0.6, craters = 0, bands = 6, atmo = 0.8,
}) {
  const cv = canvas(size, size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const N = makeNoise(seed);
  const rnd = mulberry32(seed * 131 + 7);
  const st = stops.map(([p, h]) => [p, hex(h)]);
  const atm = hex(atmosphere);
  const ll = Math.hypot(...light);
  const L = light.map((v) => v / ll);
  const R = size / 2 - 2, c0 = size / 2;
  const cr = Array.from({ length: craters }, () => ({
    x: (rnd() * 2 - 1) * 1.3, y: (rnd() * 2 - 1) * 1.1, r: 0.05 + rnd() * 0.15, k: 0.5 + rnd() * 0.5,
  }));
  const cell = Math.max(4.5, size / 90);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = (x + 0.5 - c0) / R, ny = (y + 0.5 - c0) / R;
      const rr = nx * nx + ny * ny;
      const dist = Math.sqrt(rr);
      if (dist > 1 + 1.5 / R) { d[i + 3] = 0; continue; }
      const nz = Math.sqrt(Math.max(0, 1 - rr));
      const lon = Math.atan2(nx, nz), lat = Math.asin(clamp(ny, -1, 1));
      let v;
      if (kind === 'gas') {
        const w = N.fbm(lon * 1.3 + 3, lat * 3.2, 4);
        v = 0.5 + 0.5 * Math.sin((lat * bands + w * 2.4) * Math.PI);
        v = mix(v, N.fbm(lon * 4 + 9, lat * 16, 3), 0.3);
      } else {
        v = N.fbm(lon * 1.7 + 11, lat * 1.7 + 4, 6);
        v = clamp((v - 0.5) * 2.1 + 0.5);
        for (const c of cr) {
          const dd = Math.hypot(lon - c.x, lat - c.y);
          if (dd < c.r) v -= 0.2 * c.k * (1 - (dd / c.r) ** 2);
          else if (dd < c.r * 1.2) v += 0.12 * c.k * (1 - (dd - c.r) / (c.r * 0.2));
        }
      }
      const col = ramp(st, clamp(v));
      const lam = nx * L[0] + ny * L[1] + nz * L[2];
      let sh = Math.pow(clamp(lam * 1.05 + 0.1), 0.85);
      if (halftone > 0) {
        const u = ((x + y) * 0.7071) / cell, q = ((x - y) * 0.7071) / cell;
        const fu = u - Math.floor(u) - 0.5, fq = q - Math.floor(q) - 0.5;
        const inDot = Math.hypot(fu, fq) < 0.72 * Math.sqrt(1 - sh);
        const ht = inDot ? sh * 0.3 : Math.min(1, sh * 1.1 + 0.05);
        sh = mix(sh, ht, halftone * smooth(0.0, 0.3, sh) * (1 - smooth(0.7, 0.95, sh)));
      }
      const rim = Math.pow(1 - nz, 2.4) * atmo * (0.25 + 0.75 * clamp(lam + 0.45));
      const g = (rnd() - 0.5) * 16;
      d[i] = clamp(mix(col[0] * sh, atm[0], rim) + g, 0, 255);
      d[i + 1] = clamp(mix(col[1] * sh, atm[1], rim) + g, 0, 255);
      d[i + 2] = clamp(mix(col[2] * sh, atm[2], rim) + g, 0, 255);
      d[i + 3] = 255 * clamp((1 - dist) * R + 0.5);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

function grainOver(ctx, w, h, seed, amount = 18) {
  const rnd = mulberry32(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = (rnd() - 0.5) * amount;
    d[i] += g; d[i + 1] += g; d[i + 2] += g;
  }
  ctx.putImageData(img, 0, 0);
}

// Miniatura de vídeo tipo "clase grabada": persona a cámara, sin texto.
const THUMBS = [
  { wall: ['#3a4660', '#8c9bb3'], skin: '#1b2233', light: '#e8d3b0', acc: '#cb6ce6' },
  { wall: ['#2f3d3b', '#9aa89a'], skin: '#161d1c', light: '#f0e2c4', acc: '#5d8be0' },
  { wall: ['#43354f', '#a592ad'], skin: '#1c1522', light: '#f1d8c9', acc: '#cb6ce6' },
  { wall: ['#26364f', '#6f86a8'], skin: '#121a28', light: '#dbe4f2', acc: '#004aad' },
  { wall: ['#4a3b33', '#b39d8a'], skin: '#221a16', light: '#f3dcc0', acc: '#7aa0e6' },
  { wall: ['#1f2a44', '#57607e'], skin: '#0e1322', light: '#cfd6ea', acc: '#cb6ce6' },
];
export function videoThumb(i) {
  const w = 480, h = 270;
  const cv = canvas(w, h);
  const ctx = cv.getContext('2d');
  const P = THUMBS[i % THUMBS.length];
  const rnd = mulberry32(900 + i * 17);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, P.wall[1]);
  bg.addColorStop(1, P.wall[0]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // ventana / luz de fondo
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = P.light;
  ctx.globalAlpha = 0.55;
  const side = i % 2 ? w * 0.08 : w * 0.66;
  ctx.fillRect(side, 20, 120, 170);
  ctx.globalAlpha = 0.35;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.arc(rnd() * w, 30 + rnd() * 120, 10 + rnd() * 22, 0, 7);
    ctx.fill();
  }
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  // estantería / mesa
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  // persona
  const px = w * (i % 2 ? 0.58 : 0.4), py = h * 0.36;
  const body = ctx.createLinearGradient(px - 90, 0, px + 90, 0);
  body.addColorStop(0, P.skin);
  body.addColorStop(i % 2 ? 0.25 : 0.75, P.skin);
  body.addColorStop(i % 2 ? 0 : 1, P.light);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(px - 110, h);
  ctx.bezierCurveTo(px - 100, py + 90, px - 60, py + 70, px, py + 66);
  ctx.bezierCurveTo(px + 60, py + 70, px + 100, py + 90, px + 110, h);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px, py + 8, 34, 42, 0, 0, 7);
  ctx.fill();
  ctx.fillRect(px - 13, py + 40, 26, 30);
  // viñeta
  const vg = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, 300);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  grainOver(ctx, w, h, 50 + i, 22);
  // botón de reproducción y barra de progreso
  ctx.fillStyle = 'rgba(237,238,240,0.92)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 28, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#10131f';
  ctx.beginPath();
  ctx.moveTo(w / 2 - 8, h / 2 - 12);
  ctx.lineTo(w / 2 + 13, h / 2);
  ctx.lineTo(w / 2 - 8, h / 2 + 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(237,238,240,0.3)';
  ctx.fillRect(16, h - 16, w - 32, 4);
  ctx.fillStyle = P.acc;
  ctx.fillRect(16, h - 16, (w - 32) * (0.15 + rnd() * 0.55), 4);
  return cv.toDataURL('image/jpeg', 0.9);
}

// Fondo: nebulosas suaves en azul y violeta sobre negro tinta.
export function nebula(w = 1300, h = 2300) {
  const cv = canvas(w, h);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, w, h);
  const blob = (x, y, r, c, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c},${a})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  blob(w * 0.12, h * 0.25, 900, '0,74,173', 0.42);
  blob(w * 0.95, h * 0.7, 820, '203,108,230', 0.2);
  blob(w * 0.55, h * 0.5, 600, '20,30,90', 0.35);
  // nubes de ruido a baja resolución
  const lw = 160, lh = 284;
  const lc = canvas(lw, lh);
  const lx = lc.getContext('2d');
  const im = lx.createImageData(lw, lh);
  const N = makeNoise(7);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const v = N.fbm(x / 38, y / 38, 5);
      const a = smooth(0.48, 0.8, v);
      const t = y / lh;
      const i = (y * lw + x) * 4;
      im.data[i] = mix(20, 150, t);
      im.data[i + 1] = mix(70, 80, t);
      im.data[i + 2] = mix(190, 210, t);
      im.data[i + 3] = a * 60;
    }
  }
  lx.putImageData(im, 0, 0);
  ctx.filter = 'blur(24px)';
  ctx.drawImage(lc, 0, 0, w, h);
  ctx.filter = 'none';
  return cv.toDataURL('image/jpeg', 0.92);
}

// Estrellas escasas (sin exceso de partículas).
export function stars(w, h, count, seed, big = 0) {
  const cv = canvas(w, h);
  const ctx = cv.getContext('2d');
  const rnd = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h, r = 0.5 + rnd() * rnd() * 1.6;
    ctx.fillStyle = `rgba(237,238,240,${0.25 + rnd() * 0.65})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  }
  for (let i = 0; i < big; i++) {
    const x = 80 + rnd() * (w - 160), y = 80 + rnd() * (h - 160);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
    g.addColorStop(0, 'rgba(237,238,240,0.9)');
    g.addColorStop(1, 'rgba(203,108,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.fillStyle = 'rgba(237,238,240,0.55)';
    ctx.fillRect(x - 22, y - 0.5, 44, 1);
    ctx.fillRect(x - 0.5, y - 22, 1, 44);
  }
  return cv.toDataURL('image/png');
}

export function grain(size = 256) {
  const cv = canvas(size, size);
  const ctx = cv.getContext('2d');
  const im = ctx.createImageData(size, size);
  const rnd = mulberry32(3);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = rnd() * 255;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
    im.data[i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return cv.toDataURL('image/png');
}

// Silueta de figura humana de espaldas (se usa sólo si no hay assets/walker.png).
export function walkerSVG(gid) {
  const mirror = (pts) => pts.map(([x, y]) => [120 - x, y]);
  const poly = (pts) => 'M' + pts.map((p) => p.join(' ')).join(' L') + ' Z';
  const armL = [[33, 64], [25, 72], [22, 96], [21, 140], [25, 150], [31, 150], [34, 142], [37, 96], [38, 72]];
  const legL = [[36, 146], [58, 146], [57, 200], [55, 280], [53, 292], [40, 292], [37, 284], [38, 200]];
  return `
  <svg viewBox="0 0 120 300" width="120" height="300" overflow="visible">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="120" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#06080f"/>
        <stop offset="0.62" stop-color="#121833"/>
        <stop offset="0.86" stop-color="#34357a"/>
        <stop offset="1" stop-color="#cb6ce6"/>
      </linearGradient>
    </defs>
    <g class="w-body" fill="url(#${gid})">
      <g class="w-legL"><path d="${poly(legL)}"/></g>
      <g class="w-legR"><path d="${poly(mirror(legL))}"/></g>
      <g class="w-armL"><path d="${poly(armL)}"/></g>
      <g class="w-armR"><path d="${poly(mirror(armL))}"/></g>
      <path d="M34 66 Q60 55 86 66 L91 80 L88 152 Q60 160 32 152 L29 80 Z"/>
      <rect x="52" y="46" width="16" height="16" rx="4"/>
      <ellipse cx="60" cy="32" rx="17" ry="20"/>
    </g>
  </svg>`;
}

// Busto de persona (placeholder de assets/person-N.png).
export function personSVG(variant, gid, lit) {
  const hair = [
    '<path d="M64 88 C60 40 140 40 136 88 C130 62 70 60 64 88 Z"/>',
    '<path d="M64 88 C60 42 140 42 136 88 C130 62 70 60 64 88 Z"/><circle cx="100" cy="40" r="17"/>',
    '<path d="M60 92 C54 36 146 36 140 92 L146 156 Q100 168 54 156 Z"/>',
  ][variant % 3];
  // Sin contorno: volumen por degradado, como una foto recortada a contraluz.
  const stroke = lit ? 'stroke="#edeef0" stroke-width="2" stroke-opacity="0.55"' : '';
  return `
  <svg viewBox="0 0 200 220" width="200" height="220" overflow="visible">
    <defs>${lit ? `<radialGradient id="${gid}" cx="0.5" cy="0.12" r="1">
      <stop offset="0" stop-color="#f1d6fa"/><stop offset="0.3" stop-color="#cb6ce6"/><stop offset="0.7" stop-color="#3b3fa8"/><stop offset="1" stop-color="#004aad" stop-opacity="0.6"/>
    </radialGradient>` : `<linearGradient id="${gid}" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#2a3160"/><stop offset="0.45" stop-color="#121633"/><stop offset="1" stop-color="#05060c" stop-opacity="0.2"/>
    </linearGradient>`}</defs>
    <g fill="url(#${gid})" ${stroke}>
      ${variant % 3 === 2 ? hair : ''}
      <path d="M8 220 C12 172 50 150 100 148 C150 150 188 172 192 220 Z"/>
      <rect x="84" y="112" width="32" height="44" rx="10"/>
      <ellipse cx="100" cy="86" rx="34" ry="42"/>
      ${variant % 3 === 2 ? '' : hair}
    </g>
  </svg>`;
}
