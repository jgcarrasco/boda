/* ============================================================
   BODA — script de la página
   ============================================================ */

(function () {
  'use strict';

  // ---------- Scroll suave para enlaces internos (anclas) ----------
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- Revelar elementos al hacer scroll (listo para usar) ----------
  // Los elementos con la clase "reveal" aparecen suavemente al entrar en el
  // viewport. Añade esa clase a cualquier elemento nuevo que quieras animar.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  // ---------- Marca la página como cargada ----------
  document.documentElement.classList.add('loaded');
})();
