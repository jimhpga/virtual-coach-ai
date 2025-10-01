(() => {
  const logEl = document.getElementById('log');
  const fileInput = document.getElementById('fileInput');
  const fileLabel = document.getElementById('fileLabel');
  const uploadBtn = document.getElementById('uploadBtn');

  const log = (m) => { if (logEl) { logEl.textContent += '\n' + m; logEl.scrollTop = logEl.scrollHeight; } };
  const busy = (b) => { if (uploadBtn && fileInput) { uploadBtn.disabled = !!b; fileInput.disabled = !!b; } };

  window.addEventListener('error', e => log('JS error: ' + (e.message || e.error)));

  if (!fileInput || !uploadBtn) { console.warn('Upload elements not found'); return; }

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (fileLabel) fileLabel.textContent = f ? `${f.name} (${f.type || 'unknown'} ${f.size} bytes)` : '(no file)';
    if (f) log(`Selected: ${f.name} type=${f.type} size=${f.size}`);
  });

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) { log('No file selected'); return; }

    busy(true);
    try {
      log('Step 1: requesting presign…');
      const pres = await fetch('/api/presign', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ filename:file.name, type:file.type })
      });

      if (!pres.ok) {
        const txt = await pres.text().catch(()=> '');
        throw new Error(`/api/presign ${pres.status} ${pres.statusText} ${txt}`);
      }
      const { url, fields, key } = await pres.json();
      if (!url || !fields || !key) throw new Error('presign missing url/fields/key');
      log('Presign OK: upload to S3…');

      const form = new FormData();
      Object.entries(fields).forEach(([k,v]) => form.append(k, v));
      form.append('Content-Type', file.type || 'video/mp4');
      form.append('file', file);

      const up = await fetch(url, { method:'POST', body: form });
      if (!(up.status === 201 || up.status === 204 || up.ok)) {
        const txt = await up.text().catch(()=> '');
        throw new Error(`S3 upload failed ${up.status} ${up.statusText} ${txt}`);
      }
      log('Upload complete ✔');

      log('Step 3: enqueue report…');
      const mk = await fetch('/api/make-report', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ s3_key: key, name: file.name, type: file.type, size: file.size })
      });

      if (!mk.ok) {
        const txt = await mk.text().catch(()=> '');
        throw new Error(`/api/make-report ${mk.status} ${mk.statusText} ${txt}`);
      }
      const r = await mk.json();
      const viewerUrl = r.viewerUrl || '/report?report=/docs/reports/sample.viewer.json';
      log('Opening viewer: ' + viewerUrl);
      setTimeout(() => location.href = viewerUrl, 600);
    } catch (err) {
      log('Error: ' + err.message);
      console.error(err);
      busy(false);
    }
  });

  log('upload client booted');
})();
