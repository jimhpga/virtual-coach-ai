/* docs/nav.js */
(function () {
  const css = `
  :root{--nav:#0b2b12;--scrim:rgba(0,0,0,.05);--line:rgba(255,255,255,.12);--text:#ecf3f7;--maxw:1100px}
  header.vc {position:sticky;top:0;z-index:1000;background:var(--nav);border-bottom:1px solid rgba(255,255,255,.1)}
  .vc-wrap{width:min(var(--maxw),94%);margin:0 auto;padding:10px 0;display:flex;gap:12px;align-items:center;justify-content:space-between}
  .vc-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:800}
  .vc-img{height:32px;width:auto;display:block}
  nav.vc-menu{display:flex;gap:8px}
  nav.vc-menu a{color:#fff;text-decoration:none;padding:8px 10px;border-radius:10px;border:1px solid transparent;white-space:nowrap}
  nav.vc-menu a:hover{background:rgba(255,255,255,.08)}
  nav.vc-menu a[aria-current="page"]{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.10)}
  .vc-btn{display:none;align-items:center;gap:8px;color:#fff;background:transparent;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:6px 10px;cursor:pointer}
  @media (max-width:820px){
    .vc-btn{display:inline-flex}
    nav.vc-menu{position:absolute;right:0;top:100%;background:var(--nav);border-bottom:1px solid rgba(255,255,255,.1);display:none;flex-direction:column;padding:8px}
    header.vc.open nav.vc-menu{display:flex}
  }`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const html = `
  <header class="vc" id="vc-header">
    <div class="vc-wrap">
      <a class="vc-brand" href="index.html">
        <img class="vc-img" src="virtualcoach-logo-transparent.png" alt="Virtual Coach AI"/>
        <span>Virtual Coach AI</span>
      </a>
      <button class="vc-btn" id="vc-toggle" aria-expanded="false">Menu ▾</button>
      <nav class="vc-menu" id="vc-menu" aria-label="Primary">
        <a href="index.html">Home</a>
        <a href="upload.html">Upload</a>
        <a href="report.html?report=report.json">Reports</a>
        <a href="pricing.html">Pricing</a>
        <a href="contact.html">Contact</a>
      </nav>
    </div>
  </header>`;
  document.body.insertAdjacentHTML('afterbegin', html);

  const hdr = document.getElementById('vc-header');
  const btn = document.getElementById('vc-toggle');
  const menu = document.getElementById('vc-menu');
  btn?.addEventListener('click', ()=>{ const o = hdr.classList.toggle('open'); btn.setAttribute('aria-expanded', o?'true':'false'); });
  menu?.addEventListener('click', e=>{ if(e.target.tagName==='A'){ hdr.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }});

  // mark current page
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  menu?.querySelectorAll('a').forEach(a=>{
    const name=(a.getAttribute('href')||'').split('?')[0].toLowerCase();
    if (name===page || (name==='report.html' && page==='report.html')) a.setAttribute('aria-current','page');
  });
})();
