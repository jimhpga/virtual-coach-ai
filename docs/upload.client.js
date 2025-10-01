// docs/upload.client.js
(function () {
  const fileInput  = document.getElementById('fileInput');
  const fileLabel  = document.getElementById('fileLabel');
  const uploadBtn  = document.getElementById('uploadBtn');
  const logEl      = document.getElementById('log');

  function log(msg) {
    // use \n only; avoid any weird escapes
    logEl.textContent = (logEl.textContent || ''); 
    logEl.textContent += '\n' + msg;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setBusy(b) {
    uploadBtn.disabled = !!b;
    fileInput.disabled = !!b;
  }

  // If any script error happens, surface it in the log panel
  window.addEventListener('error', (e) => {
    const m = e && (e.message || e.error) ? (e.message || String(e.error)) : 'Unknown JS error';
    log('JS error: ' + m);
  });

  if (!fileInput || !uploadBtn || !fileLabel || !logEl) {
    console.warn('Upload page elements not found');
    return;
  }

  log('Client loaded.');

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    fileLabel.textContent = f ? `${f.name} (${f.type || 'unknown'} ${f.size} bytes)` : '(no file)';
    if (f) log(`Selected: ${f.name} type=${f.type} size=${f.size}`);
  });

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) { log('No file selected'); return; }

    setBusy(true);
    try {
      log('Step 1: requesting presign…');
      const pres = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, type: file.type })
      });

      if (!pres.ok) {
        const txt = await pres.text().catch(() => '');
        throw new Error(`/api/presign ${pres.status} ${pres.statusText} ${txt}`);
      }

      const { url, fields, key } = await pres.json();
      if (!url || !fields || !key) throw new Error('presign missing url/fields/key');
      log('Presign OK. Uploading to S3…');

      // S3 presigned POST
      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, v));
      form.append('Content-Type', file.type || 'video/mp4');
      form.append('file', file);

      const up = await fetch(url, { method: 'POST', body: form });
      if (!(up.status === 201 || up.status === 204 || up.ok)) {
        const txt = await up.text().catch(() => '');
        throw new Error(`S3 upload failed ${up.status} ${up.statusText} ${txt}`);
      }
      log('Upload complete');

      log('Step 3: enqueue analysis / make report…');
      const mk = await fetch('/api/make-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3_key: key, name: file.name, type: file.type, size: file.size })
      });

      if (!mk.ok) {
        const txt = await mk.text().catch(() => '');
        throw new Error(`/api/make-report ${mk.status} ${mk.statusText} ${txt}`);
      }

      const r = await mk.json();
      log('Report response: ' + JSON.stringify(r));

      const viewerUrl = r.viewerUrl || '/report?report=/docs/report.json';
      log('Opening viewer: ' + viewerUrl);
      setTimeout(() => { location.href = viewerUrl; }, 600);

    } catch (err) {
      log('Error: ' + (err && err.message ? err.message : String(err)));
      console.error(err);
      setBusy(false);
    }
  });
})();
