<!-- /nav.js -->
<script>
(() => {
  async function mount() {
    try {
      const m = document.getElementById('navMount');
      if (!m) return;
      const res = await fetch('/nav.html?v=9', { cache: 'no-store' });
      if (!res.ok) throw new Error('nav.html HTTP ' + res.status);
      m.innerHTML = await res.text();

      // mark current page
      const here = location.pathname.replace(/\/+$/,'');
      m.querySelectorAll('a[data-nav]').forEach(a => {
        const p = new URL(a.getAttribute('href'), location.origin)
                    .pathname.replace(/\/+$/,'');
        if (p === here) a.setAttribute('aria-current','page');
      });
    } catch(e){ console.error('Nav load failed:', e); }
  }
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();
</script>
