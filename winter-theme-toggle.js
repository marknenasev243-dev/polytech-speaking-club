/* Polytech Speaking Club: light snowy wreath first; toggle to dark wreath. */
(() => {
  const KEY = 'polytech-winter-wreath-theme-v1';
  let theme = 'light';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (_) { /* Storage may be unavailable. */ }

  function applyTheme() {
    document.documentElement.dataset.winterTheme = theme;
    document.querySelectorAll('.winter-theme-switch').forEach(button => {
      button.setAttribute('aria-label', theme === 'light'
        ? 'Смена темы: включить тёмный зимний фон'
        : 'Смена темы: включить светлый зимний фон');
      button.title = 'Смена темы';
    });
  }

  function insertSwitch() {
    const app = document.getElementById('app');
    if (!app) return;
    const hero = app.querySelector('.hero');
    if (!hero || !hero.nextElementSibling?.classList.contains('tabs')) return;
    if (hero.querySelector('.winter-theme-switch')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'winter-theme-switch';
    button.innerHTML = '<span class="winter-theme-star" aria-hidden="true"></span><span class="winter-theme-label">Смена темы</span>';
    button.addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(KEY, theme); } catch (_) { }
      applyTheme();
    });
    hero.appendChild(button);
    applyTheme();
  }

  applyTheme();
  function init() {
    const app = document.getElementById('app');
    if (!app) return;
    insertSwitch();
    new MutationObserver(insertSwitch).observe(app, { childList: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
