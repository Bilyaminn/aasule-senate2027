(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const lgas = ['Akwanga','Awe','Doma','Karu','Keana','Keffi','Kokona','Lafia','Nasarawa','Nasarawa Eggon','Obi','Toto','Wamba'];
  const sectorNames = {infrastructure:'Infrastructure',industry:'Industry & investment',health:'Health & education',agriculture:'Agriculture & environment'};
  const clean = value => String(value || '').replace(/\s+/g,' ').trim();
  const keyOf = value => clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const classifyStatus = value => { const t=value.toLowerCase(); if(/under construction|construction.*progress|advanced stages/.test(t))return 'Under construction'; if(/budgeted|budget provision/.test(t))return 'Budgeted'; if(/proposed|preparation stage|pipeline/.test(t))return 'Proposed'; if(/announced|groundbreaking/.test(t))return 'Announced'; if(/completed|commissioned|operational/.test(t))return 'Completed / commissioned'; if(/ongoing|operations|phased development/.test(t))return 'Ongoing'; return 'Reported'; };
  const statusOrder=['Completed / commissioned','Ongoing','Under construction','Announced','Budgeted','Proposed','Reported'];
  const hasLga = (location,lga) => { const a=location.toLowerCase().replace(/[^a-z0-9]+/g,' '), b=lga.toLowerCase(); return (` ${a} `).includes(` ${b} `); };
  const state = {records:[],sector:'all',status:'all',lga:'all',query:'',photos:{}};
  const modal = $('#project-modal');
  const photoModal=document.createElement('dialog');photoModal.className='dash-photo-modal';photoModal.setAttribute('aria-label','Project photograph');photoModal.innerHTML='<form method="dialog"><button class="dash-photo-close" aria-label="Close photograph">×</button></form><img alt="">';document.body.append(photoModal);
  function showDashPhoto(src,alt){const img=$('img',photoModal);img.src=src;img.alt=alt||'Project photograph';if(typeof photoModal.showModal==='function')photoModal.showModal();else photoModal.setAttribute('open','');}
  photoModal.addEventListener('click',e=>{if(e.target===photoModal)photoModal.close();});

  function parseCard(card, index, edits={}) {
    const originalTitle=clean($('h3',card)?.textContent);
    const edit=edits[keyOf(originalTitle)] || {};
    const meta=clean($('.project-meta',card)?.textContent);
    const location=clean(edit.location || meta.split('·')[0] || 'Location not specified');
    const statusLine=clean(edit.statusLine || meta.split('·').slice(1).join('·'));
    const title=clean(edit.title || originalTitle);
    const description=clean(edit.description || $('p',card)?.textContent);
    const source=$('a[href^="https://"]',card);
    const sourceUrl=typeof edit.sourceUrl==='string' ? edit.sourceUrl : (source?.href || '');
    return {key:keyOf(originalTitle),title,location,status:classifyStatus(statusLine),statusLine,description,sector:card.dataset.category || 'infrastructure',sourceUrl:/^https:\/\//i.test(sourceUrl)?sourceUrl:'',sourceLabel:clean(edit.sourceLabel || source?.textContent || 'View source report'),search:`${title} ${location} ${statusLine} ${description} ${sectorNames[card.dataset.category]||''}`.toLowerCase(),index};
  }
  function renderMetrics(records) {
    $('#metric-total').textContent=records.length;
    $('#metric-completed').textContent=records.filter(r=>r.status==='Completed / commissioned').length;
    $('#metric-ongoing').textContent=records.filter(r=>['Ongoing','Under construction'].includes(r.status)).length;
    $('#metric-lga').textContent=new Set(records.flatMap(r=>lgas.filter(l=>hasLga(r.location,l)))).size;
  }
  function renderCharts(records) {
    const sectorCounts=Object.fromEntries(Object.keys(sectorNames).map(k=>[k,records.filter(r=>r.sector===k).length]));
    const max=Math.max(1,...Object.values(sectorCounts));
    $('#sector-chart').innerHTML=Object.entries(sectorNames).map(([key,label])=>{const count=sectorCounts[key],share=records.length?Math.round(count/records.length*100):0;return `<div class="bar-row ${state.sector===key?'is-selected':''}"><button type="button" data-sector-pick="${key}" aria-pressed="${state.sector===key}">${escapeHTML(label)}</button><div class="bar-track" role="img" aria-label="${count} records, ${share}% of register"><div class="bar-fill" style="width:${count/max*100}%"></div></div><span class="bar-count">${count}<small>${share}%</small></span></div>`;}).join('');
    $('#sector-chart').querySelectorAll('[data-sector-pick]').forEach(button=>button.addEventListener('click',()=>{state.sector=state.sector===button.dataset.sectorPick?'all':button.dataset.sectorPick;$('#dash-sector').value=state.sector;renderList();}));
    const statuses=statusOrder.filter(s=>records.some(r=>r.status===s));
    $('#status-chart').innerHTML=statuses.map(s=>{const count=records.filter(r=>r.status===s).length,share=records.length?Math.round(count/records.length*100):0;return `<button type="button" class="status-row ${state.status===s?'active':''}" data-status-pick="${escapeHTML(s)}" aria-pressed="${state.status===s}"><span>${escapeHTML(s)}</span><strong>${count}<small>${share}%</small></strong><i class="status-track"><b style="width:${share}%"></b></i></button>`;}).join('');
    $('#status-chart').querySelectorAll('[data-status-pick]').forEach(button=>button.addEventListener('click',()=>{state.status=state.status===button.dataset.statusPick?'all':button.dataset.statusPick;$('#dash-status').value=state.status;renderList();}));
  }
  function renderLgas(records) {
    $('#lga-grid').innerHTML=lgas.map(lga=>{const count=records.filter(r=>hasLga(r.location,lga)).length;return `<button type="button" class="lga-chip ${state.lga===lga?'active':''}" data-lga="${escapeHTML(lga)}">${escapeHTML(lga)}<small>${count} ${count===1?'record':'records'}</small></button>`;}).join('');
    $('#lga-grid').querySelectorAll('[data-lga]').forEach(button=>button.addEventListener('click',()=>{state.lga=state.lga===button.dataset.lga?'all':button.dataset.lga;renderList();renderLgas(records);}));
  }
  function filtered() { return state.records.filter(r=>(state.sector==='all'||r.sector===state.sector)&&(state.status==='all'||r.status===state.status)&&(state.lga==='all'||hasLga(r.location,state.lga))&&(!state.query||r.search.includes(state.query))); }
  function openProject(record) {
    const content=$('#modal-content');
    const photos=Array.isArray(state.photos[record.key]?.photos)?state.photos[record.key].photos:[];
    const gallery=photos.length?`<div class="dash-modal-gallery" aria-label="Project photographs">${photos.slice(0,5).map((p,i)=>`<button type="button" class="dash-modal-photo" data-photo-src="${escapeHTML(p.src)}" data-photo-alt="${escapeHTML(p.alt||record.title)}" aria-label="View photograph ${i+1}"><img src="${escapeHTML(p.src)}" alt="${escapeHTML(p.alt||record.title)}" loading="lazy"><span>${i+1}</span></button>`).join('')}</div>`:'';
    content.innerHTML=`<span class="modal-kicker">${escapeHTML(sectorNames[record.sector]||'Public project')}</span><h2>${escapeHTML(record.title)}</h2><div class="modal-facts"><span>${escapeHTML(record.location)}</span><span>${escapeHTML(record.status)}</span></div>${gallery}<p>${escapeHTML(record.description||'No additional description is available in the register.')}</p>${record.sourceUrl?`<a class="modal-source" href="${escapeHTML(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(record.sourceLabel)} ↗</a>`:'<p>Source link not supplied in the current register.</p>'}<p class="register-footnote">Status follows the linked public report; it has not been independently audited.</p>`;
    content.querySelectorAll('[data-photo-src]').forEach(button=>button.addEventListener('click',()=>showDashPhoto(button.dataset.photoSrc,button.dataset.photoAlt)));
    if(typeof modal.showModal==='function')modal.showModal();else modal.setAttribute('open','');
  }
  function renderList() {
    const records=filtered();
    $('#register-count').textContent=`Showing ${records.length} of ${state.records.length} project records`;
    const filters=[];if(state.sector!=='all')filters.push(sectorNames[state.sector]);if(state.status!=='all')filters.push(state.status);if(state.lga!=='all')filters.push(state.lga);if(state.query)filters.push(`“${state.query}”`);
    $('#active-filter').textContent=filters.length?`Filters: ${filters.join(' · ')}`:'All records';
    $('#project-list').innerHTML=records.length?records.map(r=>`<article class="dash-project"><div><div class="dash-project-meta">${escapeHTML(sectorNames[r.sector]||'Public project')} · ${escapeHTML(r.location)}</div><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.description.slice(0,210))}${r.description.length>210?'…':''}</p><span class="status-pill">${escapeHTML(r.status)}</span></div><button type="button" data-open-key="${escapeHTML(r.key)}">View details ↗</button></article>`).join(''):'<div class="dash-empty">No records match these filters. Try a different search or reset the filters.</div>';
    $('#project-list').querySelectorAll('[data-open-key]').forEach(button=>button.addEventListener('click',()=>{const record=state.records.find(r=>r.key===button.dataset.openKey);if(record)openProject(record);}));
    $$('#status-chart [data-status-pick]').forEach(b=>b.classList.toggle('active',state.status===b.dataset.statusPick));
  }
  function reset() {state.sector='all';state.status='all';state.lga='all';state.query='';$('#dash-search').value='';$('#dash-sector').value='all';$('#dash-status').value='all';renderLgas(state.records);renderList();}
  async function init() {
    try {
      const [htmlResponse,manifestResponse]=await Promise.all([fetch('index.html',{cache:'no-cache'}),fetch('project-photo-overrides.json',{cache:'no-cache'}).catch(()=>null)]);
      if(!htmlResponse.ok)throw new Error('Could not load the main project register.');
      const html=await htmlResponse.text(), doc=new DOMParser().parseFromString(html,'text/html');
      const manifest=manifestResponse?.ok?await manifestResponse.json().catch(()=>({})):{};
      state.photos=manifest;
      const deleted=new Set(Array.isArray(manifest._deleted)?manifest._deleted:[]);
      state.records=$$('.project-card',doc).map((card,i)=>parseCard(card,i,manifest._edits||{})).filter(r=>!deleted.has(r.key));
      (Array.isArray(manifest._projects)?manifest._projects:[]).forEach((p,i)=>{if(!p||!clean(p.title))return;const status=classifyStatus(p.status||'Reported');const r={key:`custom-${keyOf(p.title)}`,title:clean(p.title),location:clean(p.location||'Location not specified'),status,statusLine:clean(p.status),description:clean(p.description),sector:sectorNames[p.category]?p.category:'infrastructure',sourceUrl:/^https:\/\//i.test(p.sourceUrl||'')?p.sourceUrl:'',sourceLabel:clean(p.sourceLabel||'Project report'),search:`${p.title} ${p.location||''} ${p.status||''} ${p.description||''}`.toLowerCase(),index:state.records.length+i};state.records.push(r);});
      renderMetrics(state.records);renderCharts(state.records);renderLgas(state.records);
      statusOrder.filter(s=>state.records.some(r=>r.status===s)).forEach(s=>$('#dash-status').insertAdjacentHTML('beforeend',`<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`));
      renderList();
    } catch(error) { $('#project-list').innerHTML=`<div class="dash-empty">${escapeHTML(error.message)} Open the homepage project register to review the current entries.</div>`;$('#register-count').textContent='Project register unavailable'; }
  }
  $('#dash-search').addEventListener('input',e=>{state.query=e.target.value.toLowerCase().trim();renderList();});
  $('#dash-sector').addEventListener('change',e=>{state.sector=e.target.value;renderList();});
  $('#dash-status').addEventListener('change',e=>{state.status=e.target.value;renderList();});
  $('#dash-reset').addEventListener('click',reset);
  modal?.addEventListener('click',e=>{if(e.target===modal)modal.close();});
  init();
})();
