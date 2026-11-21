(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const select = $('projectSelect'), input = $('photoInput'), previewWrap = $('previewWrap');
  const save = $('savePhoto'), list = $('photoList'), status = $('managerStatus'), frame = $('projectSource');
  const DB_NAME = 'aasule-project-photo-manager';
  let projects = [], photos = {}, customProjects = [], deletedKeys = [], edits = {}, lastFilled = '', pending = [], database;
  const slug = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const selected = () => projects.find(item => item.key === select.value);
  const say = message => { status.textContent = message; };
  const toArray = value => !value ? [] : Array.isArray(value) ? value : [value];
  const validData = value => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(value);
  function normaliseDraft(raw) {
    const result = {};
    Object.entries(raw || {}).forEach(([key, value]) => {
      const items = toArray(value).map(item => ({dataUrl: item?.dataUrl || '', alt: item?.alt || '', filename: item?.filename || 'project-photo'})).filter(item => validData(item.dataUrl)).slice(0, 5);
      if (items.length) result[key] = items;
    });
    return result;
  }
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('drafts')) request.result.createObjectStore('drafts'); };
      request.onsuccess = () => { database = request.result; resolve(database); };
      request.onerror = () => reject(request.error);
    });
  }
  async function readDraft(key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get(key);
      request.onsuccess = () => resolve(request.result || (key === 'projects' ? [] : {}));
      request.onerror = () => reject(request.error);
    });
  }
  async function readRaw(key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => { const request = db.transaction('drafts').objectStore('drafts').get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  }
  async function clearDraft() {
    const db = await openDatabase();
    return new Promise(resolve => { const tx = db.transaction('drafts','readwrite'); tx.objectStore('drafts').clear(); tx.oncomplete = resolve; tx.onerror = resolve; });
  }
  const loadDraft = () => readDraft('photos');
  const loadProjectDraft = () => readDraft('projects');
  const persist = () => {
    if (!database) return;
    try {
      const tx = database.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(photos, 'photos');
      tx.objectStore('drafts').put(customProjects, 'projects');
      tx.objectStore('drafts').put(deletedKeys, 'deleted');
      tx.objectStore('drafts').put(edits, 'edits');
      tx.onerror = () => say('Browser storage could not save this draft. Export a backup to keep your photos and projects.');
    } catch { say('Browser storage could not save this draft. Export a backup to keep your photos and projects.'); }
  };
  async function loadPublishedPhotos() {
    try {
      const response = await fetch('project-photo-overrides.json', {cache: 'no-cache'});
      if (!response.ok) return {};
      const manifest = await response.json(), output = {};
      for (const [key, value] of Object.entries(manifest || {})) {
        if (key.startsWith('_')) continue;
        const entries = Array.isArray(value?.photos) ? value.photos : toArray(value);
        const loaded = [];
        for (const item of entries.slice(0, 5)) {
          if (validData(item?.dataUrl)) { loaded.push({dataUrl:item.dataUrl, alt:item.alt || '', filename:item.filename || 'project-photo'}); continue; }
          if (!/^assets\/projects\/[a-z0-9-]+\.(webp|jpe?g|png)$/i.test(item?.src || '')) continue;
          try {
            const imageResponse = await fetch(item.src);
            if (!imageResponse.ok) continue;
            const blob = await imageResponse.blob();
            const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
            if (validData(dataUrl)) loaded.push({dataUrl, alt:item.alt || '', filename:item.src.split('/').pop()});
          } catch { /* missing published asset */ }
        }
        if (loaded.length) output[key] = loaded;
      }
      return output;
    } catch { return {}; }
  }
  async function loadPublishedProjects() {
    try { const response = await fetch('project-photo-overrides.json', {cache:'no-cache'}); if (!response.ok) return []; const manifest = await response.json(); return Array.isArray(manifest._projects) ? manifest._projects : []; } catch { return []; }
  }
  async function loadPublishedDeleted() {
    try { const response = await fetch('project-photo-overrides.json', {cache:'no-cache'}); if (!response.ok) return []; const manifest = await response.json(); return Array.isArray(manifest._deleted) ? manifest._deleted.filter(k => typeof k === 'string') : []; } catch { return []; }
  }
  async function loadPublishedEdits() {
    try { const response = await fetch('project-photo-overrides.json', {cache:'no-cache'}); if (!response.ok) return {}; const manifest = await response.json(); return manifest && typeof manifest._edits === 'object' && manifest._edits ? manifest._edits : {}; } catch { return {}; }
  }
  const isDeleted = key => deletedKeys.includes(key);
  const FIELDS = ['title','location','category','statusLine','description','sourceUrl','sourceLabel'];
  const clone = value => JSON.parse(JSON.stringify(value));
  // The values currently shown on the website for a project (original, or original + saved edit).
  function currentValues(project) {
    if (project.custom) {
      const entry = customProjects.find(item => slug(item.title) === project.key) || {};
      return {title:entry.title || project.title, location:entry.location || '', category:entry.category || 'infrastructure', statusLine:[entry.status, entry.date].filter(Boolean).join(' '), description:entry.description || '', sourceUrl:entry.sourceUrl || '', sourceLabel:entry.sourceLabel || ''};
    }
    return {...(project.original || {}), ...(edits[project.key] || {})};
  }
  function fillEditForm(force) {
    const project = selected();
    if (!project) { lastFilled = ''; return; }
    if (!force && lastFilled === project.key) return;
    lastFilled = project.key;
    const values = currentValues(project);
    $('editTitle').value = values.title || ''; $('editLocation').value = values.location || ''; $('editCategory').value = values.category || 'infrastructure';
    $('editStatus').value = values.statusLine || ''; $('editDescription').value = values.description || ''; $('editSourceUrl').value = values.sourceUrl || ''; $('editSourceLabel').value = values.sourceLabel || '';
    $('revertEditButton').hidden = project.custom || !edits[project.key];
  }
  function rebuildSelect(preferred) {
    const keep = preferred || select.value;
    select.replaceChildren();
    projects.filter(item => !isDeleted(item.key)).forEach(project => { const option = document.createElement('option'); option.value = project.key; option.textContent = project.title; select.append(option); });
    if (keep && [...select.options].some(option => option.value === keep)) select.value = keep;
  }
  function addProjectOption(project) {
    if (projects.some(item => item.key === project.key)) return;
    projects.push({...project, custom:true});
    rebuildSelect(project.key);
  }
  function renderDeleted() {
    const box = $('deletedList'); box.replaceChildren();
    const gone = projects.filter(item => isDeleted(item.key));
    if (!gone.length) { const p = document.createElement('p'); p.className = 'pm-help'; p.textContent = 'No deleted projects.'; box.append(p); return; }
    const heading = document.createElement('strong'); heading.className = 'pm-group-title'; heading.textContent = `Deleted projects (${gone.length}) — hidden after you export and redeploy`; box.append(heading);
    gone.forEach(project => {
      const row = document.createElement('div'); row.className = 'pm-list-item';
      const info = document.createElement('div'); const name = document.createElement('small'); name.textContent = project.title; info.append(name);
      const restore = document.createElement('button'); restore.className = 'pm-secondary'; restore.type = 'button'; restore.textContent = 'Restore';
      restore.addEventListener('click', () => { deletedKeys = deletedKeys.filter(key => key !== project.key); persist(); rebuildSelect(project.key); renderDeleted(); refresh(); updateCurrent(); say(`“${project.title}” restored. Export the website package to publish this change.`); });
      row.append(info, restore); box.append(row);
    });
  }
  function refresh() {
    list.replaceChildren();
    const entries = Object.entries(photos).filter(([key]) => !isDeleted(key));
    if (!entries.length) { const p = document.createElement('p'); p.textContent = 'No local photos added yet.'; list.append(p); return; }
    entries.forEach(([key, items]) => {
      const project = projects.find(item => item.key === key);
      const group = document.createElement('section'); group.className = 'pm-project-group';
      const heading = document.createElement('strong'); heading.className = 'pm-group-title'; heading.textContent = `${project?.title || key} · ${items.length}/5 photos`; group.append(heading);
      items.forEach((photo, index) => {
        const row = document.createElement('div'); row.className = 'pm-list-item';
        const img = document.createElement('img'); img.src = photo.dataUrl; img.alt = '';
        const info = document.createElement('div'); const meta = document.createElement('small'); meta.textContent = `${index + 1}. ${photo.filename || 'Local project photo'}`; info.append(meta);
        const remove = document.createElement('button'); remove.className = 'pm-remove'; remove.type = 'button'; remove.textContent = 'Remove';
        remove.addEventListener('click', () => {
          photos[key].splice(index, 1); if (!photos[key].length) delete photos[key];
          persist(); refresh(); updateCurrent(); say(`Photo removed from ${project?.title || key}. Export the updated package to publish this change.`);
        });
        row.append(img, info, remove); group.append(row);
      });
      list.append(group);
    });
  }
  frame.addEventListener('load', async () => {
    try {
      const cards = [...frame.contentDocument.querySelectorAll('.project-card')];
      const builtIn = cards.filter(card => !card.dataset.custom).map(card => {
        const title = card.querySelector('h3')?.textContent.trim() || 'Untitled project';
        const meta = (card.querySelector('.project-meta')?.textContent || '').split('·'), link = card.querySelector('.project-body > a');
        return {title, key:slug(title), original:{title, location:(meta[0] || '').trim(), statusLine:meta.slice(1).join('·').trim(), category:card.dataset.category || 'infrastructure', description:card.querySelector('.project-body p')?.textContent.trim() || '', sourceUrl:link?.href || '', sourceLabel:(link?.textContent || '').replace(/↗/g, '').trim()}};
      });
      try {
        // A saved draft is authoritative (so removals and deletions persist); with no draft yet we start from what is published.
        const [rawPhotos, rawProjects, rawDeleted, rawEdits] = await Promise.all([readRaw('photos'), readRaw('projects'), readRaw('deleted'), readRaw('edits')]);
        const published = await loadPublishedPhotos(), publishedProjects = await loadPublishedProjects(), publishedDeleted = await loadPublishedDeleted();
        photos = rawPhotos ? normaliseDraft(rawPhotos) : published;
        customProjects = Array.isArray(rawProjects) ? rawProjects.filter(item => item && item.title) : publishedProjects;
        deletedKeys = Array.isArray(rawDeleted) ? rawDeleted : publishedDeleted;
        edits = rawEdits && typeof rawEdits === 'object' ? rawEdits : await loadPublishedEdits();
        persist();
      } catch { photos = await loadPublishedPhotos(); customProjects = await loadPublishedProjects(); deletedKeys = await loadPublishedDeleted(); edits = await loadPublishedEdits(); say('Browser draft storage is unavailable. You can still add and export during this session.'); }
      projects = [];
      builtIn.forEach(item => { if (!projects.some(existing => existing.key === item.key)) projects.push({...item, title:edits[item.key]?.title || item.title, custom:false}); });
      customProjects.forEach(item => { const key = slug(item.title); if (!projects.some(project => project.key === key)) projects.push({title:item.title, key, custom:true}); });
      rebuildSelect(); renderDeleted(); refresh(); updateCurrent();
    } catch { select.innerHTML = '<option>Could not read project list</option>'; say('Open this manager from the same website folder/server as index.html.'); }
  });
  function updateCurrent() {
    const project = selected(), existing = project ? (photos[project.key] || []) : [];
    $('currentStatus').textContent = project ? `${existing.length}/5 photos saved. You can add ${5-existing.length} more photo(s).` : 'No project selected.';
    $('photoAlt').value = project ? `${project.title} project photograph` : '';
    fillEditForm(); pending = []; input.value = ''; $('pendingPreviewList').replaceChildren(); previewWrap.hidden = true; save.disabled = true;
    input.disabled = existing.length >= 5;
    if (existing.length >= 5) say('This project already has five photos. Remove one before adding another.');
  }
  $('addProjectButton').addEventListener('click', () => {
    const title = $('newProjectTitle').value.trim();
    const location = $('newProjectLocation').value.trim();
    const description = $('newProjectDescription').value.trim();
    const sourceUrl = $('newProjectSource').value.trim();
    if (!title || !location || !description) { say('Please enter the project name, location and description.'); return; }
    if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) { say('The source URL must begin with https://'); return; }
    const key = slug(title);
    if (projects.some(item => item.key === key)) { say(isDeleted(key) ? 'That project was deleted. Restore it from the Deleted projects list instead.' : 'A project with this name is already in the register. Choose a distinct project name.'); return; }
    const project = {title, location, category:$('newProjectCategory').value, status:$('newProjectStatus').value, date:$('newProjectDate').value.trim(), description, sourceUrl, sourceLabel:$('newProjectSourceLabel').value.trim() || 'Project report'};
    customProjects.push(project);
    addProjectOption({title, key});
    select.value = key;
    persist(); updateCurrent();
    $('newProjectTitle').value=''; $('newProjectLocation').value=''; $('newProjectDate').value=''; $('newProjectDescription').value=''; $('newProjectSource').value=''; $('newProjectSourceLabel').value='';
    say(`“${title}” has been added to your project register. You can now add up to five photos. Export the website package to publish the new project.`);
  });
  $('saveEditButton').addEventListener('click', () => {
    const project = selected();
    if (!project) { say('Choose a project in step 01 first.'); return; }
    const next = {title:$('editTitle').value.trim(), location:$('editLocation').value.trim(), category:$('editCategory').value, statusLine:$('editStatus').value.trim(), description:$('editDescription').value.trim(), sourceUrl:$('editSourceUrl').value.trim(), sourceLabel:$('editSourceLabel').value.trim()};
    if (!next.title || !next.location || !next.description) { say('Project name, location and description cannot be empty.'); return; }
    if (next.sourceUrl && !/^https:\/\//i.test(next.sourceUrl)) { say('The source URL must begin with https:// (or leave it blank).'); return; }
    if (project.custom) {
      const newKey = slug(next.title);
      if (newKey !== project.key && projects.some(item => item.key === newKey)) { say('Another project already uses that name. Choose a different name.'); return; }
      const entry = customProjects.find(item => slug(item.title) === project.key);
      if (!entry) { say('Could not find this project. Reload the manager and try again.'); return; }
      Object.assign(entry, {title:next.title, location:next.location, category:next.category, status:next.statusLine, date:'', description:next.description, sourceUrl:next.sourceUrl, sourceLabel:next.sourceLabel || 'Project report'});
      if (newKey !== project.key) { if (photos[project.key]) { photos[newKey] = photos[project.key]; delete photos[project.key]; } project.key = newKey; }
      project.title = next.title;
    } else {
      const original = project.original || {};
      if (FIELDS.every(field => (next[field] || '') === (original[field] || ''))) delete edits[project.key]; else edits[project.key] = next;
      project.title = next.title;
    }
    persist(); rebuildSelect(project.key); renderDeleted(); refresh(); lastFilled = ''; updateCurrent(); fillEditForm(true);
    say(`Changes to “${next.title}” saved. Export the website package and redeploy to publish them.`);
  });
  $('revertEditButton').addEventListener('click', () => {
    const project = selected(); if (!project || project.custom) return;
    delete edits[project.key]; project.title = project.original?.title || project.title;
    persist(); rebuildSelect(project.key); refresh(); lastFilled = ''; updateCurrent(); fillEditForm(true);
    say('Reverted to the original wording. Export the website package to publish this change.');
  });
  $('deleteProjectButton').addEventListener('click', () => {
    const project = selected();
    if (!project) { say('Choose a project in step 01 first.'); return; }
    const message = project.custom
      ? `Permanently delete “${project.title}” and its photos?\n\nThis cannot be undone unless you import a backup.`
      : `Delete “${project.title}” from the website?\n\nIt disappears for visitors after you export and redeploy. You can restore it later from the Deleted projects list.`;
    if (!window.confirm(message)) return;
    if (project.custom) {
      customProjects = customProjects.filter(item => slug(item.title) !== project.key);
      projects = projects.filter(item => item.key !== project.key);
      delete photos[project.key];
    } else if (!isDeleted(project.key)) deletedKeys.push(project.key);
    persist(); rebuildSelect(); renderDeleted(); refresh(); updateCurrent();
    say(`“${project.title}” deleted. Export the website package and redeploy to remove it from the live site.`);
  });
  $('resetDraftButton').addEventListener('click', async () => {
    if (!window.confirm('Discard everything saved in this browser (unexported photos, added projects and deletions) and reload from the published website?')) return;
    await clearDraft(); location.reload();
  });
  select.addEventListener('change', updateCurrent);
  async function optimise(file) {
    const bitmap = await createImageBitmap(file, {imageOrientation:'from-image'});
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width*scale); canvas.height = Math.round(bitmap.height*scale);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close?.();
    let url = canvas.toDataURL('image/webp', .82); if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', .85);
    return {dataUrl:url, width:canvas.width, height:canvas.height, filename:file.name};
  }
  input.addEventListener('change', async () => {
    const project = selected(), current = project ? (photos[project.key] || []).length : 0;
    const files = [...(input.files || [])]; if (!files.length) return;
    if (files.length + current > 5) { say(`This project can hold five photos maximum. It has ${current}; select no more than ${5-current} additional photo(s).`); input.value=''; return; }
    if (files.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type))) { say('Please choose JPG, PNG or WebP images only.'); input.value=''; return; }
    if (files.some(file => file.size > 15*1024*1024)) { say('Each image must be 15 MB or smaller.'); input.value=''; return; }
    save.disabled = true; say(`Optimising ${files.length} photo(s)…`);
    try {
      pending = [];
      for (const file of files) pending.push(await optimise(file));
      const box = $('pendingPreviewList'); box.replaceChildren();
      pending.forEach(item => { const img = document.createElement('img'); img.src=item.dataUrl; img.alt=item.filename; box.append(img); });
      previewWrap.hidden = false; save.disabled = false;
      $('photoMeta').textContent = `${pending.length} photo(s) ready · optimised for web display`;
      say(`Ready to add ${pending.length} photo(s) to ${project?.title || 'the selected project'}.`);
    } catch { say('One or more images could not be read. Please try again.'); pending=[]; input.value=''; }
  });
  save.addEventListener('click', () => {
    const project = selected(); if (!project || !pending.length) return;
    const existing = photos[project.key] || [];
    if (existing.length + pending.length > 5) { say('A project can have no more than five photos.'); return; }
    const baseAlt = $('photoAlt').value.trim() || `${project.title} project photograph`;
    photos[project.key] = [...existing, ...pending.map((item,index) => ({...item, alt:pending.length > 1 ? `${baseAlt} ${existing.length+index+1}` : baseAlt}))];
    persist(); refresh(); updateCurrent(); say(`Saved ${pending.length} photo(s) for ${project.title}. Export the website package to publish them.`);
  });
  $('importButton').addEventListener('click', () => $('importInput').click());
  $('importInput').addEventListener('change', () => {
    const file = $('importInput').files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onerror = () => say('Could not read that JSON file.');
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = normaliseDraft(parsed.photos || parsed);
        if (!Object.keys(incoming).length && !Array.isArray(parsed.projects) && !Array.isArray(parsed.deleted) && !parsed.edits) throw new Error();
        Object.entries(incoming).forEach(([key, items]) => { photos[key] = [...(photos[key] || []), ...items].slice(0,5); });
        if (Array.isArray(parsed.projects)) parsed.projects.forEach(item => { if (item?.title && !customProjects.some(existing => slug(existing.title) === slug(item.title))) { customProjects.push(item); addProjectOption({title:item.title,key:slug(item.title)}); } });
        if (parsed.edits && typeof parsed.edits === 'object') edits = {...edits, ...parsed.edits};
        if (Array.isArray(parsed.deleted)) deletedKeys = [...new Set([...deletedKeys, ...parsed.deleted.filter(k => typeof k === 'string')])];
        rebuildSelect(); renderDeleted(); persist(); refresh(); updateCurrent(); say('Backup imported. Export the website package when ready to publish.');
      } catch { say('That file is not a valid project photo backup.'); }
    };
    reader.readAsText(file); $('importInput').value='';
  });
  const CRC = (() => { const t=new Uint32Array(256); for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t; })();
  const crc32 = bytes => { let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=CRC[(c^bytes[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0; };
  function makeZip(files) {
    const enc=new TextEncoder(),parts=[],central=[];let offset=0;
    const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
    files.forEach(({name,data})=>{
      const nb=enc.encode(name),crc=crc32(data);
      const local=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0)]);
      parts.push(local,nb,data);
      central.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),nb);
      offset+=local.length+nb.length+data.length;
    });
    const cdSize=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array([0x50,0x4b,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cdSize),...u32(offset),...u16(0)]);
    return new Blob([...parts,...central,end],{type:'application/zip'});
  }
  const download=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);};
  const dataToBytes=dataUrl=>{const bin=atob(dataUrl.split(',')[1]),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;};
  $('exportButton').addEventListener('click',()=>{
    const entries=Object.entries(photos).filter(([key])=>!isDeleted(key));
    if(!entries.length && !customProjects.length && !deletedKeys.length && !Object.keys(edits).length){say('Add a project, a photo or a deletion before exporting.');return;}
    const manifest={_version:Date.now().toString(36),_projects:customProjects,_deleted:deletedKeys,_edits:edits},files=[];let count=0;
    entries.forEach(([key,items])=>{
      manifest[key]={photos:items.slice(0,5).map((photo,index)=>{
        const ext=photo.dataUrl.startsWith('data:image/webp')?'webp':photo.dataUrl.startsWith('data:image/png')?'png':'jpg';
        const path=`assets/projects/${key}-${index+1}.${ext}`;files.push({name:path,data:dataToBytes(photo.dataUrl)});count++;return{src:path,alt:photo.alt||'Project photograph'};
      })};
    });
    files.unshift({name:'project-photo-overrides.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
    download(makeZip(files),'project-photos-package.zip');
    say(`Exported ${customProjects.length} added project(s), ${deletedKeys.length} deleted project(s) and ${count} photo(s). Unzip beside index.html (replace existing files), then redeploy. Photo files of deleted projects can be removed from assets/projects.`);
  });
  $('backupButton').addEventListener('click',()=>{download(new Blob([JSON.stringify({photos,projects:customProjects,deleted:deletedKeys,edits})],{type:'application/json'}),'project-manager-backup.json');say(`Backup saved (${customProjects.length} custom project(s), ${Object.values(photos).reduce((n,a)=>n+a.length,0)} photo(s)).`);});
})();
