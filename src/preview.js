// Previsualización en el navegador: reproducción, scrub y sincronía con la voz.
// Si existe el audio indicado en cues.json, la animación sigue al audio.

export async function setupPreview({ seek, timing, cues }) {
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  const ui = document.getElementById('controls');
  const play = ui.querySelector('#play');
  const range = ui.querySelector('#scrub');
  const time = ui.querySelector('#time');
  const guides = ui.querySelector('#guides');
  const audioInfo = ui.querySelector('#audio');
  const D = timing.duration;
  range.max = D;

  const fit = () => {
    const s = Math.min((innerHeight - 90) / 1920, (innerWidth - 24) / 1080);
    stage.style.transform = `scale(${s})`;
    viewport.style.height = `${1920 * s}px`;
    viewport.style.width = `${1080 * s}px`;
  };
  addEventListener('resize', fit);
  fit();

  let audio = null;
  if (cues.audio) {
    const r = await fetch(cues.audio, { method: 'HEAD' }).catch(() => null);
    if (r && r.ok) {
      audio = new Audio(cues.audio);
      audioInfo.textContent = `voz: ${cues.audio}`;
    } else {
      audioInfo.textContent = `sin voz (añade ${cues.audio})`;
    }
  }

  let t = 0, playing = false, last = 0;
  const show = () => {
    range.value = t;
    time.textContent = `${t.toFixed(2)} s · f${Math.round(t * timing.fps)}`;
  };
  const go = (v) => {
    t = Math.max(0, Math.min(D, v));
    seek(t);
    show();
    if (audio && !playing) audio.currentTime = t;
  };
  const loop = (now) => {
    if (!playing) return;
    if (audio && !audio.paused) t = audio.currentTime;
    else t += (now - last) / 1000;
    last = now;
    if (t >= D) { t = D; toggle(false); }
    seek(t);
    show();
    requestAnimationFrame(loop);
  };
  const toggle = (on = !playing) => {
    playing = on;
    play.textContent = on ? '❚❚' : '▶';
    if (on) {
      if (t >= D) t = 0;
      if (audio) { audio.currentTime = t; audio.play().catch(() => {}); }
      last = performance.now();
      requestAnimationFrame(loop);
    } else if (audio) audio.pause();
  };

  play.onclick = () => toggle();
  range.oninput = () => go(Number(range.value));
  guides.onchange = () => document.body.classList.toggle('show-guides', guides.checked);
  guides.checked = document.body.classList.contains('show-guides');
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight') go(t + (e.shiftKey ? 1 : 1 / timing.fps));
    if (e.code === 'ArrowLeft') go(t - (e.shiftKey ? 1 : 1 / timing.fps));
    // M: anota el instante actual en la consola (para ajustar cues.json a mano)
    if (e.code === 'KeyM') console.log(`marca: ${t.toFixed(2)} s`);
  });
  go(Number(new URLSearchParams(location.search).get('t') ?? 0));
}
