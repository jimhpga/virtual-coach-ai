module.exports = async (req, res) => {
  try {
    const url = String((req.query && req.query.url) || '').trim();
    if (!url) return res.status(400).send('Missing ?url');
    const esc = (s) => String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>VC • Report Viewer</title>
      <style>body{font:14px/1.4 system-ui,Segoe UI,Arial;margin:20px}
      .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      pre{background:#f6f8fa;border:1px solid #e5e7eb;border-radius:8px;padding:12px;overflow:auto}
      a.btn,button{padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;text-decoration:none;color:#111}
      </style></head><body>
      <h2>Report JSON</h2>
      <div class="row">
        <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Open raw JSON</a>
        <button onclick="navigator.clipboard.writeText('${esc(url)}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy link',1200)">Copy link</button>
      </div>
      <pre id="out">Loading…</pre>
      <script>
        (async ()=>{
          try{
            const r = await fetch(${JSON.stringify(''+url)});
            if(!r.ok) throw new Error('HTTP '+r.status);
            const j = await r.json();
            document.getElementById('out').textContent = JSON.stringify(j,null,2);
          }catch(e){
            document.getElementById('out').textContent = 'Failed to load: '+(e.message||e);
          }
        })();
      </script>
    </body></html>`;
    res.setHeader('content-type','text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).send('Viewer error: ' + String(e && e.message || e));
  }
};
