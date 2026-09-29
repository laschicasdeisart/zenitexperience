// Capas sustituibles: cualquier <img data-slot="nombre"> se reemplaza por
// assets/nombre.(png|webp|jpg|svg) si el archivo existe. Si no, se queda el placeholder.
const EXT = ['png', 'webp', 'jpg', 'jpeg', 'svg'];

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

export async function applySlots(root) {
  const imgs = [...root.querySelectorAll('img[data-slot]')];
  const names = [...new Set(imgs.map((i) => i.dataset.slot))];
  const found = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await find(n)])));
  for (const img of imgs) {
    const url = found[img.dataset.slot];
    if (!url) continue;
    img.src = url;
    img.classList.add('custom');
    // Los slots opcionales ocultan su versión dibujada cuando hay archivo.
    img.parentElement.classList.add('has-custom');
  }
  await Promise.all([...root.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
  return found;
}
