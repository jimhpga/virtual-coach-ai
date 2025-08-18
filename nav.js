// /nav.js
(function(){
  async function mountNav(){
    try{
      const mount = document.getElementById('navMount');
      if(!mount) return;
      const res = await fetch('/nav.html?v=7', { cache: 'no-store' });
      if(!res.ok) throw new Error('nav.html HTTP '+res.status);
      mount.innerHTML = await res.text();

      // Highlight current page
      const herePath = (location.pathname === '/' ? '/index.html' : location.pathname).replace(/\/+$/,'');
      mount.querySelectorAll('a[data-nav]').forEach(a=>{
        const url = new URL(a.getAttribute('href'), location.origin);
        const p = (url.pathname === '/' ? '/index.html' : url.pathname).replace(/\/+$/,'');
        if(p === herePath) a.setAttribute('aria-current','page');
      });
    }catch(e){
      console.error('Nav load failed:', e);
    }
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', mountNav); } else { mountNav(); }
})();
