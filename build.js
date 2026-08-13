// Generates index.html + styles.css from the captured layout data
const fs = require('fs');

const desktop = require('./reference/true-layout.json');
const mobile = require('./reference/true-mobile.json');
const manifest = require('./reference/assets4/manifest.json');
const extOf = {};
manifest.forEach(m => { extOf[m.i] = m.file.endsWith('.svg') ? 'svg' : 'png'; });

const FONTS = {
  YAEtfq3j4CA_0: "'Youngest Serif'",
  YAEqe_jPHiM_0: "'Hertical Smooth'",
  YAGL4GYmK5I_0: "'Fineday Two'",
};

const COLORS = {
  'rgb(247, 242, 234)': '#f7f2ea',
  'rgb(145, 142, 119)': '#918e77',
  'rgb(249, 242, 236)': '#f9f2ec',
  'rgb(171, 166, 148)': '#aba694',
  'rgb(0, 0, 0)': '#000000',
  'rgb(227, 215, 197)': '#e3d7c5',
  'rgb(110, 111, 81)': '#6e6f51',
  'rgb(244, 238, 230)': '#f4eee6',
  'rgb(98, 44, 34)': '#622c22',
};
function cssColor(c) { return COLORS[c] || c; }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Texto real (con espacios) tal y como está en el diseño de Canva.
// El orden coincide con el de los bloques de texto capturados en final-*.json
const TEXTS = [
  // sección 0: sin texto
  [],
  [
    'Recuerda llevar calzado cómodo y una rebeca por si refresca.',
    'Estaremos en el campo y ¡lo que más ilusión nos hace es verte bailar!',
    'Etiqueta',
    'alojamiento',
    'Lo creas o no, ¡No todo va a ser fiesta, en algún momento tendrás que dormir! ¿Todo el fin de semana? ¿Sólo sábado? Si necesitas alojamiento,  avísanos y gestionamos tu reserva.',
  ],
  [
    'pre-boda',
    'El viernes 23 de Julio tendremos nuestra cena pre-boda. ¿Quieres acompañarnos todo el fin de semana?',
    'menú',
    '¿Tienes alguna intolerancia o petición de menú? Queremos estómagos felices, así que no dudes en decírnos todo lo que necesites.',
  ],
  [
    'El verdadero sentido de la felicidad reside en compartirla',
    '¡reserva el día!',
    'Gracias por formar parte de la nuestra',
    '¡Te volveremos a escribir para contarte más detalles!',
  ],
];

// ---------------- HTML ----------------
let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BODA — Nuestra Boda</title>
<meta property="og:title" content="BODA">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<div class="page">

`;

const secNames = ['hero', 'info', 'detalles', 'cierre'];
let globalImg = 0;
desktop.forEach((sec, si) => {
  const bg = cssColor(sec.bg);
  html += `  <!-- ========== SECCIÓN ${si}: ${secNames[si]} ========== -->
  <section class="section section-${si} sec-${secNames[si]}" style="--bg:${bg}">

`;
  sec.imgs.forEach((im, ii) => {
    const g = globalImg++;
    const file = `img_${String(g).padStart(2, '0')}.${extOf[g]}`;
    html += `    <img class="el s${si}-i${ii}" src="assets/img/${file}" alt="">
`;
  });
  html += '\n';
  sec.texts.forEach((t, ti) => {
    html += `    <div class="el s${si}-t${ti}">${esc(TEXTS[si][ti] || t.text)}</div>
`;
  });
  html += `  </section>

`;
});

html += `  <!-- Pie de página (personalizable) -->
  <footer class="footer">
    <div class="footer-inner">
      <span>© 2025 · Nuestra Boda</span>
      <span class="footer-muted">Hecho con ♥</span>
    </div>
  </footer>

</div>

<script src="script.js"></script>
</body>
</html>
`;
fs.writeFileSync('index.html', html);

// ---------------- CSS ----------------
let css = `/* ============================================================
   BODA — réplica de la web de Canva (tesperamosennuestraboda)
   Diseño original: 1366 x 768 por sección (escritorio)
   ============================================================ */

