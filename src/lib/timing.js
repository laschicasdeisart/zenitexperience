// Convierte cues.json en funciones de tiempo.
// T(escena, offset): offset en "segundos de diseño" escalado a la duración real de la escena.
// B(beat): momento absoluto de un beat (usa "at" si la sincronización con la voz lo fijó).

export function makeTiming(cues) {
  const scenes = {};
  cues.scenes.forEach((s, i) => {
    const end = i < cues.scenes.length - 1 ? cues.scenes[i + 1].start : cues.duration;
    scenes[s.id] = { ...s, end, dur: end - s.start, k: (end - s.start) / s.design };
  });
  const T = (id, off) => scenes[id].start + off * scenes[id].k;
  const B = (name) => {
    const b = cues.beats[name];
    if (!b) throw new Error(`Beat desconocido: ${name}`);
    return typeof b.at === 'number' ? b.at : T(b.scene, b.offset);
  };
  return { scenes, T, B, duration: cues.duration, fps: cues.fps };
}
