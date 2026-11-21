(() => {
  'use strict';

  // Сохраняем текущую настройку темы из предыдущей рабочей версии.
  const KEY = 'polytech-winter-theme-v5';
  const root = document.documentElement;
  const IMAGE_WIDTH = 941;
  const IMAGE_HEIGHT = 1672;
  // Координаты звезды и ширина венка в обеих одинаково скомпонованных картинках.
  const STAR_X = 0.115;
  const STAR_Y = 0.204;
  const WREATH_WIDTH = 0.139;

  let theme = 'light';
  let switching = false;
  let button = null;
  let frame = 0;

  try { if (localStorage.getItem(KEY) === 'dark') theme = 'dark'; } catch (_) {}
  const applyTheme = () => root.setAttribute('data-winter-theme', theme);
  applyTheme();

  function positionToBackground() {
    if (!button) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    let imageW = w, imageH = h, originX = 0, originY = 0;

    // Повторяем точную геометрию body::before из существующего style.css.
    if (window.matchMedia('(min-width: 850px)').matches) {
      const scale = Math.max(w / IMAGE_WIDTH, h / IMAGE_HEIGHT);
      imageW = IMAGE_WIDTH * scale;
      imageH = IMAGE_HEIGHT * scale;
      originX = (w - imageW) / 2;
      originY = (h - imageH) * 0.38;
    }

    const x = originX + STAR_X * imageW;
    const y = originY + STAR_Y * imageH;
    const diameter = Math.max(44, WREATH_WIDTH * imageW);
    const size = Math.max(62, diameter + 10);
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.style.width = `${size}px`;
    button.style.height = `${size}px`;
    button.style.setProperty('--wreath-diameter', `${diameter}px`);
  }

  function intersection(a, b, padding = 0) {
    return a.left < b.right + padding && a.right > b.left - padding &&
           a.top < b.bottom + padding && a.bottom > b.top - padding;
  }

  function updateObstructions() {
    if (!button || !document.body.contains(button)) return;
    const star = button.getBoundingClientRect();
    const diameter = parseFloat(button.style.getPropertyValue('--wreath-diameter')) || 60;
    const label = button.querySelector('.winter-theme-label');
    const labelRect = label?.getBoundingClientRect();

    // Управляющие элементы важнее переключателя фона. Это предотвращает
    // перекрытие вкладок, кнопок, ссылок и полей ввода при прокрутке.
    const interactive = document.querySelectorAll(
      '#app button, #app a, #app input, #app select, #app textarea, #app .event-card'
    );
    const starCore = {
      left: star.left + (star.width - diameter * .78) / 2,
      right: star.right - (star.width - diameter * .78) / 2,
      top: star.top + (star.height - diameter * .78) / 2,
      bottom: star.bottom - (star.height - diameter * .78) / 2
    };
    let obstructed = false;
    for (const el of interactive) {
      const rect = el.getBoundingClientRect();
      if (rect.width && rect.height && intersection(starCore, rect, 3)) {
        obstructed = true;
        break;
      }
    }
    button.classList.toggle('winter-theme-obstructed', obstructed);

    // Подпись компактная; если она накрывает читаемый текст, скрываем лишь её.
    let labelBlocked = false;
    if (labelRect) {
      const readable = document.querySelectorAll(
        '#app .brand, #app .tag, #app .hero h1, #app .hero p, '
        + '#app .detail h1, #app .detail .meta, #app .detail .location, '
        + '#app .section-title, #app h2, #app h3, #app .person-name, '
        + '#app .notice, #app .back, #app .tabs, #app .menu'
      );
      for (const el of readable) {
        const rect = el.getBoundingClientRect();
        if (rect.width && rect.height && intersection(labelRect, rect, 3)) {
          labelBlocked = true;
          break;
        }
      }
    }
    button.classList.toggle('winter-label-obstructed', labelBlocked);
  }

  function scheduleProtection() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      updateObstructions();
    });
  }

  function emitSparkles() {
    if (!button || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 10; i += 1) {
      const p = document.createElement('span');
      p.className = 'winter-sparkle';
      const angle = i * Math.PI / 5;
      const distance = 24 + (i % 3) * 6;
      p.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      p.style.setProperty('--spark-size', `${3 + i % 3}px`);
      p.style.setProperty('--spark-delay', `${i % 3 * 25}ms`);
      button.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  function toggleTheme() {
    if (switching || !button) return;
    switching = true;
    emitSparkles();
    button.classList.remove('is-sparkling');
    void button.offsetWidth;
    button.classList.add('is-sparkling');
    window.setTimeout(() => {
      theme = theme === 'light' ? 'dark' : 'light';
      applyTheme();
      try { localStorage.setItem(KEY, theme); } catch (_) {}
    }, 240);
    window.setTimeout(() => {
      button?.classList.remove('is-sparkling');
      switching = false;
    }, 740);
  }

  function ensureButton() {
    // Всегда в body: #app заменяется при переходах по вкладкам и может
    // перемещаться при прокрутке. Звезда же встроена в фиксированный фон.
    if (button && document.body.contains(button)) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'winter-theme-switch';
    button.setAttribute('aria-label', 'Смена темы');
    button.setAttribute('title', 'Смена темы');
    button.innerHTML = '<span class="winter-theme-ring" aria-hidden="true"></span>'
      + '<span class="winter-theme-label">Смена темы</span>';
    button.addEventListener('click', toggleTheme);
    document.body.appendChild(button);
    positionToBackground();
    scheduleProtection();
  }

  function start() {
    ensureButton();
    window.addEventListener('resize', () => {
      positionToBackground();
      scheduleProtection();
    }, { passive: true });
    window.addEventListener('scroll', scheduleProtection, { passive: true });
    // Поддержка Telegram: при смене вкладки app.js перерисовывает содержимое.
    const app = document.getElementById('app');
    if (app) new MutationObserver(scheduleProtection).observe(app, { childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else start();
})();
