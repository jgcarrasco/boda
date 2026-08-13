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

  // ---------- Envelope entrance + background music ----------
  const music = document.querySelector('#background-music');
  const musicButton = document.querySelector('.music-toggle');
  const invitationGate = document.querySelector('.invitation-gate');
  const invitationOpener = document.querySelector('.invitation-opener');
  const mainContent = document.querySelector('#main-content');
  const gatedRegions = [mainContent].filter(Boolean);

  let startBackgroundMusic = function () {};

  if (music && musicButton) {
    const targetVolume = 0.58;
    let fadeFrame = 0;
    let playPending = false;
    let intentionallyPaused = false;

    function setMusicState(state) {
      const labels = {
        playing: 'Pausar música',
        paused: 'Reanudar música',
        waiting: 'Activar música'
      };
      const label = labels[state] || labels.waiting;

      musicButton.dataset.state = state;
      musicButton.setAttribute('aria-label', label);
      musicButton.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');
      musicButton.title = label;
    }

    function setVolume(value) {
      try {
        music.volume = Math.max(0, Math.min(1, value));
      } catch (_) {
        // iOS controls media volume at system level; playback still works.
      }
    }

    function fadeMusicTo(volume, duration) {
      window.cancelAnimationFrame(fadeFrame);
      const initialVolume = Number.isFinite(music.volume) ? music.volume : volume;
      const startedAt = performance.now();

      function tick(now) {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setVolume(initialVolume + (volume - initialVolume) * eased);
        if (progress < 1 && !music.paused) {
          fadeFrame = window.requestAnimationFrame(tick);
        }
      }

      fadeFrame = window.requestAnimationFrame(tick);
    }

    startBackgroundMusic = function () {
      if (playPending || !music.paused) return;
      playPending = true;
      intentionallyPaused = false;
      setVolume(0.03);

      let playResult;
      try {
        // The envelope click is a direct user gesture, so mobile browsers can
        // start audible playback without an autoplay-policy workaround.
        playResult = music.play();
      } catch (_) {
        playPending = false;
        setMusicState('waiting');
        return;
      }

      if (playResult && typeof playResult.then === 'function') {
        playResult.then(function () {
          playPending = false;
          setMusicState('playing');
          fadeMusicTo(targetVolume, 1400);
        }).catch(function () {
          playPending = false;
          setMusicState('waiting');
        });
      } else {
        playPending = false;
        setMusicState('playing');
        fadeMusicTo(targetVolume, 1400);
      }
    };

    musicButton.addEventListener('click', function () {
      if (music.paused) {
        startBackgroundMusic();
      } else {
        intentionallyPaused = true;
        window.cancelAnimationFrame(fadeFrame);
        music.pause();
        setMusicState('paused');
      }
    });

    music.addEventListener('playing', function () {
      setMusicState('playing');
    });
    music.addEventListener('pause', function () {
      if (!music.ended) setMusicState(intentionallyPaused ? 'paused' : 'waiting');
    });
    music.addEventListener('error', function () {
      playPending = false;
      setMusicState('waiting');
    });

    // ---------- La música se detiene en segundo plano / al cerrar ----------
    // iOS Safari (y algunas WebViews de Android) siguen reproduciendo el audio
    // cuando la pestaña deja de verse o la app del navegador pasa a segundo
    // plano. Estos eventos fuerzan la pausa para que, al cerrar la página o la
    // app, la música nunca se siga oyendo.
    let wasPlayingBeforeHide = false;

    function pauseForBackground() {
      if (music.paused) return;
      wasPlayingBeforeHide = true;
      intentionallyPaused = true;
      window.cancelAnimationFrame(fadeFrame);
      music.pause();
      setMusicState('paused');
    }

    function resumeAfterBackground() {
      if (!wasPlayingBeforeHide) return;
      wasPlayingBeforeHide = false;
      startBackgroundMusic();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        pauseForBackground();
      } else {
        resumeAfterBackground();
      }
    });
    window.addEventListener('pagehide', pauseForBackground);
    window.addEventListener('pageshow', function (event) {
      // Restauración desde el bfcache (volver a una pestaña que no se cerró).
      if (event.persisted) resumeAfterBackground();
    });
    window.addEventListener('blur', function () {
      // Algunas WebViews móviles no emiten visibilitychange al minimizar.
      if (document.hidden) pauseForBackground();
    });

    setMusicState('waiting');
  }

  if (invitationGate && invitationOpener) {
    let invitationOpened = false;
    let gateRemoved = false;

    gatedRegions.forEach(function (region) { region.inert = true; });
    if (musicButton) musicButton.inert = true;
    window.scrollTo(0, 0);

    function finishOpening() {
      if (gateRemoved) return;
      gateRemoved = true;
      invitationGate.hidden = true;
      invitationGate.setAttribute('aria-hidden', 'true');
      mainContent?.focus({ preventScroll: true });
    }

    function openInvitation() {
      if (invitationOpened) return;
      invitationOpened = true;

      // Keep this call directly inside the click handler: that is what makes
      // audible playback reliable in Safari and Chrome on phones.
      startBackgroundMusic();
      window.scrollTo(0, 0);

      invitationGate.classList.add('is-opening');
      document.body.classList.add('invitation-opened');
      document.body.classList.remove('invitation-locked');
      gatedRegions.forEach(function (region) { region.inert = false; });
      if (musicButton) musicButton.inert = false;

      function handleGateTransition(event) {
        if (event.target !== invitationGate || event.propertyName !== 'opacity') return;
        invitationGate.removeEventListener('transitionend', handleGateTransition);
        finishOpening();
      }
      invitationGate.addEventListener('transitionend', handleGateTransition);

      // Fallback for reduced-motion mode and browsers that skip transitionend.
      window.setTimeout(finishOpening, reducedMotion.matches ? 40 : 1150);
    }

    invitationOpener.addEventListener('click', openInvitation, { once: true });
    window.addEventListener('pageshow', function () {
      if (!invitationOpened) window.scrollTo(0, 0);
    }, { once: true });
  } else {
    // Never leave the page inaccessible if the decorative gate is removed.
    document.body.classList.remove('invitation-locked');
    document.body.classList.add('invitation-opened');
    gatedRegions.forEach(function (region) { region.inert = false; });
    if (musicButton) musicButton.inert = false;
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
