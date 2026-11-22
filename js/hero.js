(() => {
  'use strict';
  const root = document.querySelector('.hero-dash');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countUp = (el, to) => {
    const from = Number(el.dataset.shown || 0); el.dataset.shown = String(to);
    if (reduce || from === to) { el.textContent = String(to); return; }
    const start = performance.now(), span = 900;
    const tick = now => { const t = Math.min(1, (now - start) / span), eased = 1 - Math.pow(1 - t, 3); el.textContent = String(Math.round(from + (to - from) * eased)); if (t < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const render = stats => {
    if (!stats) return;
    const total = Math.max(1, stats.total || 0);
    root.querySelectorAll('[data-stat]').forEach(el => { const v = Number(stats[el.dataset.stat]); if (Number.isFinite(v)) countUp(el, v); });
    root.querySelectorAll('[data-meter]').forEach(el => { const v = Number(stats[el.dataset.meter]) || 0; el.style.setProperty('--w', Math.round(v / total * 100) + '%'); });
    const sectors = stats.sectors || {}, max = Math.max(1, ...Object.values(sectors).map(Number));
    root.querySelectorAll('[data-sector]').forEach(li => {
      const v = Number(sectors[li.dataset.sector]) || 0;
      const count = li.querySelector('b'); if (count) count.textContent = String(v);
      li.querySelector('.hd-meter b')?.style.setProperty('--w', Math.round(v / max * 100) + '%');
    });
  };
  addEventListener('register:stats', e => render(e.detail));
  render(window.__registerStats);
})();