@font-face {
  font-family: 'Youngest Serif';
  src: url('assets/fonts/bd39ead65e61fbef57749b39315a1e9e.woff') format('woff');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Hertical Smooth';
  src: url('assets/fonts/0acfbf3b56083bf20a257e3b889c7969.woff') format('woff');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'Fineday Two';
  src: url('assets/fonts/35898c795e855df4b7711ca364518e1c.woff') format('woff');
  font-weight: 400; font-style: normal; font-display: swap;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  background: #fff;
  font-family: 'Youngest Serif', serif;
  -webkit-font-smoothing: antialiased;
}

.page { width: 1366px; margin: 0 auto; }

/* ---------- Secciones ---------- */
.section {
  position: relative;
  width: 1366px;
  height: 768px;
  overflow: hidden;
  background: var(--bg);
}

/* Velo sutil de entrada (igual que la original) */
.section::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(15 16 21);
  opacity: 0;
  pointer-events: none;
  animation: section-veil 1.4s ease-out forwards;
}
.section-1::after { animation-delay: 0.15s; }
.section-2::after { animation-delay: 0.3s; }
.section-3::after { animation-delay: 0.45s; }
@keyframes section-veil {
  0%   { opacity: 0.07; }
  100% { opacity: 0; }
}

/* Elementos */
.el { position: absolute; }
`;

desktop.forEach((sec, si) => {
  sec.imgs.forEach((im, ii) => {
    css += `
/* s${si}-i${ii} */
.s${si}-i${ii} { left: ${im.x}px; top: ${im.y}px; width: ${im.w}px; height: ${im.h}px; }
`;
  });
  sec.texts.forEach((t, ti) => {
    const ff = FONTS[t.ff] || 'inherit';
    const color = cssColor(t.color);
    const fs = parseFloat(t.fs);
    const ls = t.ls && t.ls !== 'normal' ? t.ls : '0px';
    css += `
/* s${si}-t${ti} */
.s${si}-t${ti} {
  left: ${t.x}px; top: ${t.y}px; width: ${t.w}px;
  font-family: ${ff};
  font-size: ${fs}px;
  line-height: ${parseFloat(t.lh)}px;
  letter-spacing: ${ls};
  text-align: center;
  color: ${color};
}
`;
  });
});

css += `
/* Flotación suave de algunos adornos (como en la original) */
@keyframes float-a {
  0%, 100% { transform: translateX(-6px); }
  50%      { transform: translateX(6px); }
}
@keyframes float-b {
  0%, 100% { transform: translateX(-4px) translateY(-2px); }
  50%      { transform: translateX(4px) translateY(2px); }
}
.s1-i3 { animation: float-a 5s ease-in-out infinite; }
.s1-i4 { animation: float-b 6s ease-in-out infinite; }
`;

// ---------------- Mobile ----------------
css += `
/* ============================================================
   MÓVIL (<= 767px) — misma composición que la original
   ============================================================ */
@media (max-width: 767px) {
  .page { width: 390px; }

`;
const MOBILE_H = [1106.64, 1122.97, 1123.48, 973.64];
mobile.forEach((sec, si) => {
  css += `  .section-${si} { width: 390px; height: ${MOBILE_H[si]}px; }\n`;
  sec.imgs.forEach((im, ii) => {
    css += `  .s${si}-i${ii} { left: ${im.x}px; top: ${im.y}px; width: ${im.w}px; height: ${im.h}px; }\n`;
  });
  sec.texts.forEach((t, ti) => {
    css += `  .s${si}-t${ti} { left: ${t.x}px; top: ${t.y}px; width: ${t.w}px; }\n`;
  });
  css += '\n';
});

css += `}

/* ---------- Footer ---------- */
.footer { background: #000; color: #fff; padding: 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; }
.footer-inner { width: 1366px; margin: 0 auto; display: flex; justify-content: space-between; padding: 0 8px; }
.footer-muted { opacity: 0.6; }
@media (max-width: 767px) { .footer-inner { width: 390px; } }
`;

fs.writeFileSync('styles.css', css);
console.log('OK — index.html + styles.css generated');
