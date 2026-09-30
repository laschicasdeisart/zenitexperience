// Capas sustituibles: cualquier <img data-slot="nombre"> se reemplaza por
// assets/nombre.(png|webp|jpg|svg) si el archivo existe. Si no, se queda el placeholder.
//
// Para recortes (planetas, luna, figura, personas, logo) se eliminan automáticamente
// los márgenes vacíos, y un logo claro sobre fondo negro se convierte en transparente,
// así que no hace falta preparar los archivos con precisión.
const EXT = ['png', 'webp', 'jpg', 'jpeg', 'svg'];
const TRIM = /^(planet|moon|logo|walker|person)/;

async function find(name) {
  for (const ext of EXT) {
    const url = `assets/${name}.${ext}`;
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (r.ok) return url;
    } catch { /* sin servidor: se usa el placeholder */ }
  }
  return null;
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
}

// Recorta al contenido real. Fondo transparente → por alfa; fondo liso → por diferencia
// con el color de las esquinas. Con fondo negro y slot "logo", el negro pasa a ser alfa.
async function prepare(url, name) {
  if (url.endsWith('.svg')) return url;
  const img = await loadImage(url);
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;
  const px = (x, y) => (y * w + x) * 4;
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const transparent = corners.every((i) => d[i + 3] < 16);
  const bg = [0, 1, 2].map((k) => corners.reduce((s, i) => s + d[i + k], 0) / 4);
  const darkBg = !transparent && bg.every((v) => v < 24);

  if (name === 'logo' && darkBg) {
    for (let i = 0; i < d.length; i += 4) {
      const a = Math.max(d[i], d[i + 1], d[i + 2]);
      if (a < 10) { d[i + 3] = 0; continue; }
      d[i] = (d[i] * 255) / a; d[i + 1] = (d[i + 1] * 255) / a; d[i + 2] = (d[i + 2] * 255) / a;
      d[i + 3] = a;
    }
    ctx.putImageData(im, 0, 0);
  }
  const keep = (i) => (transparent || darkBg && name === 'logo'
    ? d[i + 3] > 16
    : Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 40);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (!keep(px(x, y))) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return url;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2);
  x1 = Math.min(w - 1, x1 + 2); y1 = Math.min(h - 1, y1 + 2);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

export async function applySlots(root) {
  const imgs = [...root.querySelectorAll('img[data-slot]')];
  const names = [...new Set(imgs.map((i) => i.dataset.slot))];
  const found = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await find(n)])));
  const ready = {};
  for (const n of names) {
    if (!found[n]) continue;
    ready[n] = TRIM.test(n) ? await prepare(found[n], n).catch(() => found[n]) : found[n];
  }
  for (const img of imgs) {
    const src = ready[img.dataset.slot];
    if (!src) continue;
    img.src = src;
    img.classList.add('custom');
    // Los slots opcionales ocultan su versión dibujada cuando hay archivo.
    img.parentElement.classList.add('has-custom');
  }
  await Promise.all([...root.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
  return found;
}
