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
    button.className = 'winter-theme-switch winter-theme-obstructed winter-label-obstructed';
    button.setAttribute('aria-label', 'Смена зимней темы');
    button.setAttribute('title', 'Смена темы');
    button.innerHTML = '<span class="winter-theme-ring" aria-hidden="true"></span><span class="winter-theme-label">Смена темы</span>';

    button.addEventListener('click', () => {
      updateOverlap();
      if (button.classList.contains('winter-theme-obstructed')) return;
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
    const label = button.querySelector('.winter-theme-label');
    const app = document.getElementById('app');
    const controls = 'button, a, input, textarea, select, label, [role="button"], [data-action], [contenteditable="true"], img, svg, .hero-emoji, .poster, .pill, .tag, .avatar, .logo, .psc-connection-warning';
    let frame = 0;
    let dirty = true;
    let elements = [];
    let texts = [];
    const range = document.createRange();
    function refreshTargets() {
      elements = app ? [...app.querySelectorAll(controls)] : [];
      texts = [];
      if (app) {
        const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const n = walker.currentNode;
          if (n.nodeValue.trim() && n.parentElement && !n.parentElement.closest('script,style,template')) texts.push(n);
        }
      }
      dirty = false;
    }
    function visible(el) {
      if (!el || !el.isConnected || el.closest('[hidden]')) return false;
      const st = getComputedStyle(el);
      return st.visibility !== 'hidden' && st.visibility !== 'collapse' && st.display !== 'none' && Number(st.opacity) !== 0 && el.getClientRects().length > 0;
    }
    function intersects(a, b, gap) {
      return b.width > 0 && b.height > 0 && a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
    }
    function updateOverlap() {
      if (dirty) refreshTargets();
      const starRect = button.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      // Only actual controls, pictures and text, not large transparent wrappers.
      let starBlocked = !!app?.querySelector('.psc-loading');
      let labelBlocked = starBlocked;
      function check(r) {
        if (!starBlocked && intersects(starRect, r, 2)) starBlocked = true;
        if (!labelBlocked && intersects(labelRect, r, 5)) labelBlocked = true;
      }
      for (const el of elements) {
        if (starBlocked && labelBlocked) break;
        if (visible(el)) check(el.getBoundingClientRect());
      }
      if (!starBlocked || !labelBlocked) {
        for (const n of texts) {
          if (starBlocked && labelBlocked) break;
          const el = n.parentElement;
          if (!visible(el)) continue;
          const rect = el.getBoundingClientRect();
          if (!intersects(starRect, rect, 2) && !intersects(labelRect, rect, 5)) continue;
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) check(r);
        }
      }
      button.classList.toggle('winter-theme-obstructed', starBlocked);
      button.classList.toggle('winter-label-obstructed', labelBlocked);
      button.tabIndex = starBlocked ? -1 : 0;
      if (starBlocked && document.activeElement === button) button.blur();
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; updateOverlap(); });
    }
    function changed() { dirty = true; schedule(); }
    if (app) {
      new MutationObserver(changed).observe(app, {childList:true, subtree:true, attributes:true, characterData:true});
      if (window.ResizeObserver) new ResizeObserver(schedule).observe(app);
      app.addEventListener('load', schedule, true);
    }
    window.addEventListener('scroll', schedule, {passive:true, capture:true});
    window.addEventListener('resize', schedule, {passive:true});
    window.addEventListener('pageshow', changed);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    document.fonts?.ready.then(schedule);
    window.Telegram?.WebApp?.onEvent?.('viewportChanged', schedule);
    updateOverlap();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', create, { once: true });
  } else create();
})();
