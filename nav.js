// /nav.js  — single-file, drop-in NAV for every page
(function () {
  const TPL = `
  <nav class="topbar" role="navigation" aria-label="Primary">
    <div class="wrap">
      <div class="brand"><a href="/index.html">Virtual Coach AI</a></div>
      <div class="nav">
        <a href="/index.html" data-nav>Home</a>
        <a href="/report.html?report=/report.json" data-nav>Reports</a>
        <a href="/coming-soon.html" data-nav>Coming Soon</a>
        <a href="/pricing.html" data-nav>Pricing</a>
        <a href="/faq.html" data-nav>FAQ</a>
        <a href="/contact.html" data-nav>Contact</a>
        <a href="/login.html" data-nav>Login</a>
      </div>
    </div>
  </nav>
  <style>
    /* Self-contained styles (no pills, dark green bar, unified spacing) */
    .topbar{position:sticky;top:0;z-index:1000;background:#0b2b12;border-bottom:1px solid rgba(255,255,255,.08)}
    .topbar .wrap{width:min(1100px,94%);margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:10px 0}
    .topbar .brand a{color:#fff;text-decoration:none;font-weight:800;letter-spacing:.2px}
    .topbar .nav a{color:#fff;text-decoration:none;margin:0 8px;padding:8px 10px;border-radius:10px;border:1px solid transparent}
    .topbar .nav a:hover{background:rgba(255,255,255,.10)}
    .topbar .nav a[aria-current="page"]{border-color:rgba(255,255,255,.20);background:rgba(255,255,255,.10)}
    @media (max-width:720px){
      .topbar .nav a{margin:0 4px;padding:8px}
      .topbar .brand a{font-size:15px}
    }
  </style>`;

  function putNav() {
    // If a hard-coded topbar exists, replace it so you never get duplicates.
    const existing = document.querySelector('nav.topbar');
    if (existing) {
      existing.outerHTML = TPL;
      return;
    }

    // Prefer a mount point if present…
    const mount = document.getElementById('navMount');
    if (mount) {
      mount.innerHTML = TPL;
    } else {
      // …otherwise inject at the top of <body> (failsafe).
      const frag = document.createElement('div');
      frag.innerHTML = TPL;
      document.body.insertBefore(frag.firstElementChild, document.body.firstChild);
      document.body.insertBefore(frag.lastElementChild, document.body.firstChild.nextSibling);
    }
  }

  function markActive() {
    const here = location.pathname.replace(/\/+$/, '') || '/';
    const links = document.querySelectorAll('.topbar .nav a');
    links.forEach(a => {
      const u = new URL(a.getAttribute('href'), location.origin);
      const path = u.pathname.replace(/\/+$/, '');
      const isHome = (here === '/' || here.endsWith('/index.html')) && (path === '/index.html' || path === '/');
      const samePath = path === here || (path === '/index.html' && here === '/');
      if (isHome || samePath) {
        a.setAttribute('aria-current', 'page');
      }
      // Special case: Reports link should highlight on /report.html regardless of query string
      if (path === '/report.html' && here === '/report.html') {
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  function boot() {
    putNav();
    markActive();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
