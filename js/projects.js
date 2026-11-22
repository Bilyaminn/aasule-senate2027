(async () => {
  'use strict';
  const projectManifest = await fetch('project-photo-overrides.json', {cache:'no-cache'})
    .then(response => response.ok ? response.json() : {})
    .catch(() => ({}));
  const projectGrid = document.querySelector('.projects-grid');
  const extraProjects = Array.isArray(projectManifest?._projects) ? projectManifest._projects : [];
  const validCategories = new Set(['infrastructure','industry','health','agriculture']);
  extraProjects.forEach(project => {
    if (!project || typeof project.title !== 'string' || !project.title.trim()) return;
    const card = document.createElement('article');
    card.className = 'project-card';
    card.dataset.category = validCategories.has(project.category) ? project.category : 'infrastructure';
    card.dataset.custom = '1';
    const photo = document.createElement('div'); photo.className = 'project-photo no-photo'; photo.setAttribute('role','img'); photo.setAttribute('aria-label','Project photo can be added with the photo manager');
    const photoLabel = document.createElement('span'); photoLabel.textContent = 'PROJECT PHOTOS';
    const photoNote = document.createElement('small'); photoNote.textContent = 'Use the project photo manager to add local images'; photo.append(photoLabel, photoNote);
    const body = document.createElement('div'); body.className = 'project-body';
    const meta = document.createElement('span'); meta.className = 'project-meta';
    meta.textContent = `${String(project.location || 'LOCATION NOT SPECIFIED').toUpperCase()} · ${String(project.status || 'REPORTED').toUpperCase()}${project.date ? ` ${String(project.date).toUpperCase()}` : ''}`;
    const title = document.createElement('h3'); title.textContent = project.title.trim();
    const description = document.createElement('p'); description.textContent = project.description || 'Project details to be updated.';
    body.append(meta, title, description);
    if (project.sourceUrl && /^https:\/\//i.test(project.sourceUrl)) { const link=document.createElement('a'); link.href=project.sourceUrl; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent=(project.sourceLabel || 'Project report')+' ↗'; body.append(link); }
    card.append(photo, body); projectGrid?.append(card);
  });
  // Projects the owner deleted in the manager are removed for visitors (kept hidden inside the manager preview).
  const managerMode = /[?&]manager\b/.test(location.search);
  const keyOf = title => title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const deletedKeys = new Set(Array.isArray(projectManifest?._deleted) ? projectManifest._deleted.filter(k => typeof k === 'string') : []);
  document.querySelectorAll('.project-card').forEach(card => {
    if (!deletedKeys.has(keyOf((card.querySelector('h3')?.textContent || '').trim()))) return;
    if (managerMode) { card.hidden = true; card.dataset.deleted = '1'; } else card.remove();
  });
  // Curated flagship-first ordering: major industrial investments, then high-impact
  // transport/infrastructure and strategic public facilities, followed by the wider register.
  const flagshipOrder = [
    'New Nasarawa State Secretariat Complex',
    'Diamond New Energy Lithium Plant',
    'Avatar Lithium Processing Plant',
    'Agwada Cassava Industrial Hub',
    'Mararaba Twin Flyovers',
    'Asiwaju Bola Ahmed Tinubu Interchange',
    'Usman Dan Fodio Airport completion',
    'NASIDA investment & PPP pipeline',
    'Nasarawa State Liaison Office, Kaduna (New Facility)',
    'Akwanga Flyover, Underpass & Dualisation',
    'Keffi Flyover',
    '5km Shendam Road dualisation'
  ];
  const projectContainer = document.querySelector('.projects-grid');
  const priority = title => {
    const exact = flagshipOrder.indexOf(cleanTitle(title));
    return exact < 0 ? flagshipOrder.length : exact;
  };
  const cleanTitle = title => (title || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
  if (projectContainer) {
    [...projectContainer.querySelectorAll('.project-card:not([data-deleted])')]
      .sort((a,b) => priority(a.querySelector('h3')?.textContent) - priority(b.querySelector('h3')?.textContent))
      .forEach((card,index) => {
        card.classList.toggle('project-flagship', index === 0);
        if (index === 0) {
          const marker = document.createElement('span');
          marker.className = 'flagship-label';
          marker.textContent = 'FLAGSHIP PROJECT';
          card.querySelector('.project-body')?.prepend(marker);
        }
        projectContainer.append(card);
      });
  }
  const cards = [...document.querySelectorAll('.project-card:not([data-deleted])')];
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
  // Owner edits from the manager (_edits): keyed by the project's original title so photos keep matching.
  const edits = projectManifest?._edits && typeof projectManifest._edits === 'object' ? projectManifest._edits : {};
  cards.forEach(card => {
    const origKey = keyOf((card.querySelector('h3')?.textContent || '').trim());
    card.dataset.origKey = origKey;
    const edit = managerMode ? null : edits[origKey];
    if (!edit || typeof edit !== 'object') return;
    const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    const body = card.querySelector('.project-body');
    if (text(edit.title)) card.querySelector('h3').textContent = text(edit.title);
    if (text(edit.description) && body?.querySelector('p')) body.querySelector('p').textContent = text(edit.description);
    const meta = card.querySelector('.project-meta');
    if (meta && (text(edit.location) || text(edit.statusLine))) {
      const parts = (meta.textContent || '').split('·');
      const loc = text(edit.location) || (parts[0] || '').trim();
      const status = text(edit.statusLine) || parts.slice(1).join('·').trim();
      meta.textContent = `${loc.toUpperCase()} · ${status.toUpperCase()}`;
    }
    if (validCategories.has(edit.category)) card.dataset.category = edit.category;
    if (typeof edit.sourceUrl === 'string' && body) {
      let link = body.querySelector(':scope > a');
      if (!edit.sourceUrl.trim()) link?.remove();
      else if (/^https:\/\//i.test(edit.sourceUrl.trim())) {
        if (!link) { link = document.createElement('a'); link.target = '_blank'; link.rel = 'noopener noreferrer'; body.append(link); }
        link.href = edit.sourceUrl.trim();
        link.textContent = `${text(edit.sourceLabel) || 'Project report'} ↗`;
      }
    }
  });

  const records = cards.map((card, index) => {
    const meta = clean(card.querySelector('.project-meta')?.textContent);
    const location = clean(meta.split('·')[0]) || 'Location not specified';
    const status = classifyStatus(meta);
    const title = clean(card.querySelector('h3')?.textContent) || `Project ${index + 1}`;
    const projectKey = card.dataset.origKey || title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

  // ---- owner photos: up to five locally hosted photographs per project ----
  const SAFE_SRC = /^assets\/projects\/[a-z0-9-]+\.(webp|jpe?g|png)$/i;
  const SAFE_DATA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const photoVersion = projectManifest?._version ? String(projectManifest._version).replace(/[^0-9a-z-]/gi, '') : '';
  Promise.resolve(projectManifest)
    .then(manifest => {
      if (!manifest || typeof manifest !== 'object') return;
      records.forEach(record => {
        const raw = manifest[record.card.dataset.projectKey];
        if (!raw) return;
        // Accept the current multi-photo format and the previous single-photo format.
        let items = Array.isArray(raw) ? raw : (Array.isArray(raw.photos) ? raw.photos : [raw]);
        items = items.slice(0,5).map(item => ({
          src: SAFE_SRC.test(item?.src || '') ? item.src + (photoVersion ? `?v=${photoVersion}` : '') : (SAFE_DATA.test(item?.dataUrl || '') ? item.dataUrl : ''),
          alt: clean(item?.alt) || `${record.title} project photograph`
        })).filter(item => item.src);
        if (!items.length) return;
        const holder = record.card.querySelector('.project-photo');
        if (!holder) return;
        const gallery = document.createElement('div'); gallery.className = 'project-gallery';
        const main = document.createElement('button'); main.type = 'button'; main.className = 'project-photo has-photo';
        const image = new Image(); image.alt = items[0].alt; image.loading = 'lazy'; image.decoding = 'async';
        main.append(image);
        const counter = document.createElement('span'); counter.className = 'project-photo-count'; counter.setAttribute('aria-live','polite');
        const previous = document.createElement('button'); previous.type='button'; previous.className='project-photo-arrow previous'; previous.textContent='‹'; previous.setAttribute('aria-label','Previous project photo');
        const next = document.createElement('button'); next.type='button'; next.className='project-photo-arrow next'; next.textContent='›'; next.setAttribute('aria-label','Next project photo');
        const thumbs = document.createElement('div'); thumbs.className='project-photo-thumbs'; thumbs.setAttribute('aria-label',`${record.title} photo thumbnails`);
        let active = 0;
        function show(index) {
          active = (index + items.length) % items.length;
          image.src = items[active].src; image.alt = items[active].alt;
          main.setAttribute('aria-label',`View photograph ${active+1} of ${items.length}: ${record.title}`);
          counter.textContent = `${active+1} / ${items.length}`;
          [...thumbs.children].forEach((thumb,i) => { thumb.classList.toggle('active',i===active); thumb.setAttribute('aria-pressed',String(i===active)); });
        }
        function buildThumbs() {
          thumbs.replaceChildren();
          items.forEach((item,index) => {
            const thumb = document.createElement('button'); thumb.type='button'; thumb.className='project-photo-thumb'; thumb.setAttribute('aria-label',`Show photograph ${index+1} of ${items.length}`);
            const thumbImg = new Image(); thumbImg.src=item.src; thumbImg.alt=''; thumbImg.loading='lazy'; thumbImg.decoding='async'; thumb.append(thumbImg);
            thumb.addEventListener('click',()=>show(index)); thumbs.append(thumb);
          });
          const many = items.length > 1;
          previous.hidden = next.hidden = thumbs.hidden = counter.hidden = !many;
        }
        main.addEventListener('click',()=>openPhoto(items[active].src,items[active].alt,`${record.title} · Photo ${active+1} of ${items.length}`));
        previous.addEventListener('click',()=>show(active-1)); next.addEventListener('click',()=>show(active+1));
        // A slow or dropped mobile connection must not delete the gallery: retry once, then skip only the broken photo.
        const retried = new Set();
        image.addEventListener('error',()=>{
          const failing = items[active]; if (!failing) return;
          if (!retried.has(failing.src) && !failing.src.startsWith('data:')) {
            retried.add(failing.src);
            setTimeout(() => { image.src = `${failing.src}${failing.src.includes('?') ? '&' : '?'}r=${Date.now()}`; }, 900);
            return;
          }
          items.splice(active,1);
          if (!items.length) { const tile=document.createElement('div'); tile.className='project-photo no-photo'; dress(tile,record); gallery.replaceWith(tile); return; }
          buildThumbs(); show(active % items.length);
        });
        gallery.append(main,counter,previous,next,thumbs);
        buildThumbs(); show(0); holder.replaceWith(gallery);
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

  // Interactive project dashboard: all figures are calculated from the same live
  // project records used by the searchable register, never from hard-coded totals.
  const dashboard = document.querySelector('.project-dashboard');
  if (dashboard) {
    const sectorLabels = {infrastructure:'Infrastructure', industry:'Industry & investment', health:'Health & education', agriculture:'Agriculture & environment'};
    const sectorCounts = Object.fromEntries(Object.keys(sectorLabels).map(key => [key, records.filter(r => r.card.dataset.category === key).length]));
    const statusCounts = records.reduce((out, r) => { out[r.status] = (out[r.status] || 0) + 1; return out; }, {});
    const locationCounts = {};
    records.forEach(r => {
      const parts = (r.location || 'Location not specified').split(/,| & | and /).map(clean).filter(Boolean);
      [...new Set(parts)].forEach(label => { locationCounts[label] = (locationCounts[label] || 0) + 1; });
    });
    const completedCount = records.filter(r => r.status === 'Completed / commissioned').length;
    const ongoingCount = records.filter(r => r.status === 'Ongoing' || r.status === 'Under construction').length;
    const distinctLocations = Object.keys(locationCounts).length;
    const put = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value); };
    put('dashTotal', records.length);
    put('dashCompleted', completedCount);
    put('dashOngoing', ongoingCount);
    put('dashLocations', distinctLocations);
    window.__registerStats = {total: records.length, completed: completedCount, ongoing: ongoingCount, locations: distinctLocations, sectors: sectorCounts};
    window.dispatchEvent(new CustomEvent('register:stats', {detail: window.__registerStats}));

    const makeBar = (containerId, label, count, total, onClick, detail) => {
      const host = document.getElementById(containerId); if (!host) return;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'dashboard-bar-row';
      button.setAttribute('aria-label', `${label}: ${count} records. ${detail || 'Filter project register'}`);
      const top = document.createElement('span'); top.className = 'dashboard-bar-top';
      const name = document.createElement('span'); name.textContent = label;
      const number = document.createElement('strong'); number.textContent = count;
      top.append(name, number);
      const track = document.createElement('span'); track.className = 'dashboard-track';
      const fill = document.createElement('i'); fill.style.width = `${total ? Math.round(count / total * 100) : 0}%`;
      track.append(fill); button.append(top, track);
      button.addEventListener('click', onClick); host.append(button);
    };
    Object.entries(sectorLabels).forEach(([key, label]) => {
      makeBar('dashSectors', label, sectorCounts[key], records.length, () => {
        const filter = categoryButtons.find(b => b.dataset.filter === key); filter?.click();
        document.getElementById('projects')?.scrollIntoView({behavior:'smooth',block:'start'});
      }, 'Show projects in this sector');
    });
    Object.entries(statusCounts).sort((a,b)=>b[1]-a[1]).forEach(([status,count]) => {
      makeBar('dashStatuses', status, count, records.length, () => {
        if (statusSelect) { statusSelect.value = status; applyFilters(); }
        document.getElementById('projects')?.scrollIntoView({behavior:'smooth',block:'start'});
      }, 'Filter by reported status');
    });
    Object.entries(locationCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([location,count]) => {
      const row = document.createElement('button'); row.type='button'; row.className='dashboard-location-row';
      const name=document.createElement('span'); name.textContent=location;
      const number=document.createElement('strong'); number.textContent=count;
      row.append(name,number);
      row.addEventListener('click',()=>{
        if(locationSelect){ locationSelect.value=location; applyFilters(); }
        document.getElementById('projects')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
      document.getElementById('dashLocationsList')?.append(row);
    });
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
    sliderControls.innerHTML = '<button class="proj-btn" type="button" aria-label="Previous project">←</button><div class="proj-bar" aria-hidden="true"><i></i></div><span class="proj-count" aria-live="polite"></span><button class="proj-btn" type="button" aria-label="Next project">→</button><button class="proj-autoplay" type="button" aria-pressed="true" aria-label="Pause project autoplay">Ⅱ <span>Pause</span></button>';
    grid.after(sliderControls);
    const [previous, next] = sliderControls.querySelectorAll('.proj-btn');
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    grid.addEventListener('scroll', () => requestAnimationFrame(updateSlider), {passive:true});
    window.addEventListener('resize', updateSlider, {passive:true});
    const autoplay = sliderControls.querySelector('.proj-autoplay');
    let autoplayEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let autoplayTimer = null;
    const setAutoplay = enabled => {
      autoplayEnabled = enabled;
      autoplay.setAttribute('aria-pressed', String(enabled));
      autoplay.setAttribute('aria-label', enabled ? 'Pause project autoplay' : 'Start project autoplay');
      autoplay.innerHTML = enabled ? 'Ⅱ <span>Pause</span>' : '▶ <span>Play</span>';
      if (autoplayTimer) clearInterval(autoplayTimer);
      autoplayTimer = enabled ? setInterval(() => {
        if (document.hidden || grid.matches(':hover')) return;
        const shown = visible();
        if (shown.length < 2 || grid.scrollWidth <= grid.clientWidth + 2) return;
        const max = grid.scrollWidth - grid.clientWidth;
        if (grid.scrollLeft >= max - 4) grid.scrollTo({left:0,behavior:'smooth'});
        else move(1);
      }, 5200) : null;
    };
    autoplay.addEventListener('click', () => setAutoplay(!autoplayEnabled));
    grid.addEventListener('mouseenter', () => { if (autoplayTimer) clearInterval(autoplayTimer); });
    grid.addEventListener('mouseleave', () => { if (autoplayEnabled) setAutoplay(true); });
    grid.addEventListener('focusin', () => { if (autoplayTimer) clearInterval(autoplayTimer); });
    grid.addEventListener('focusout', () => { if (autoplayEnabled) setAutoplay(true); });
    setAutoplay(autoplayEnabled);
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
