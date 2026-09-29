import { gsap } from 'gsap';
import { makeTiming } from './lib/timing.js';
import { applySlots } from './lib/assets.js';
import { applyCams } from './lib/util.js';
import { buildBackground, buildOverlay } from './scenes/background.js';
import { buildUniverse } from './scenes/universe.js';
import { buildS2 } from './scenes/s2-portal.js';
import { buildS1 } from './scenes/s1-videos.js';
import { buildS5 } from './scenes/s5-cierre.js';
import { buildText } from './scenes/text.js';
import { setupPreview } from './preview.js';

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
document.body.classList.toggle('render', RENDER);
document.body.classList.toggle('show-guides', params.has('guides'));

const cues = await (await fetch('src/cues.json', { cache: 'no-store' })).json();
const timing = makeTiming(cues);
await Promise.all([
  document.fonts.load('700 88px Poppins'), document.fonts.load('500 40px Poppins'),
  document.fonts.load('500 40px Inter'), document.fonts.load('400 40px Inter'),
]);

gsap.ticker.lagSmoothing(0);
const stage = document.getElementById('stage');
const tl = gsap.timeline({ paused: true });
const updaters = [];
const ctx = { gsap, tl, timing, stage, onUpdate: (f) => updaters.push(f) };

// Orden de capas (de fondo a frente)
buildBackground(ctx);
const universe = buildUniverse(ctx);
buildS2({ ...ctx, universe });
buildS1(ctx);
buildS5(ctx);
buildText(ctx);
buildOverlay(ctx);

await applySlots(stage);
await document.fonts.ready;

function seek(t) {
  tl.seek(Math.max(0, Math.min(timing.duration, t)), false);
  for (const f of updaters) f(t);
  applyCams();
}

window.__timing = timing;
window.__duration = timing.duration;
window.__fps = timing.fps;
window.__seek = seek;
seek(Number(params.get('t') ?? 0));
window.__ready = true;

if (!RENDER) setupPreview({ seek, timing, cues });
