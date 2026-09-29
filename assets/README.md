# Capas sustituibles

Cada elemento visual es una capa independiente. Si colocas en esta carpeta un archivo
con el nombre indicado (`.png`, `.webp`, `.jpg` o `.svg`), sustituye automáticamente
al placeholder procedural, y conserva su posición, su animación y el acabado de
collage (borde de papel y sombra). No hace falta tocar código: vuelve a ejecutar
`npm run render`.

| Archivo | Qué es | Formato recomendado |
| --- | --- | --- |
| `logo.svg` / `logo.png` | **Logotipo oficial.** Sustituye al nombre escrito «ZENIT EXPERIENCE» del cierre | SVG o PNG transparente, claro sobre oscuro, ≤ 760 × 340 |
| `video-1` … `video-6` | Miniaturas de las tarjetas de vídeo (escena 1). Ideal: capturas reales de las clases, sin texto | 16:9, ≥ 640 × 360 |
| `phone-screen` | Captura de la app en el móvil (escena 2). Si existe, reemplaza el mapa animado; el zoom a la pantalla se mantiene | 1080 × 2300 (proporción 336:716) |
| `planet-intro` | Pequeño planeta tapado por los vídeos | PNG cuadrado transparente, ≥ 1024 |
| `planet-a` | Mundo de origen del camino | PNG cuadrado transparente, ≥ 1024 |
| `planet-main` | Mundo principal (se ilumina en la escena 4) | PNG cuadrado transparente, ≥ 1400 |
| `planet-c` … `planet-h` | Mundos del universo conectado | PNG cuadrado transparente, ≥ 800 |
| `moon` | Luna que orbita el mundo principal | PNG cuadrado transparente, ≥ 300 |
| `walker` | Figura humana que recorre el camino (de espaldas, caminando) | PNG transparente vertical 2:5, pies en el borde inferior |
| `person-1` … `person-5` | Personas que reciben la recomendación | PNG transparente, busto, ~1:1,1 |
| `bg-nebula` | Fondo de nebulosa | JPG 1300 × 2300 muy oscuro |

Para reforzar el collage fotográfico conviene usar recortes reales: fotos de
planetas de dominio público (NASA), personas en blanco y negro recortadas y
capturas reales de la formación. Evita imágenes 3D genéricas.
