# Nuestra Boda — sitio web

Réplica local de la web de boda hecha en Canva (`tesperamosennuestraboda.my.canva.site`),
reconstruida a mano con HTML/CSS/JS puro para poder ampliarla (formularios, mapas, etc.).

## Estructura

```
index.html      → la página completa (4 secciones + footer)
styles.css      → canvas full-bleed, layouts desktop/móvil y animaciones
script.js       → escalado, revelado al hacer scroll, sobre inicial y música
assets/
  audio/        → música de fondo autorizada
  fonts/        → las 3 tipografías usadas (WOFF)
  img/          → imágenes (fotos, flores, arcos, adornos)
  sobre-base.png → sobre sin nombre para generar versiones personales
invitaciones.json             → destinatarios y slugs publicados
tools/generate_invitations.py → generador estático de páginas y sobres
invitacion/<slug>/            → invitaciones personales ya generadas
reference/      → datos locales de comparación (excluidos del repo público)
build.js        → generador antiguo protegido; no usar para la versión actual
verify.js       → comparación con la web original (requiere Playwright)
```

## 🌐 En producción

**https://bienvenidosanuestraboda.com/**

Desplegada con GitHub Pages (repo `jgcarrasco/boda`, rama `main`) y dominio
personalizado. `https://jgcarrasco.github.io/boda/` redirige al dominio principal.
Para actualizar: haz `git push origin main` y GitHub Pages se actualiza solo.

La portada general usa el sobre proporcionado en `assets/sobre.jpeg`
(1280×720). Cada enlace personal usa su propio JPEG y etiquetas Open
Graph/Twitter estáticas, por lo que WhatsApp puede mostrar el destinatario sin
ejecutar JavaScript. Las URLs sociales son absolutas y se generan desde
`site_url` en `invitaciones.json`.

El favicon es el monograma **JyP**, construido con las letras reales del sobre.
Incluye variantes optimizadas de 16px, 32px, 512px y formato `.ico`.

## Cómo verla en local

Abre `index.html` directamente en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## Cómo editar

- **Textos**: están directamente en `index.html` dentro de cada sección.
  Cada bloque de texto tiene una clase tipo `s1-t0`, `s3-t2`, etc.
- **Posiciones**: en `styles.css`, cada elemento tiene su clase
  (`.s1-i0 { left: …px; top: …px; width: …px; height: …px }`).
  Hay un bloque para escritorio y otro para móvil (dentro de `@media (max-width: 767px)`).
  No elimines `.section-stage-shell` ni `.section-stage`: permiten escalar todo
  el diseño uniformemente y evitan desbordamientos en móviles estrechos.
- **Animaciones**: `.text-el` controla la entrada de textos, `.media-el` la de
  imágenes y `script.js` activa cada sección con `IntersectionObserver`.
- **Sobre y música**: la portada inicial reutiliza `assets/sobre.jpeg`. Al tocar
  «Toca para abrir», comienza `assets/audio/love-story.mp3` desde una interacción
  real (compatible con las políticas móviles) y se revela la web. El pequeño
  icono inferior queda únicamente para pausar o reanudar.
- **Imágenes**: reemplaza los ficheros en `assets/img/` manteniendo el nombre,
  o cambia el `src` en `index.html`. Los dos paneles raster del hero usan
  `<picture>` con WebP responsive (`-640.webp` / `-1024.webp`) y conservan los
  PNG como fallback. Si cambias esos paneles, vuelve a generar ambas variantes.

### Mapa de imágenes (índice → papel)

| Fichero | Sección | Qué es |
|---|---|---|
| img_00.png + img_00-*.webp | hero | Panel ilustrado de la pareja (izquierda) |
| img_03.png + img_03-*.webp | hero | Panel de Bogarra (derecha) |
| img_04.svg | hero | Arco/marco verde oliva sobre la foto derecha |
| img_05.svg | hero | Planta decorativa (borde derecho) |
| img_01.svg, img_02.svg | hero | Flores decorativas |
| img_06.svg, img_07.svg | info | Arcos color arena |
| img_08.svg | info | Rama |
| img_09.svg, img_10.png | info | Hoja y ramita (flotan suavemente) |
| img_11.svg | info | Flor redonda |
| img_12.png | info | Hoja |
| img_13.svg, img_15.svg | detalles | Arcos marrón |
| img_14.svg, img_17.svg | detalles | Ramas |
| img_16.svg | detalles | Línea ondulada |
| img_18.svg | detalles | Hoja |
| img_19.png | cierre | Círculo decorativo |
| img_20.svg, img_21.svg, img_22.svg, img_23.svg | cierre | Flores/ramas/hojas |
| img_24.svg | cierre | Línea ondulada marrón |

## Invitaciones personalizadas

Cada destinatario tiene una ruta estática y legible, por ejemplo:

