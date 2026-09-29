// Renderiza la animación fotograma a fotograma con Chromium y la codifica con ffmpeg.
//
//   npm run render                      → renders/zenit-experience-reel.mp4 (con voz si existe)
//   npm run render -- --no-audio        → sin voz
//   npm run render -- --from 6 --to 14  → sólo un tramo
//   npm run render -- --stills 3,7.5    → PNG sueltos en renders/stills/
//   npm run render -- --guides          → superpone las zonas seguras de Reels
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { startServer, ROOT } from './serve.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

const cues = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/cues.json'), 'utf8'));
const fps = Number(opt('fps', cues.fps));
const from = Number(opt('from', 0));
const to = Number(opt('to', cues.duration));
const workers = Number(opt('workers', Math.max(1, Math.min(4, os.cpus().length))));
const stills = opt('stills', null);
const guides = opt('guides', false) ? '&guides' : '';
const out = path.resolve(ROOT, opt('out', 'renders/zenit-experience-reel.mp4'));
const audioPath = cues.audio ? path.join(ROOT, cues.audio) : null;
const withAudio = !opt('no-audio', false) && audioPath && fs.existsSync(audioPath);

const server = await startServer(0);
const url = `http://127.0.0.1:${server.address().port}/index.html?render${guides}`;
const browser = await chromium.launch();

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('Error en la página:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return page;
}

try {
  if (stills) {
    const dir = path.join(ROOT, 'renders/stills');
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage();
    for (const t of String(stills).split(',').map(Number)) {
      await page.evaluate((v) => window.__seek(v), t);
      const file = path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
  } else {
    const first = Math.round(from * fps), last = Math.round(to * fps);
    const total = last - first;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zenit-frames-'));
    let done = 0;
    const started = Date.now();
    console.log(`Renderizando ${total} fotogramas a ${fps} fps con ${workers} procesos…`);
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const page = await openPage();
      for (let f = first + w; f < last; f += workers) {
        await page.evaluate((v) => window.__seek(v), f / fps);
        await page.screenshot({ path: path.join(tmp, `f${String(f - first).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95, timeout: 180000 });
        if (++done % 30 === 0) process.stdout.write(`\r  ${done}/${total}  (${((Date.now() - started) / 1000).toFixed(0)} s)`);
      }
      await page.close();
    }));
    console.log('\nCodificando H.264…');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const ff = ['-y', '-framerate', String(fps), '-i', path.join(tmp, 'f%05d.jpg')];
    if (withAudio) ff.push('-ss', String(from), '-i', audioPath);
    ff.push('-map', '0:v', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p',
      '-profile:v', 'high', '-r', String(fps), '-movflags', '+faststart');
    if (withAudio) ff.push('-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', `apad`, '-t', String(total / fps));
    ff.push(out);
    await new Promise((res, rej) => {
      const p = spawn(ffmpegPath, ff, { stdio: ['ignore', 'ignore', 'inherit'] });
      p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg salió con código ${c}`))));
    });
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`Listo: ${path.relative(ROOT, out)}${withAudio ? ' (con voz)' : ' (sin voz)'}`);
  }
} finally {
  await browser.close();
  server.close();
}
