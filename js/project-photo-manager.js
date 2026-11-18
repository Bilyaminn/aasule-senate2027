(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const select = $('projectSelect'), input = $('photoInput'), preview = $('photoPreview'), previewWrap = $('previewWrap');
  const save = $('savePhoto'), list = $('photoList'), status = $('managerStatus'), frame = $('projectSource');
  const DB_NAME = 'aasule-project-photo-manager';
  let projects = [], photos = {}, pendingData = '', pendingName = '', database;
  function openDatabase() { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => request.result.createObjectStore('drafts'); request.onsuccess = () => { database = request.result; resolve(database); }; request.onerror = () => reject(request.error); }); }
  async function loadDraft() { const db = await openDatabase(); return new Promise((resolve, reject) => { const request = db.transaction('drafts').objectStore('drafts').get('photos'); request.onsuccess = () => resolve(request.result || {}); request.onerror = () => reject(request.error); }); }
  const slug = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const selected = () => projects.find(item => item.key === select.value);
  const say = message => { status.textContent = message; };
  const persist = () => { if (!database) return; try { const tx = database.transaction('drafts', 'readwrite'); tx.objectStore('drafts').put(photos, 'photos'); tx.onerror = () => say('Browser storage could not save this draft. Export your photo file to keep a backup.'); } catch { say('Browser storage could not save this draft. Export your photo file to keep a backup.'); } };
  function refresh() {
    list.replaceChildren();
    const entries = Object.entries(photos);
    if (!entries.length) { const p = document.createElement('p'); p.textContent = 'No local photos added yet.'; list.append(p); return; }
    entries.forEach(([key, photo]) => {
      const project = projects.find(item => item.key === key);
      const row = document.createElement('div'); row.className = 'pm-list-item';
      const img = document.createElement('img'); img.src = photo.dataUrl; img.alt = '';
      const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = project?.title || key;
      const meta = document.createElement('small'); meta.textContent = photo.filename || 'Local project photo'; info.append(title, meta);
      const remove = document.createElement('button'); remove.className = 'pm-remove'; remove.type = 'button'; remove.textContent = 'Remove';
      remove.addEventListener('click', () => { delete photos[key]; persist(); refresh(); say(`Photo removed from ${project?.title || key}. Export the updated file to publish this change.`); });
      row.append(img, info, remove); list.append(row);
    });
  }
  frame.addEventListener('load', async () => {
    try {
      const cards = [...frame.contentDocument.querySelectorAll('.project-card')];
      projects = cards.map(card => { const title = card.querySelector('h3')?.textContent.trim() || 'Untitled project'; return {title, key: slug(title)}; });
      select.replaceChildren();
      projects.forEach(project => { const option = document.createElement('option'); option.value = project.key; option.textContent = project.title; select.append(option); });
      try { photos = await loadDraft(); } catch { photos = {}; say('Browser draft storage is unavailable. You can still export photos during this session.'); }
      refresh();
      updateCurrent();
    } catch { select.innerHTML = '<option>Could not read project list</option>'; say('Open this manager from the same website folder/server as index.html.'); }
  });
  function updateCurrent() {
    const project = selected(); const existing = project && photos[project.key];
    $('currentStatus').textContent = project ? (existing ? `A local photo is already saved for this project (${existing.filename || 'image'}). Upload another image to replace it.` : 'No local photo saved for this project yet.') : 'No project selected.';
    $('photoAlt').value = existing?.alt || (project ? `${project.title} project photograph` : '');
    pendingData = ''; pendingName = ''; input.value = ''; previewWrap.hidden = true; save.disabled = true;
  }
  select.addEventListener('change', updateCurrent);
  // Shrink every photo to a web-friendly size so the live site stays fast (typically 60-200 KB each).
  async function optimise(file) {
    const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const c = canvas.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, canvas.width, canvas.height); c.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    let url = canvas.toDataURL('image/webp', 0.82);
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', 0.85); // Safari cannot encode WebP
    return {url, width: canvas.width, height: canvas.height};
  }
  input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { say('Please choose a JPG, PNG or WebP image.'); input.value = ''; return; }
    if (file.size > 15 * 1024 * 1024) { say('That image is larger than 15 MB. Resize it before uploading.'); input.value = ''; return; }
    say('Optimising photo…'); save.disabled = true;
    try {
      const out = await optimise(file);
      pendingData = out.url; pendingName = file.name; preview.src = pendingData;
      $('photoMeta').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB → ${Math.round(out.url.length * 0.75 / 1024)} KB (${out.width}×${out.height})`;
      previewWrap.hidden = false; save.disabled = false; say('Photo ready. Save it to the selected project.');
    } catch { say('The image could not be read. Please try another file.'); input.value = ''; }
  });
  save.addEventListener('click', () => {
    const project = selected(); if (!project || !pendingData) return;
    photos[project.key] = {dataUrl:pendingData, alt:$('photoAlt').value.trim() || `${project.title} project photograph`, filename:pendingName};
    persist(); refresh(); updateCurrent(); say(`Saved a local photo for ${project.title}. Export the website photo file when you are ready to publish.`);
  });
  $('importButton').addEventListener('click', () => $('importInput').click());
  $('importInput').addEventListener('change', () => {
    const file = $('importInput').files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onerror = () => say('Could not read that JSON file.');
    reader.onload = () => { try { const incoming = JSON.parse(reader.result); if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error(); const ok = Object.entries(incoming).filter(([, v]) => v && /^data:image\/(jpeg|png|webp);base64,/.test(v.dataUrl || '')); if (!ok.length) throw new Error(); photos = {...photos, ...Object.fromEntries(ok)}; persist(); refresh(); say('Backup imported. Export the website package when ready to publish.'); } catch { say('That file is not a valid project photo JSON file.'); } };
    reader.readAsText(file); $('importInput').value = '';
  });
  // ---- minimal store-only ZIP writer (no libraries, works offline) ----
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = bytes => { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
    const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
    files.forEach(({name, data}) => {
      const nameBytes = enc.encode(name), crc = crc32(data);
      const local = new Uint8Array([0x50,0x4b,3,4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0)]);
      parts.push(local, nameBytes, data);
      central.push(new Uint8Array([0x50,0x4b,1,2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameBytes);
      offset += local.length + nameBytes.length + data.length;
    });
    const cdSize = central.reduce((n, p) => n + p.length, 0);
    const end = new Uint8Array([0x50,0x4b,5,6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
    return new Blob([...parts, ...central, end], {type: 'application/zip'});
  }
  const download = (blob, name) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); };
  const dataToBytes = dataUrl => { const bin = atob(dataUrl.split(',')[1]); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

  $('exportButton').addEventListener('click', () => {
    const entries = Object.entries(photos);
    if (!entries.length) { say('Add at least one photo before exporting.'); return; }
    const manifest = {}, files = [];
    entries.forEach(([key, photo]) => {
      const ext = photo.dataUrl.startsWith('data:image/webp') ? 'webp' : photo.dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
      const path = `assets/projects/${key}.${ext}`;
      manifest[key] = {src: path, alt: photo.alt};
      files.push({name: path, data: dataToBytes(photo.dataUrl)});
    });
    files.unshift({name: 'project-photo-overrides.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2))});
    download(makeZip(files), 'project-photos-package.zip');
    say(`Exported ${entries.length} photo(s). Unzip into the website's main folder (beside index.html), keeping the assets/projects folder, then redeploy.`);
  });
  $('backupButton').addEventListener('click', () => {
    download(new Blob([JSON.stringify(photos)], {type: 'application/json'}), 'project-photos-backup.json');
    say(`Backup saved (${Object.keys(photos).length} photo(s)). Use "Import backup" to restore it later.`);
  });
})();
