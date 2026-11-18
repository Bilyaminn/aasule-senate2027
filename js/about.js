(() => {
  const filters = [...document.querySelectorAll('[data-timeline-filter]')];
  const items = [...document.querySelectorAll('.journey-item[data-track]')];
  const count = document.getElementById('timeline-count');
  if (!filters.length || !items.length) return;
  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = button.dataset.timelineFilter;
      let visible = 0;
      filters.forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle('is-active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      items.forEach((item) => {
        const show = selected === 'all' || item.dataset.track === selected;
        item.hidden = !show;
        if (show) visible += 1;
      });
      // Keep the era labels in sync with the selected category.
      document.querySelectorAll('.journey-era').forEach((era) => {
        const isPublic = era.classList.contains('public-era');
        era.hidden = (selected === 'corporate' && isPublic) || (selected === 'public' && !isPublic);
      });
      if (count) count.textContent = `${visible} ${visible === 1 ? 'milestone' : 'milestones'}`;
    });
  });
})();
