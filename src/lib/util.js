// Helpers compartidos: DOM, SVG, matemáticas y cámara 2.5D.

export const W = 1080;
export const H = 1920;
export const CX = W / 2;
export const CY = H / 2;
const SVGNS = 'http://www.w3.org/2000/svg';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function el(tag, cls, parent, style) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style) Object.assign(e.style, style);
  if (parent) parent.appendChild(e);
  return e;
}

export function sv(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

let uidN = 0;
export const uid = (p = 'u') => `${p}${++uidN}`;

// Imagen sustituible: data-slot indica el nombre del archivo en /assets.
export function slot(name, placeholder, cls, parent, style) {
  const img = el('img', cls, parent, style);
  img.dataset.slot = name;
  img.alt = '';
  img.decoding = 'sync';
  img.src = placeholder;
  return img;
}

// Cámara 2.5D: cada capa tiene una profundidad d (1 = plano de enfoque,
// <1 más lejos, >1 más cerca). La escala es z^d y el desplazamiento cam*d.
const camLayers = [];
export function camLayer(parent, cam, d, cls = '') {
  const e = el('div', `layer ${cls}`.trim(), parent);
  camLayers.push({ e, cam, d });
  return e;
}
export function applyCams() {
  for (const { e, cam, d } of camLayers) {
    const s = Math.pow(cam.z, d);
    e.style.transform = `scale(${s}) translate(${-cam.x * d}px, ${-cam.y * d}px)`;
  }
}
export function project(cam, d, x, y) {
  const s = Math.pow(cam.z, d);
  return { x: CX + s * (x - cam.x * d - CX), y: CY + s * (y - cam.y * d - CY), s };
}
// Posición de mundo que cae en un punto de pantalla dado con una cámara dada.
export function unproject(cam, d, sx, sy) {
  const s = Math.pow(cam.z, d);
  return { x: CX + (sx - CX) / s + cam.x * d, y: CY + (sy - CY) / s + cam.y * d };
}

// Muestrea un path SVG en puntos con tangente, para cintas y recorridos.
export function samplePath(pathEl, n) {
  const len = pathEl.getTotalLength();
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const l = (i / n) * len;
    const p = pathEl.getPointAtLength(l);
    const a = pathEl.getPointAtLength(Math.max(0, l - 1));
    const b = pathEl.getPointAtLength(Math.min(len, l + 1));
    const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
    pts.push({ x: p.x, y: p.y, tx: tx / tl, ty: ty / tl, f: i / n });
  }
  return { pts, len };
}
export function pointAt(samples, f) {
  const { pts } = samples;
  const n = pts.length - 1;
  const k = clamp(f) * n;
  const i = Math.min(n - 1, Math.floor(k));
  const t = k - i;
  const a = pts[i], b = pts[i + 1];
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), tx: mix(a.tx, b.tx, t), ty: mix(a.ty, b.ty, t), f };
}
