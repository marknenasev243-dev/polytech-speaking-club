
(() => {
  const KEY = 'polytech-winter-theme-v5';
  const root = document.documentElement;

  // При первом запуске — светлый фон
  let theme = 'light';
  let switching = false;

  try {
    if (localStorage.getItem(KEY) === 'dark') {
      theme = 'dark';
    }
  } catch (e) {}

  function applyTheme() {
    root.setAttribute('data-winter-theme', theme);
  }

  function toggleTheme(button) {
    if (switching) return;

    switching = true;

    // Запускаем движение огоньков по кругу
    button.classList.remove('is-flashing');
    void button.offsetWidth;
    button.classList.add('is-flashing');

    // Меняем зимний фон во время свечения
    setTimeout(() => {
      theme = theme === 'light' ? 'dark' : 'light';
      applyTheme();

      try {
        localStorage.setItem(KEY, theme);
      } catch (e) {}
    }, 250);

    // Завершаем эффект гирлянды
    setTimeout(() => {
      button.classList.remove('is-flashing');
      switching = false;
    }, 1000);
  }

  function ensureButton() {
    const app = document.getElementById('app');
    if (!app) return;

    const hero = app.querySelector('.hero');

    const onPoster =
      hero &&
      hero.nextElementSibling?.classList.contains('tabs');

    const existing = app.querySelector(
      '.winter-theme-switch'
    );

    // Звезда активна на афише и в «Моих записях»
    if (!onPoster) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'winter-theme-switch';
    button.setAttribute(
      'aria-label',
      'Смена зимней темы'
    );

    // Не рисуем вторую звезду!
    // Только прозрачная кнопка и светящийся круг
    button.innerHTML = `
      <span class="winter-theme-lights"
            aria-hidden="true"></span>
      <span class="winter-theme-label">
        Смена темы
      </span>
    `;

    button.addEventListener('click', () => {
      toggleTheme(button);
    });

    app.appendChild(button);
  }

  applyTheme();

  function start() {
    ensureButton();

    const app = document.getElementById('app');

    if (app) {
      new MutationObserver(ensureButton)
        .observe(app, { childList: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
