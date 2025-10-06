// /public/upload.client.js
(function () {
  const $ = (s) => document.querySelector(s);
  const input = $('#fileInput');
  const label = $('#fileLabel');
  const btn = $('#uploadBtn');
  const logBox = $('#log');

  function log(msg) {
    logBox.textContent += (logBox.textContent ? '\n' : '') + msg;
    logBox.scrollTop = logBox.scrollHeight;
  }

  input.addEventListener('change', () => {
    const f = input.files && input.files[0];
    label.textContent = f ? `${f.name} • ${f.size.toLocaleString()} bytes` : '(no file)';
  });

  btn.addEventListener('click', async () => {
    try {
      const file = input.files && input.files[0];
      if (!file) { alert('Choose a video first'); return; }

      log('[upload] client JS loaded');
      log(`Selected: ${file.name} (${file.type || 'video/*'}), ${file.size.toLocaleString()} bytes`);

      // 1) presign
      log('Calling /api/presign…');
      const meta = { filename: file.name, size: file.size, mime: file.type || 'video/mp4' };

      const pres = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(meta),
      });

      if (!pres.ok) {
        const t = await pres.text().catch(() => '');
        throw new Error(`presign failed (${pres.status}): ${t || pres.statusText}`);
      }

      const { uploadUrl, videoKey, reportUrl } = await pres.json();
      if (!uploadUrl) throw new Error('No uploadUrl from presign');

      // 2) upload to S3
      log('Uploading to S3…');
      const up = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': meta.mime },
        body: file,
      });
      if (!up.ok) {
        const t = await up.text().catch(() => '');
        throw new Error(`S3 upload failed (${up.status}): ${t || up.statusText}`);
      }
      log('Upload complete.');

      // 3) show report
      if (reportUrl) {
        log(`Opening report: ${reportUrl}`);
        location.href = reportUrl; // e.g. /report?id=vcai_...
      } else {
        log('No reportUrl returned. Copy your video key: ' + videoKey);
        alert('Upload finished, but no reportUrl was returned.');
      }
    } catch (err) {
      console.error(err);
      log('Error: ' + (err && err.message ? err.message : String(err)));
      if (/404|NOT_FOUND/i.test(String(err))) {
        log('If this says 404/NOT_FOUND: ensure /api/presign exists and is deployed.');
      }
    }
  });

  // initial
  log('Ready.');
})();
