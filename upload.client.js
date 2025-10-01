// /upload.client.js  (place at the repo root)
(() => {
  const fileInput = document.getElementById('fileInput');
  const fileLabel = document.getElementById('fileLabel');
  const uploadBtn = document.getElementById('uploadBtn');
  const logEl     = document.getElementById('log');

  const log  = (m) => { logEl.textContent += '\n' + m; logEl.scrollTop = logEl.scrollHeight; };
  const busy = (b) => { uploadBtn.disabled = !!b; fileInput.disabled = !!b; };

  window.addEventListener('error', e => log('JS error: ' + (e.message || e.error)));

  fileInput.addEventListener('change', e => {
    const f = e.target.files?.[0];
    fileLabel.textContent = f ? `${f.name} (${f.type || 'video'}) ${f.size} bytes` : '(no file)';
    if (f) log(`Selected: ${f.name}`);
  });

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) { log('No file selected'); return; }

    busy(true);
    try {
      log('Step 1: presign…');
      const pres = await fetch('/api/presign', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ filename: file.name, type: file.type })
      });
      if (!pres.ok) throw new Error(`/api/presign ${pres.status}`);
      const { url, fields, key } = await pres.json();
      if (!url || !fields || !key) throw new Error('Missing presign response');

      log('Step 2: upload to S3…');
      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, v));
      form.append('Content-Type', file.type || 'video/mp4');
      form.append('file', file);

      const up = await fetch(url, { method: 'POST', body: form });
      if (!(up.status === 201 || up.status === 204 || up.ok)) {
        const txt = await up.text().catch(()=> '');
        throw new Error(`S3 upload failed ${up.status} ${txt}`);
      }
      log('Upload complete ✔');

      log('Step 3: make report…');
      const mk = await fetch('/api/make-report', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ s3_key: key, name: file.name, type: file.type, size: file.size })
      });
      if (!mk.ok) throw new Error(`/api/make-report ${mk.status}`);
      const r = await mk.json();

      const viewerUrl = r.viewerUrl || '/report?report=/docs/reports/sample.viewer.json';
      log('Opening viewer: ' + viewerUrl);
      setTimeout(() => { location.href = viewerUrl; }, 600);
    } catch (err) {
      console.error(err);
      log('Error: ' + (err && err.message || err));
      busy(false);
    }
  });
})();
