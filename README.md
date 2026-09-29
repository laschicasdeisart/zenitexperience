# Zenit Experience · Reel 30 s (1080 × 1920)

Motion graphics vertical en estética de collage fotográfico cósmico. La animación es
HTML + GSAP totalmente determinista (cada fotograma depende sólo del tiempo), se
renderiza con Chromium y se codifica en H.264 con ffmpeg.

- **Vídeo actual:** `renders/zenit-experience-reel.mp4` (30 s, 30 fps, sin voz)
- **Tiempos:** `src/cues.json`
- **Capas sustituibles:** `assets/` (ver `assets/README.md`)

## Uso

```bash
npm install
npm run dev        # previsualización en http://localhost:5173
npm run render     # renders/zenit-experience-reel.mp4 (con voz si existe audio/voz.mp3)
npm run stills     # fotogramas clave en renders/stills/
```

En la previsualización: `Espacio` reproduce, `←/→` avanza un fotograma, `Shift+←/→`
un segundo, `M` escribe el instante actual en la consola, y la casilla
«zonas seguras Reels» superpone las áreas ocupadas por la interfaz de Instagram.

Opciones de render: `--no-audio`, `--from 6 --to 14`, `--stills 3,7.5`, `--guides`,
`--workers 2`, `--out ruta.mp4`.

## Guion y estructura

| Tiempo | Escena | Texto en pantalla |
| --- | --- | --- |
| 0–6 s | Tarjetas de vídeo se acumulan hasta tapar un pequeño planeta; la cámara se acerca y todo se detiene con la pregunta | Tu formación ya funciona. → ¿Se siente así por dentro? |
| 6–14 s | Las tarjetas se abren como una puerta y aparece un portal → surge un móvil → la cámara entra en su pantalla, que se convierte en un camino entre dos mundos → la cámara se aleja y revela un universo conectado | Tu propia app. → Tu propio juego. → Tu propio universo. |
| 14–21 s | La cámara baja al camino suspendido; una figura avanza hacia el mundo principal y, a su paso, tres puntos se iluminan y el recorrido queda marcado | Saben por dónde seguir. → Ven cuánto han avanzado. |
| 21–27 s | El mundo principal gana luz, anillo, luna y color; desde él viajan luces a otras personas, que a su vez las pasan a otras (dejan huella) | Una formación que deja huella. |
| 27–30 s | Se abre un portal en el mundo principal, la cámara lo atraviesa y llega al cierre | ZENIT EXPERIENCE / Visualiza tu formación |

Las escenas 2 (tras el móvil), 3 y 4 comparten un único espacio y una única cámara,
así que cada escena conduce físicamente a la siguiente sin cortes.

## Sincronizar con la voz de ElevenLabs

1. Guarda la locución final como `audio/voz.mp3`. La previsualización y el render la
   usan automáticamente, y el reproductor sigue al audio.
2. **Automático:** genera la voz con el endpoint *text-to-speech … /with-timestamps*
   y guarda la respuesta JSON (por ejemplo `audio/voz-timestamps.json`). Después:

   ```bash
   npm run cues:elevenlabs -- audio/voz-timestamps.json --dry   # ver propuesta
   npm run cues:elevenlabs -- audio/voz-timestamps.json         # aplicar
   ```

   Busca en la locución las frases ancla de `cues.json` (inicio de cada línea y
   palabras clave como «vídeos y más vídeos», «todo un universo», «para seguir»,
   «recomendado» o «Visualiza tu formación»). Coloca cada escena 0,2 s antes de su
   frase (`--lead`) y cada beat en el inicio exacto de la suya.
3. **Manual:** edita `src/cues.json`.
   - `scenes[].start`: inicio de cada escena. Toda la animación interna se reescala
     a la nueva duración.
   - `beats.*.at`: fija un instante absoluto para un momento concreto. Si no existe,
     se usa `offset`, que se reescala con su escena.
   - `duration`: duración total.

Después, `npm run render`.

## Estructura del código

```
index.html            escenario 1080×1920 + controles de previsualización
src/cues.json         tiempos (escenas y beats)
src/main.js           arma la línea de tiempo y expone window.__seek(t) para el render
src/scenes/           background · s1-videos · s2-portal · universe (2b, 3, 4) · s5-cierre · text
src/lib/              cámara 2.5D con profundidad, texturas procedurales, portal, capas sustituibles
tools/                servidor, render, sincronía con ElevenLabs
```

Tipografía: Poppins Bold para titulares e Inter Medium para el CTA, servidas en local
desde `@fontsource`. Colores: azul `#004aad`, violeta `#cb6ce6` y blanco `#edeef0`.
