<!-- /nav.js -->
<script>
(function(){
  async function mountNav(){
    try{
      const mount = document.getElementById('navMount');
      if(!mount) return;
      // cache-bust to ensure latest nav loads
      const res = await fetch('/nav.html?v=12', { cache: 'no-store' });
      if(!res.ok) throw new Error('nav.html HTTP '+res.status);
      const html = await res.text();
      mount.innerHTML = html;

      // Mark current link (compare PATH only, ignore query)
      const herePath = location.pathname.replace(/\/+$/,'');
      const links = mount.querySelectorAll('a[data-nav]');
      links.forEach(a=>{
        const u = new URL(a.getAttribute('href'), location.origin);
        if (u.pathname.replace(/\/+$/,'') === herePath){
          a.setAttribute('aria-current','page');
        }
      });

      // Mobile toggle
      const btn   = mount.querySelector('#navToggle');
      const panel = mount.querySelector('#navLinks');
      if(btn && panel){
        const close = () => { panel.classList.remove('open'); btn.setAttribute('aria-expanded','false'); };
        btn.addEventListener('click', ()=>{
          const isOpen = panel.classList.toggle('open');
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        // Close after clicking a link (mobile)
        panel.querySelectorAll('a').forEach(a=>{
          a.addEventListener('click', close);
        });
        // Close on Escape
        window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
      }
    }catch(e){
      console.error('Nav load failed:', e);
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mountNav);
  }else{
    mountNav();
  }
})();
</script>
