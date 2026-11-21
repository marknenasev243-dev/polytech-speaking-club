(() => {
  'use strict';

  // Keep the existing remembered choice. Default is the light image.
  const STORAGE_KEY = 'polytech-winter-theme-v5';
  const ROOT = document.documentElement;
  const IMAGE_WIDTH = 941;
  const IMAGE_HEIGHT = 1672;
  // Approximate center and outer wreath diameter in the supplied WebP images.
  const STAR_X = 0.115;
  const STAR_Y = 0.204;
  const WREATH_WIDTH = 0.139;

  let theme = 'light';
  let switching = false;
  let switchTimer = 0;

  try {
    if (localStorage.getItem(STORAGE_KEY) === 'dark') theme = 'dark';
  } catch (_) {}

  const applyTheme = () => {
    ROOT.setAttribute('data-winter-theme', theme);
  };
  applyTheme();

  function findPosterHero(app) {
    return [...app.querySelectorAll('.hero')].find(
      node => node.nextElementSibling?.classList.contains('tabs')
    );
  }

  function positionSwitch(button) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    let imageWidth = width;
    let imageHeight = height;
    let originX = 0;
    let originY = 0;

    // style.css uses background-size:cover and center 38% at >=850px.
    // Under 850px it stretches the image to 100% of the viewport.
    if (window.matchMedia('(min-width: 850px)').matches) {
      const scale = Math.max(width / IMAGE_WIDTH, height / IMAGE_HEIGHT);
      imageWidth = IMAGE_WIDTH * scale;
      imageHeight = IMAGE_HEIGHT * scale;
      originX = (width - imageWidth) / 2;
      originY = (height - imageHeight) * 0.38;
    }

    const x = originX + STAR_X * imageWidth;
    const y = originY + STAR_Y * imageHeight;
    const diameter = Math.max(42, WREATH_WIDTH * imageWidth);
    const hitSize = Math.max(72, diameter + 14);

    button.style.setProperty('left', `${x}px`, 'important');
    button.style.setProperty('top', `${y}px`, 'important');
    button.style.setProperty('width', `${hitSize}px`, 'important');
    button.style.setProperty('height', `${hitSize}px`, 'important');
    button.style.setProperty('--wreath-diameter', `${diameter}px`);
  }

  function emitSparkles(button) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const count = 12;
    const size = Math.max(30, Math.min(51, button.offsetWidth * 0.48));
    for (let i = 0; i < count; i += 1) {
      const sparkle = document.createElement('span');
      sparkle.className = 'winter-sparkle';
      const angle = (i / count) * Math.PI * 2;
      const length = size * (0.72 + (i % 3) * 0.13);
      sparkle.style.setProperty('--dx', `${Math.cos(angle) * length}px`);
      sparkle.style.setProperty('--dy', `${Math.sin(angle) * length}px`);
      sparkle.style.setProperty('--spark-size', `${3 + i % 3}px`);
      sparkle.style.setProperty('--spark-delay', `${(i % 4) * 25}ms`);
      button.appendChild(sparkle);
      sparkle.addEventListener('animationend', () => sparkle.remove(), { once: true });
    }
  }

  function toggleTheme(button) {
    if (switching) return;
    switching = true;
    emitSparkles(button);
    button.classList.remove('is-sparkling');
    void button.offsetWidth;
    button.classList.add('is-sparkling');

    // Keep the slight transition delay from the working previous switch.
    window.clearTimeout(switchTimer);
    switchTimer = window.setTimeout(() => {
      theme = theme === 'light' ? 'dark' : 'light';
      applyTheme();
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
    }, 240);
    window.setTimeout(() => {
      button.classList.remove('is-sparkling');
      switching = false;
    }, 820);
  }

  function ensureButton() {
    const app = document.getElementById('app');
    if (!app) return;
    const hero = findPosterHero(app);
    let button = app.querySelector('.winter-theme-switch');

    if (!hero) {
      button?.remove();
      return;
    }
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'winter-theme-switch';
      button.setAttribute('aria-label', 'Смена темы');
      button.setAttribute('title', 'Смена темы');
      button.innerHTML = '<span class="winter-theme-ring" aria-hidden="true"></span><span class="winter-theme-label">Смена темы</span>';
      button.addEventListener('click', () => toggleTheme(button));
      app.appendChild(button);
    }
    positionSwitch(button);
    syncScrollVisibility();
  }

  // A fixed star must not cover event cards or navigation while scrolling.
  // Keep it clickable at the top; hide it when the feed is scrolled.
  function syncScrollVisibility() {
    const button = document.querySelector('#app .winter-theme-switch');
    if (!button) return;
    const scrollTop = Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0
    );
    button.classList.toggle('winter-theme-switch--scrolled', scrollTop > 48);
  }

  function start() {
    ensureButton();
    const app = document.getElementById('app');
    if (app) new MutationObserver(ensureButton).observe(app, { childList: true });
    syncScrollVisibility();
    window.addEventListener('scroll', syncScrollVisibility, { passive: true });
    // Also handles Telegram webviews with an inner scrolling container.
    document.addEventListener('scroll', syncScrollVisibility, { passive: true, capture: true });
    window.addEventListener('resize', () => {
      const button = document.querySelector('#app .winter-theme-switch');
      if (button) positionSwitch(button);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
