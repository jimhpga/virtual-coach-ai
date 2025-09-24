<script>
/* ---------- Virtual Coach AI — shared header injection ---------- */
(function(){
  const mount = document.getElementById('navMount') || (function(){
    const d=document.createElement('div'); d.id='navMount'; document.body.insertBefore(d, document.body.firstChild); return d;
  })();

  // Resolve current page for active state
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const LINKS = [
    {href:'index.html', label:'Home', match:['','index.html']},
    {href:'upload.html', label:'Upload', match:['upload','upload.html']},
    // For reports we’ll consider any page that includes "report"
    {href:'report.html?report=report.json', label:'Reports', match:['report']},
    {href:'pricing.html', label:'Pricing', match:['pricing','pricing.html']},
    {href:'contact.html', label:'Contact', match:['contact','contact.html']},
    {href:'coming-soon.html', label:'Coming Soon', match:['coming-soon']},
    {href:'login.html', label:'Login', match:['login','login.html']},
  ];

  function isActive(link){
    const p = path || 'index.html';
    return link.match.some(m => p.includes(m));
  }

  mount.innerHTML = `
    <header class="vc-header" id="vcHeader">
      <div class="vc-navwrap">
        <a class="vc-brand" href="index.html">
          <div class="vc-brand-logo" aria-hidden="true"></div><span>Virtual Coach AI</span>
        </a>
        <button class="vc-menu-toggle" id="vcMenuBtn" aria-expanded="false">Menu ▾</button>
        <nav class="vc-nav" id="vcNav" aria-label="Primary">
          ${LINKS.map(l => `<a href="${l.href}" ${isActive(l)?'aria-current="page"':''}>${l.label}</a>`).join('')}
        </nav>
      </div>
    </header>
  `;

  // Mobile toggle
  const header = document.getElementById('vcHeader');
  const btn = document.getElementById('vcMenuBtn');
  const nav = document.getElementById('vcNav');
  if (btn){
    btn.addEventListener('click', ()=>{
      const open = header.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  if (nav){
    nav.addEventListener('click', e=>{
      if (e.target && e.target.tagName==='A'){ header.classList.remove('open'); btn && btn.setAttribute('aria-expanded','false'); }
    });
  }

  // Optional: light footer if a page wants one
  if (!document.querySelector('.vc-footer')){
    const f = document.createElement('footer');
    f.className = 'vc-footer';
    f.innerHTML = `© <span id="vcYear"></span> Virtual Coach AI`;
    document.body.appendChild(f);
    const y = f.querySelector('#vcYear'); if (y) y.textContent = new Date().getFullYear();
  }
})();
</script>
