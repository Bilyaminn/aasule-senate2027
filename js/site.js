(()=>{
'use strict';
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav'),header=document.querySelector('.header');
const setNav=o=>{nav.classList.toggle('open',o);toggle.setAttribute('aria-expanded',String(o));toggle.setAttribute('aria-label',o?'Close navigation':'Open navigation');toggle.textContent=o?'\u00d7':'\u2630'};
if(toggle&&nav){
  toggle.addEventListener('click',()=>setNav(!nav.classList.contains('open')));
  nav.addEventListener('click',e=>{if(e.target.closest('a'))setNav(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){setNav(false);toggle.focus()}});
}
if(header){const f=()=>header.classList.toggle('is-scrolled',scrollY>8);f();addEventListener('scroll',f,{passive:true})}

// Keep the current page obvious and provide a persistent mobile poster action.
if (nav) {
  const currentFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  nav.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#') && href.split('#')[0].toLowerCase() === currentFile) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else if (!href.includes('#')) {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}
// Route every poster CTA through one explicit navigation handler.
document.querySelectorAll('a[href="generate.html"]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.location.assign(new URL(link.getAttribute('href'), document.baseURI).href);
  });
});

if (!/generate\.html$/i.test(location.pathname)) {
  document.body.classList.add('has-persistent-cta');
  const cta = document.createElement('a');
  cta.className = 'mobile-persistent-cta';
  cta.href = 'generate.html';
  cta.innerHTML = 'Create your support poster <span aria-hidden="true">↗</span>';
  cta.setAttribute('aria-label', 'Create your support poster');
  document.body.append(cta);
}

// scroll reveal (progressive enhancement)
const els=document.querySelectorAll('.record-card,.project-card,.achievement-card,.timeline article');
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  document.documentElement.classList.add('js-reveal');
  const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{rootMargin:'0px 0px -8% 0px'});
  els.forEach(el=>io.observe(el));
}
})();
