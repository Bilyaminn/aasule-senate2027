(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.project-card')];
  const categoryButtons = [...document.querySelectorAll('.filter-btn')];
  const search = document.getElementById('projectSearch');
  const statusSelect = document.getElementById('projectStatusFilter');
  const locationSelect = document.getElementById('projectLocationFilter');
  const reset = document.getElementById('projectReset');
  const results = document.getElementById('projectResults');
  const scrollHint = document.getElementById('projectStatus');
  const grid = document.querySelector('.projects-grid');
  let activeCategory = 'all';

  const clean = value => (value || '').replace(/\s+/g, ' ').trim();
  const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const classifyStatus = text => {
    const t = text.toLowerCase();
    if (/under construction|construction.*progress|advanced stages/.test(t)) return 'Under construction';
    if (/budgeted|budget provision/.test(t)) return 'Budgeted';
    if (/proposed|preparation stage|pipeline/.test(t)) return 'Proposed';
    if (/announced|groundbreaking/.test(t)) return 'Announced';
    if (/completed|commissioned|operational/.test(t)) return 'Completed / commissioned';
    if (/ongoing|operations|phased development/.test(t)) return 'Ongoing';
    return 'Reported';
  };
  const records = cards.map((card, index) => {
    const meta = clean(card.querySelector('.project-meta')?.textContent);
    const location = clean(meta.split('·')[0]) || 'Location not specified';
    const status = classifyStatus(meta);
    const title = clean(card.querySelector('h3')?.textContent) || `Project ${index + 1}`;
    const projectKey = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    card.dataset.projectKey = projectKey;
    const description = clean(card.querySelector('.project-body p')?.textContent);
    const source = card.querySelector('.project-body > a');
    card.dataset.status = status;
    card.dataset.location = location;
    card.dataset.search = clean(`${title} ${meta} ${description}`).toLowerCase();
    const record = {card, title, location, status, description, sourceHref: source?.href || '', sourceLabel: clean(source?.textContent) || 'Read source report', index};
    const body = card.querySelector('.project-body');
    if (body && !body.querySelector('.project-detail-button')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-detail-button';
      button.textContent = 'Explore project details';
      button.setAttribute('aria-label', `Explore details for ${title}`);
      button.addEventListener('click', () => openDetails(record));
      body.append(button);
    }
    const badge = document.createElement('span');
    badge.className = 'project-status-badge';
    badge.textContent = status;
    badge.setAttribute('aria-label', `Reported status: ${status}`);
    const metaEl = card.querySelector('.project-meta');
    if (metaEl && !metaEl.nextElementSibling?.classList.contains('project-status-badge')) metaEl.insertAdjacentElement('afterend', badge);
    return record;
  });

  // ---- placeholders: neutral, designed tiles for visitors; owner prompt only on localhost / ?admin ----
  const categoryNames = {infrastructure:'Infrastructure', industry:'Industry & investment', health:'Health & education', agriculture:'Agriculture & environment'};
  const isOwner = ['localhost','127.0.0.1',''].includes(location.hostname) || /[?&]admin\b/.test(location.search);
  const dress = (holder, record) => {
    holder.dataset.category = record.card.dataset.category || '';
    holder.setAttribute('aria-label', `${categoryNames[holder.dataset.category] || 'Project'} · ${record.location}`);
    const label = document.createElement('span'); label.textContent = (categoryNames[holder.dataset.category] || 'Project').toUpperCase();
    const note = document.createElement('small'); note.textContent = isOwner ? 'Owner: add a photo in the Project Photo Manager' : record.location;
    holder.replaceChildren(label, note);
  };
  records.forEach(record => { const holder = record.card.querySelector('.project-photo.no-photo'); if (holder) dress(holder, record); });
  document.querySelectorAll('a[target="_blank"]').forEach(a => { a.rel = 'noopener noreferrer'; });

  // ---- photo lightbox (data: URLs cannot be opened in a new tab by modern browsers) ----
  const lightbox = document.createElement('dialog');
  lightbox.className = 'photo-dialog';
  lightbox.setAttribute('aria-label', 'Project photograph');
  lightbox.innerHTML = '<form method="dialog"><button class="dialog-close" aria-label="Close photograph">\u00d7</button></form><img alt=""><p></p>';
  document.body.append(lightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });
  const openPhoto = (src, alt, caption) => {
    const img = lightbox.querySelector('img'); img.src = src; img.alt = alt;
    lightbox.querySelector('p').textContent = caption;
    if (typeof lightbox.showModal === 'function') lightbox.showModal(); else lightbox.setAttribute('open', '');
  };

  // ---- owner photos: same-site manifest; entries use either a file path (preferred) or an embedded data URL ----
  const SAFE_SRC = /^assets\/projects\/[a-z0-9-]+\.(webp|jpe?g|png)$/i;
  const SAFE_DATA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  fetch('project-photo-overrides.json', {cache: 'no-cache'})
    .then(response => response.ok ? response.json() : {})
    .then(manifest => {
      if (!manifest || typeof manifest !== 'object') return;
      records.forEach(record => {
        const photo = manifest[record.card.dataset.projectKey];
        const src = photo && (SAFE_SRC.test(photo.src || '') ? photo.src : (SAFE_DATA.test(photo.dataUrl || '') ? photo.dataUrl : ''));
        const holder = record.card.querySelector('.project-photo');
        if (!src || !holder) return;
        const alt = clean(photo.alt) || `${record.title} project photograph`;
        const image = new Image();
        image.alt = alt; image.loading = 'lazy'; image.decoding = 'async';
        image.addEventListener('error', () => { const tile = document.createElement('div'); tile.className = 'project-photo no-photo'; dress(tile, record); button.replaceWith(tile); }, {once:true});
        image.src = src;
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'project-photo has-photo';
        button.setAttribute('aria-label', `View photograph: ${record.title}`);
        button.addEventListener('click', () => openPhoto(src, alt, record.title));
        button.append(image);
        holder.replaceWith(button);
      });
    })
    .catch(() => { /* no manifest yet: neutral tiles stay */ });

  const locations = [...new Set(records.flatMap(r => r.location.split(/,| & | and /).map(clean)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const statuses = [...new Set(records.map(r => r.status))].sort((a,b)=>a.localeCompare(b));
  statuses.forEach(status => statusSelect?.add(new Option(status, status)));
  locations.forEach(location => locationSelect?.add(new Option(location, location)));

  const dialog = document.createElement('dialog');
  dialog.className = 'project-dialog';
  dialog.setAttribute('aria-labelledby', 'projectDialogTitle');
  dialog.innerHTML = `<form method="dialog" class="dialog-close-form"><button class="dialog-close" aria-label="Close project details">×</button></form><div class="dialog-kicker">PROJECT RECORD</div><h2 id="projectDialogTitle"></h2><div class="dialog-facts"><span class="dialog-status"></span><span class="dialog-location"></span></div><p class="dialog-description"></p><a class="dialog-source" target="_blank" rel="noopener noreferrer">Open source report ↗</a><p class="dialog-note">Project information is summarised from the linked public report. Status and figures are attributed to that source and are not an independent audit.</p>`;
  document.body.append(dialog);
  function openDetails(record) {
    dialog.querySelector('#projectDialogTitle').textContent = record.title;
    dialog.querySelector('.dialog-status').textContent = record.status;
    dialog.querySelector('.dialog-location').textContent = record.location;
    dialog.querySelector('.dialog-description').textContent = record.description;
    const link = dialog.querySelector('.dialog-source');
    link.href = record.sourceHref;
    link.textContent = record.sourceLabel.replace(/↗/g, '').trim() + ' ↗';
    link.hidden = !record.sourceHref;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  const visible = () => records.filter(r => !r.card.hidden);
  function applyFilters() {
    const term = clean(search?.value).toLowerCase();
    const wantedStatus = statusSelect?.value || 'all';
    const wantedLocation = locationSelect?.value || 'all';
    let count = 0;
    records.forEach(record => {
      const matches = (activeCategory === 'all' || record.card.dataset.category === activeCategory)
        && (wantedStatus === 'all' || record.status === wantedStatus)
        && (wantedLocation === 'all' || record.location.toLowerCase().includes(wantedLocation.toLowerCase()))
        && (!term || record.card.dataset.search.includes(term));
      record.card.hidden = !matches;
      if (matches) count++;
    });
    if (results) results.textContent = `Showing ${count} of ${records.length} project records`;
    if (scrollHint) scrollHint.textContent = count ? 'On mobile, swipe across the project cards or use the arrows to explore.' : 'No matching projects. Try clearing one or more filters.';
    if (grid) grid.scrollTo({left: 0, behavior: 'smooth'});
    updateSlider();
  }
  categoryButtons.forEach(button => button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    categoryButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    applyFilters();
  }));
  [search, statusSelect, locationSelect].forEach(control => control?.addEventListener(control === search ? 'input' : 'change', applyFilters));
  reset?.addEventListener('click', () => {
    if (search) search.value = '';
    if (statusSelect) statusSelect.value = 'all';
    if (locationSelect) locationSelect.value = 'all';
    activeCategory = 'all';
    categoryButtons.forEach(button => {
      const active = button.dataset.filter === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    applyFilters();
  });

  // Mobile controls are user-operated; no autoplay that interrupts reading.
  let sliderControls;
  function setupSlider() {
    if (!grid || sliderControls || !records.length) return;
    sliderControls = document.createElement('div');
    sliderControls.className = 'proj-ctrl';
    sliderControls.innerHTML = '<button class="proj-btn" type="button" aria-label="Previous project">←</button><div class="proj-bar" aria-hidden="true"><i></i></div><span class="proj-count" aria-live="polite"></span><button class="proj-btn" type="button" aria-label="Next project">→</button>';
    grid.after(sliderControls);
    const [previous, next] = sliderControls.querySelectorAll('.proj-btn');
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    grid.addEventListener('scroll', () => requestAnimationFrame(updateSlider), {passive:true});
    window.addEventListener('resize', updateSlider, {passive:true});
  }
  function move(direction) {
    const shown = visible();
    if (!shown.length || !grid) return;
    const first = shown[0].card;
    const step = shown[1] ? shown[1].card.offsetLeft - first.offsetLeft : first.getBoundingClientRect().width + 14;
    grid.scrollBy({left: direction * (step || grid.clientWidth), behavior:'smooth'});
  }
  function updateSlider() {
    if (!sliderControls || !grid) return;
    const shown = visible();
    const max = Math.max(0, grid.scrollWidth - grid.clientWidth);
    const progress = max ? Math.min(100, grid.scrollLeft / max * 100) : 100;
    const current = shown.length ? shown.reduce((best, record, index) => {
      const distance = Math.abs(record.card.offsetLeft - grid.scrollLeft);
      return distance < best.distance ? {index:index + 1, distance} : best;
    }, {index:1, distance:Infinity}).index : 0;
    sliderControls.querySelector('.proj-bar i').style.width = `${progress}%`;
    const count = sliderControls.querySelector('.proj-count');
    count.textContent = shown.length ? `${current} / ${shown.length}` : '0 projects';
    count.setAttribute('aria-label', shown.length ? `Project ${current} of ${shown.length}` : 'No projects visible');
    const buttons = sliderControls.querySelectorAll('.proj-btn');
    if (buttons.length === 2) {
      buttons[0].disabled = grid.scrollLeft <= 2;
      buttons[1].disabled = grid.scrollLeft >= max - 2;
    }
  }
  setupSlider();
  applyFilters();
})();
