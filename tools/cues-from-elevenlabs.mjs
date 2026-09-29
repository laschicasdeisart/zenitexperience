// Sincroniza src/cues.json con la voz definitiva usando las marcas de tiempo por
// carácter que devuelve ElevenLabs (endpoint "text-to-speech … /with-timestamps",
// campo "alignment" o "normalized_alignment").
//
//   npm run cues:elevenlabs -- audio/voz-timestamps.json
//   npm run cues:elevenlabs -- audio/voz-timestamps.json --lead 0.2 --dry
//
// Cada escena empieza `lead` segundos antes de su frase ancla (para que la imagen
// anticipe a la voz) y cada beat con "anchor" se coloca en el inicio de su frase.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './serve.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const lead = Number(args[args.indexOf('--lead') + 1]) || 0.2;
const dry = args.includes('--dry');
if (!file) {
  console.error('Uso: npm run cues:elevenlabs -- <timestamps.json> [--lead 0.2] [--dry]');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const al = data.alignment || data.normalized_alignment || data;
const chars = al.characters;
const starts = al.character_start_times_seconds;
const ends = al.character_end_times_seconds;
if (!Array.isArray(chars) || !Array.isArray(starts)) {
  console.error('El JSON no contiene "alignment.characters" / "character_start_times_seconds".');
  process.exit(1);
}

// Texto normalizado (sin tildes, puntuación ni mayúsculas) con mapa al índice original.
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ');
let text = '';
const map = [];
chars.forEach((c, i) => {
  for (const ch of norm(c)) {
    if (ch === ' ' && text.endsWith(' ')) continue;
    text += ch;
    map.push(i);
  }
});
const find = (anchor, from) => {
  const a = norm(anchor).trim();
  const at = text.indexOf(a, from);
  return at < 0 ? null : { at, t: starts[map[at]] };
};

const cuesPath = path.join(ROOT, 'src/cues.json');
const cues = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));

// Anclas en el orden en que aparecen en la voz (por su tiempo por defecto).
const anchors = [
  ...cues.scenes.filter((s) => s.anchor).map((s) => ({ kind: 'scene', ref: s, def: s.start, anchor: s.anchor })),
  ...Object.entries(cues.beats).filter(([, b]) => b.anchor).map(([name, b]) => {
    const sc = cues.scenes.find((s) => s.id === b.scene);
    return { kind: 'beat', name, ref: b, def: sc.start + b.offset, anchor: b.anchor };
  }),
].sort((a, b) => a.def - b.def);

let cursor = 0;
const report = [];
for (const a of anchors) {
  const hit = find(a.anchor, cursor);
  if (!hit) { report.push(`  ✗ no encontrada: "${a.anchor}" (se mantiene ${a.def.toFixed(2)} s)`); continue; }
  cursor = hit.at + 1;
  if (a.kind === 'scene') {
    a.ref.start = a.ref === cues.scenes[0] ? 0 : Math.max(0, +(hit.t - lead).toFixed(3));
    report.push(`  escena ${a.ref.id.padEnd(4)} ${a.ref.start.toFixed(2)} s  ← "${a.anchor}" (${hit.t.toFixed(2)} s)`);
  } else {
    a.ref.at = +hit.t.toFixed(3);
    report.push(`  beat ${a.name.padEnd(16)} ${a.ref.at.toFixed(2)} s  ← "${a.anchor}"`);
  }
}
const voiceEnd = Math.max(...ends.filter((v) => typeof v === 'number'));
cues.duration = +Math.max(cues.duration, voiceEnd + 0.6).toFixed(3);

console.log(report.join('\n'));
console.log(`  duración total: ${cues.duration.toFixed(2)} s (la voz termina en ${voiceEnd.toFixed(2)} s)`);
if (dry) console.log('\n--dry: no se ha modificado src/cues.json');
else {
  fs.writeFileSync(cuesPath, JSON.stringify(cues, null, 2) + '\n');
  console.log('\nsrc/cues.json actualizado. Revisa con "npm run dev" y renderiza con "npm run render".');
}