```text
https://bienvenidosanuestraboda.com/invitacion/kaki-y-mariola/
```

Para añadir otro:

1. Añade una entrada a `invitaciones.json`:

   ```json
   { "slug": "ana-y-luis", "names": "Ana y Luis" }
   ```

2. Guarda una copia legítima de Amsterdam Two Slant en
   `tools/fonts/Amsterdam-Two-Slant.ttf` (el fichero está ignorado por Git), o indica
   otra ubicación mediante `--font`.
3. Ejecuta:

   ```bash
   python3 tools/generate_invitations.py
   # o solo una entrada:
   python3 tools/generate_invitations.py --only ana-y-luis
   ```

El generador crea `invitacion/<slug>/index.html` y un JPEG con nombre versionado.
El título, descripción, canonical, `og:*`, Twitter y el sobre inicial quedan
escritos directamente en HTML. Las páginas personales incluyen `noindex` para
reducir su aparición en buscadores, aunque el enlace sigue siendo público para
quien lo conozca.

### Nombres largos

El nombre no usa un tamaño fijo. El generador mide el contorno real de Amsterdam
(incluidos trazos y florituras), lo centra dentro de un rectángulo seguro y
ajusta tamaño/anchura automáticamente. Antes de guardar comprueba como condición
obligatoria que ningún píxel salga del área del sobre. Si un nombre
excepcionalmente largo queda demasiado pequeño, se puede usar una versión más
breve solo en la imagen:

```json
{
  "slug": "familia-garcia-martinez",
  "names": "Familia García Martínez y acompañantes",
  "envelope_name": "Familia García Martínez"
}
```

`names` continúa apareciendo completo en el título social; `envelope_name` solo
controla la caligrafía del sobre.

## Tipografías

- **Youngest Serif** — cuerpo (párrafos)
- **Hertical Smooth** — titulares (Etiqueta, alojamiento, menú, ¡reserva el día!)
- **Fineday Two** — la frase «Gracias por formar parte de la nuestra»
- **Amsterdam Two Slant** — nombres de destinatarios, rasterizada localmente; nunca
  se sirve ni se incluye en el repositorio

## Colores de la paleta

| Color | Uso |
|---|---|
| `#f7f2ea` | Fondo sección hero |
| `#918e77` | Fondo sección info (verde oliva) |
| `#f9f2ec` | Fondo sección detalles |
| `#aba694` | Fondo sección cierre |
| `#622c22` | Marrón oscuro (títulos, arcos) |
| `#e3d7c5` | Arena (títulos de la sección info) |
| `#6e6f51` | Verde oliva (títulos de la sección detalles) |
| `#f4eee6` | Crema claro (textos de la sección cierre) |

## Próximos pasos sugeridos (formularios, mapas…)

1. **Formulario de confirmación (RSVP)**: añade un `<form>` en `index.html`
   (por ejemplo dentro o después de la sección «¡reserva el día!»), estilízalo
   con las clases de `styles.css` y conecta el envío a un servicio como
   Formspree, Google Forms o tu propio backend.
2. **Mapa del lugar**: pega el iframe de Google Maps de la finca dentro de una
   sección nueva (`.section` con su `--bg`), o en la sección de detalles.
3. **Cuenta atrás / detalles del evento**: añade bloques `.el` nuevos con las
   clases `sN-tM` correspondientes.
4. **Despliegue**: sube la carpeta a cualquier hosting estático
   (Netlify, Vercel, GitHub Pages, o el que uses).

## Notas de fidelidad

- El diseño se capturó de la web original **después de que cargara por completo
  y cada sección se hubiera mostrado en pantalla** (la web original recoloca
  algunas imágenes al hacer scroll y al cargar los recursos en alta resolución).
  Por eso las posiciones de `styles.css` coinciden con la web real.
- Los paneles raster principales están en `assets/img/img_00.png` e `img_03.png`.
  Los PNG se mantienen como fallback; navegadores modernos descargan sus WebP
  responsive, aproximadamente un 88 % más ligeros, y los muestran sólo tras
  decodificarlos por completo para evitar el pintado vertical.
- Cada sección usa un fondo a ancho completo; el canvas original queda centrado
  en pantallas grandes y se escala como una sola unidad en pantallas pequeñas.
- Se probaron viewports de 320, 360, 375, 390, 430, 768, 1024, 1366 y 1920 px:
  sin scroll horizontal, imágenes rotas ni colisiones entre bloques de texto.
- Flores, hojas y fotos tienen movimiento ambiental suave inspirado en Canva.
- Los textos e ilustraciones entran de forma escalonada cuando su sección aparece
  al hacer scroll. `prefers-reduced-motion` desactiva todo movimiento decorativo.
- El pie de página es un placeholder negro sencillo: personalízalo a tu gusto.
- La web original muestra un velo oscuro muy sutil al cargar; se reproduce con
  `section-veil` al entrar cada sección.
