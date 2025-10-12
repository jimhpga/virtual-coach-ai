<!-- served as /upload.client.js -->
<script>
(() => {
  const logEl   = document.getElementById('log') || (() => {
    const pre = document.createElement('pre');
    pre.id = 'log';
    pre.style.cssText = 'background:#0b1210;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px;overflow:auto;min-height:120px;';
    document.querySelector('.upload-card')?.appendChild(pre);
    return pre;
  })();

  const ui = {
    file:   document.getElementById('file'),
    btn:    document.getElementById('go') || document.querySelector('[data-action="upload"]'),
    name:   document.getElementById('name'),
    email:  document.getElementById('email'),
    hcap:   document.getElementById('handicap'),
    hand:   document.getElementById('hand'),
    eye:    document.getElementById('eye'),
    height: document.getElementById('height'),
  };

  const log = (s='') => { logEl.textContent += (s + '\n'); logEl.scrollTop = logEl.scrollHeight; };

  // ---- height parsing (accepts 70, "5'10", 5-10, 178cm) -> inches
  function parseHeightToInches(v) {
    if (!v) return null;
    v = String(v).trim().toLowerCase();

    // 178 cm
    const cm = v.match(/^(\d+(?:\.\d+)?)\s*cm$/);
    if (cm) return Math.round(parseFloat(cm[1]) / 2.54);

    // 5' 10" or 5-10 or 5 10
    const ftin = v.match(/^(\d+)\s*(?:'|ft|\-|\s)\s*(\d{1,2})”??"?$/);
    if (ftin) return (+ftin[1]) * 12 + (+ftin[2]);

    // simple inches number
    const num = v.match(/^\d+(?:\.\d+)?$/);
    if (num) return Math.round(parseFloat(v));

    return null;
  }

  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function s3Upload(presign, file) {
    const fd = new FormData();
    Object.entries(presign.fields).forEach(([k, val]) => fd.append(k, val));
    fd.append('file', file);
    const r = await fetch(presign.url, { method: 'POST', body: fd });
    if (!(r.status === 204 || r.status === 201)) {
      const t = await r.text().catch(()=>'');
      throw new Error(`S3 upload failed (${r.status}): ${t}`);
    }
  }

  async function onUpload() {
    try {
      log('[upload v12] client JS loaded');

      const file = ui.file?.files?.[0];
      if (!file) { log('Error: please choose a video.'); return; }

      const inches = parseHeightToInches(ui.height?.value);
      if (!inches || inches < 48 || inches > 84) {
        log('Error: Height should be between 48 and 84 inches.'); return;
      }

      log(`Selected: ${file.name}`);
      log('Requesting presign…');

      // ask our API for presigned POST
      const presign = await postJSON('/api/presign', {
        filename: file.name,
        type: file.type || 'video/mp4',
        size: file.size,
        // pass through the optional form fields (useful for the report):
        name: (ui.name?.value || '').trim(),
        email: (ui.email?.value || '').trim(),
        handicap: (ui.hcap?.value || '').trim(),
        hand: (ui.hand?.value || '').trim(),
        eye: (ui.eye?.value || '').trim(),
        height: String(inches)
      });

      if (!presign?.ok) throw new Error(presign?.error || 'presign failed');

      log('Uploading to S3…');
      await s3Upload(presign, file);

      // IMPORTANT: always open the report on *this* deployment’s origin
      const viewer = new URL('/report.html', window.location.origin);
      viewer.search = new URLSearchParams({
        key: presign.key,
        name: (ui.name?.value || '').trim(),
        email: (ui.email?.value || '').trim(),
        handicap: (ui.hcap?.value || '').trim(),
        hand: (ui.hand?.value || '').trim(),
        eye: (ui.eye?.value || '').trim(),
        height: String(inches)
      }).toString();

      log('Opening report…');
      window.location.href = viewer.toString();
    } catch (err) {
      console.error(err);
      log(`Error: ${err?.message || err}`);
      alert('Upload failed. Please try again.');
    }
  }

  // wire up
  if (ui.btn) ui.btn.addEventListener('click', onUpload);
  if (ui.file) ui.file.addEventListener('change', e => {
    const f = e.currentTarget.files?.[0];
    if (f) log(`Selected: ${f.name}`);
  });
})();
</script>
