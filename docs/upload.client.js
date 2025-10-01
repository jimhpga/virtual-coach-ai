(function () {
  'use strict';

  const fileInput = document.getElementById('fileInput');
  const fileLabel = document.getElementById('fileLabel');
  const uploadBtn = document.getElementById('uploadBtn');
  const logEl     = document.getElementById('log');

  function log(msg) {
    logEl.textContent += '\n' + String(msg);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function setBusy(b) {
    uploadBtn.disabled = !!b;
    fileInput.disabled = !!b;
  }

  window.addEventListener('error', (e) => {
    log('JS error: ' + (e.message || e.error));
  });

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      const type = f.type || 'unknown';
      const size = f.size != null ? f.size : '?';
      fileLabel.textContent = f.name + ' (' + type + ' ' + size + ' bytes)';
      log('Selected: ' + f.name + ' type=' + type + ' size=' + size);
    } else {
      fileLabel.textContent = '(no file)';
    }
  });

  uploadBtn.addEventListener('click', async () => {
    const file = (fileInput.files && fileInput.files[0]) || null;
    if (!file) { log('No file selected'); return; }

    setBusy(true);
    try {
      log('Step 1: asking backend for presigned POST…');
      const pres = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, type: file.type })
      });

      if (!pres.ok) {
        const txt = await pres.text().catch(() => '');
        throw new Error('/api/presign ' + pres.status + ' ' + pres.statusText + ' ' + txt);
      }
      const data = await pres.json();
      const url   = data && data.url;
      const fields= data && data.fields;
      const key   = data && data.key;
      if (!url || !fields || !key) throw new Error('presign missing url/fields/key');
      log('Presign OK: posting to S3…');

      const form = new FormData();
      Object.keys(fields).forEach((k) => form.append(k, fields[k]));
      form.append('Content-Type', file.type || 'video/mp4');
      form.append('file', file);

      const up = await fetch(url, { method: 'POST', body: form });
      if (!(up.ok || up.status === 201 || up.status === 204)) {
        const txt = await up.text().catch(() => '');
        throw new Error('S3 upload failed ' + up.status + ' ' + up.statusText + ' ' + txt);
      }
      log('Upload complete ✔');

      log('Step 3: enqueue analysis / make report…');
      const mk = await fetch('/api/make-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3_key: key, name: file.name, type: file.type, size: file.size })
      });

      if (!mk.ok) {
        const txt = await mk.text().catch(() => '');
        throw new Error('/api/make-report ' + mk.status + ' ' + mk.statusText + ' ' + txt);
      }
      const r = await mk.json();
      log('Report response: ' + JSON.stringify(r));

      const viewerUrl = (r && r.viewerUrl) || '/report?report=/docs/report.json';
      log('Opening viewer: ' + viewerUrl);
      setTimeout(() => { location.href = viewerUrl; }, 600);
    } catch (err) {
      log('Error: ' + err.message);
      console.error(err);
      setBusy(false);
    }
  });
})();
