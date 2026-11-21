/* Polytech Speaking Club — stable background-star theme control.
   The golden star is in the winter background image. This creates only
   its transparent clickable target, label and click sparkles. */
(() => {
  'use strict';
  const KEY = 'polytech-winter-theme-v5';
  const html = document.documentElement;
  let theme = 'light';
  try { if (localStorage.getItem(KEY) === 'dark') theme = 'dark'; } catch (_) {}

  const apply = () => { html.dataset.winterTheme = theme; };
  apply();

  function create() {
    if (!document.body || document.querySelector('body > .winter-theme-switch')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'winter-theme-switch';
    button.setAttribute('aria-label', 'Смена зимней темы');
    button.setAttribute('title', 'Смена темы');
    button.innerHTML = '<span class="winter-theme-ring" aria-hidden="true"></span><span class="winter-theme-label">Смена темы</span>';

    button.addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      apply();
      try { localStorage.setItem(KEY, theme); } catch (_) {}
      button.classList.remove('is-sparkling');
      button.querySelectorAll('.winter-sparkle').forEach(n => n.remove());
      // Short-lived sparkles, never additional text or a second star.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        for (let i = 0; i < 10; i++) {
          const dot = document.createElement('span');
          dot.className = 'winter-sparkle';
          dot.style.setProperty('--dx', `${Math.round(Math.cos(i * Math.PI / 5) * 31)}px`);
          dot.style.setProperty('--dy', `${Math.round(Math.sin(i * Math.PI / 5) * 31)}px`);
          dot.style.setProperty('--spark-delay', `${i * 25}ms`);
          button.append(dot);
        }
        button.classList.add('is-sparkling');
        window.setTimeout(() => {
          button.classList.remove('is-sparkling');
          button.querySelectorAll('.winter-sparkle').forEach(n => n.remove());
        }, 950);
      }
    });
    document.body.appendChild(button);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', create, { once: true });
  } else create();
})();
