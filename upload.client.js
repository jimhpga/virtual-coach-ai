/* Upload client v11 — flexible height parsing + presign → S3 upload */
(() => {
  const ui = {
    name: document.getElementById('name'),
    email: document.getElementById('email'),
    hcp: document.getElementById('hcp'),
    hand: document.getElementById('hand'),
    eye: document.getElementById('eye'),
    heightIn: document.getElementById('heightIn'),
    file: document.getElementById('file'),
    fileName: document.getElementById('fileName'),
    go: document.getElementById('go'),
    log: document.getElementById('log'),
  };

  function log(line = '') {
    if (!ui.log) return;
    ui.log.textContent += (ui.log.textContent ? '\n' : '') + line;
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  console.log('[upload v11] client JS loaded');
  log('Ready.\n[upload v11] client JS loaded');

  // -------- Height parser (inches, feet+inches, or cm) --------
  function parseHeightToInches(inputRaw) {
    if (!inputRaw) return null;
    const s = String(inputRaw).trim().toLowerCase();

    // e.g. "170 cm"
    const cmMatch = s.match(/^(\d+(?:\.\d+)?)\s*cm$/i);
    if (cmMatch) return Math.round(parseFloat(cmMatch[1]) / 2.54);

    // e.g. 5'6", 5' 6, 5-6
    let m = s.match(/^(\d+)\s*['\-]\s*(\d+)\s*("?|in|inches)?$/);
    if (m) return (+m[1]) * 12 + (+m[2]);

    // e.g. 5', 6ft, 6 ft
    m = s.match(/^(\d+)\s*(?:'|ft|feet)$/);
    if (m) return (+m[1]) * 12;

    // e.g. 5.6  (~5'7")
    m = s.match(/^(\d+)\.(\d+)$/);
    if (m) {
      const feet = +m[1];
      const dec = parseFloat(`0.${m[2]}`);
      return Math.round(feet * 12 + dec * 12);
    }

    // bare number: <=84 → inches; >100 → assume cm
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = parseFloat(s);
      if (n > 100) return Math.round(n / 2.54);
      return Math.round(n);
    }

    return null;
  }

  // ---- UI helpers ----
  ui.file.addEventListener('change', () => {
    const f = ui.file.files?.[0];
    ui.fileName.textContent = f ? f.name : '(no file)';
    if (f) log(`Selected: ${f.name}`);
  });

  ui.go.addEventListener('click', async () => {
    try {
      ui.go.disabled = true;
      ui.go.textContent = 'Uploading…';

      const f = ui.file.files?.[0];
      if (!f) {
        log('Error: please choose a video file.');
        return;
      }

      // Height parse + bounds
      const rawHeight = ui.heightIn.value;
      const height = parseHeightToInches(rawHeight);
      if (!height || height < 48 || height > 84) {
        log('Error: Height should be between 48 and 84 inches.');
        return;
      }

      // 1) Presign
      log('Requesting presign…');
      const payload = {
        filename: f.name,
        type: f.type || 'video/mp4',
        size: f.size,
        meta: {
          name: ui.name.value || '',
          email: ui.email.value || '',
          handicap: ui.hcp.value || '',
          hand: ui.hand.value || '',
          eye: ui.eye.value || '',
          heightInches: height,
        }
      };

      const presignRes = await fetch('/api/presign', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });

      if (!presignRes.ok) {
        const txt = await presignRes.text().catch(()=>'');
        throw new Error(`/api/presign failed (${presignRes.status}) ${txt}`);
      }
      const presign = await presignRes.json();
      if (!presign?.ok || !presign.url || !presign.fields) {
        throw new Error('Invalid /api/presign response.');
      }

      // 2) Upload to S3
      log('Uploading to S3…');
      const fd = new FormData();
      // copy all fields returned by presign
      Object.entries(presign.fields).forEach(([k,v]) => fd.append(k, v));
      // important: the file part MUST be named exactly "file"
      fd.append('file', f);

      const s3 = await fetch(presign.url, { method: 'POST', body: fd });
      if (!(s3.status === 201 || s3.status === 204)) {
        const errTxt = await s3.text().catch(()=> '');
        throw new Error(`S3 upload failed (${s3.status}). ${errTxt}`);
      }

      log('Upload OK.');
      const viewer = presign.viewerUrl || `/report.html?key=${encodeURIComponent(presign.key)}`;
      log(`Opening report…`);
      window.location.href = viewer;
    } catch (err) {
      console.error(err);
      if (/CORS/i.test(String(err))) {
        log('Error: CORS issue. Ensure your S3 bucket CORS allows this site origin.');
      } else {
        log(`Error: ${err.message || err}`);
      }
    } finally {
      ui.go.disabled = false;
      ui.go.textContent = 'Upload & Generate Report';
    }
  });
})();
