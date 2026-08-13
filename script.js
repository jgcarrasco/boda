/* ============================================================
   BODA — responsive canvas + scroll motion
   ============================================================ */

(function () {
  'use strict';

  const root = document.documentElement;
  const sections = Array.from(document.querySelectorAll('.section'));
  const mobileQuery = window.matchMedia('(max-width: 767px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const DESKTOP_WIDTH = 1366;
  const DESKTOP_HEIGHTS = [768, 768, 768, 768];
  const MOBILE_WIDTH = 390;
  const MOBILE_HEIGHTS = [1106.64, 1122.97, 1123.48, 973.64];

  let resizeFrame = 0;

  /**
   * Scale the fixed Canva coordinate system as one unit. This keeps every
   * image and text block in the same relative position on 320px, 375px,
   * 390px and wider screens without horizontal overflow.
   */
  function syncCanvasSize() {
    const isMobile = mobileQuery.matches;
    const designWidth = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
    const designHeights = isMobile ? MOBILE_HEIGHTS : DESKTOP_HEIGHTS;
    const viewportWidth = Math.max(1, document.documentElement.clientWidth);
    const scale = Math.min(1, viewportWidth / designWidth);

    root.style.setProperty('--stage-scale', scale.toFixed(6));
    root.style.setProperty('--rendered-width', `${(designWidth * scale).toFixed(3)}px`);

    sections.forEach(function (section, index) {
      const renderedHeight = designHeights[index] * scale;
      section.style.setProperty('--content-height', `${renderedHeight.toFixed(3)}px`);
    });
  }

  function requestCanvasSync() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(syncCanvasSize);
  }

  // Run immediately: script is at the end of <body>, before the first paint in
  // normal loading conditions. Keep it in sync on resize/orientation changes.
  syncCanvasSize();
  window.addEventListener('resize', requestCanvasSync, { passive: true });
  window.addEventListener('orientationchange', requestCanvasSync, { passive: true });
  mobileQuery.addEventListener?.('change', requestCanvasSync);
  window.visualViewport?.addEventListener('resize', requestCanvasSync, { passive: true });

  // ---------- Reveal raster panels only after complete decoding ----------
  const photoSources = Array.from(document.querySelectorAll('.photo-source'));

  function markPhotoDecoded(image) {
    image.classList.add('is-decoded');
  }

  function decodePhoto(image) {
    if (typeof image.decode === 'function') {
      image.decode().then(
        function () { markPhotoDecoded(image); },
        function () { markPhotoDecoded(image); }
      );
    } else {
      markPhotoDecoded(image);
    }
  }

  photoSources.forEach(function (image) {
    // Mark cached images before enabling the hiding rule, preventing a flash.
    if (image.complete && image.naturalWidth > 0) {
      markPhotoDecoded(image);
      return;
    }

    image.addEventListener('load', function () { decodePhoto(image); }, { once: true });
    image.addEventListener('error', function () { markPhotoDecoded(image); }, { once: true });
  });
  root.classList.add('image-decode-ready');

  // ---------- Scroll suave para enlaces internos ----------
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start'
    });
  });

  // ---------- Staggered section/text entrances ----------
  function assignMotionDelays(section) {
    const media = Array.from(section.querySelectorAll('.media-el'))
      .sort(function (a, b) { return a.offsetTop - b.offsetTop; });
    const text = Array.from(section.querySelectorAll('.text-el'))
      .sort(function (a, b) { return a.offsetTop - b.offsetTop; });

    media.forEach(function (element, index) {
      element.style.setProperty('--motion-delay', `${40 + Math.min(index, 6) * 75}ms`);
    });

    text.forEach(function (element, index) {
      element.style.setProperty('--motion-delay', `${90 + index * 125}ms`);
    });
  }

  sections.forEach(assignMotionDelays);

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    sections.forEach(function (section) { section.classList.add('is-visible'); });
  } else {
    // Add the preparation class only when an observer is available. Without JS,
    // all content remains visible by default.
    root.classList.add('motion-ready');

    const revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // reveal once; ambient motion continues
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -8% 0px'
    });

    sections.forEach(function (section) { revealObserver.observe(section); });
  }

  // Keep the mobile browser chrome in harmony with the section currently shown.
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor && 'IntersectionObserver' in window) {
    const colorObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const color = getComputedStyle(entry.target).backgroundColor;
        themeColor.setAttribute('content', color);
      });
    }, { threshold: 0.55 });

    sections.forEach(function (section) { colorObserver.observe(section); });
  }
})();
