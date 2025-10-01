/* Upload → S3 (presigned POST) → make-report → redirect to viewer */
(function () {
  var $ = function (s) { return document.querySelector(s); };

  var fileInput = $('#fileInput');
  var fileLabel = $('#fileLabel');
  var uploadBtn = $('#uploadBtn');
  var logEl     = $('#log');

  function log(msg) {
    logEl.textContent += '\n' + msg;
    logEl.scrollTop = logEl.scrollHeight;
  }
  function busy(b) {
    uploadBtn.disabled = !!b;
    fileInput.disabled = !!b;
  }

  fileInput.addEventListener('change', function (e) {
    var f = fileInput.files && fileInput.files[0];
    fileLabel.textContent = f
      ? (f.name + ' (' + (f.type || 'video') + ') ' + f.size + ' bytes')
      : '(no file)';
    if (f) log('Selected: ' + f.name + '  type=' + (f.type || 'n/a') + '  size=' + f.size);
  });

  uploadBtn.addEventListener('click', async function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) { log('No file selected'); return; }

    busy(true);
    try {
      // 1) Presign
      log('1) Requesting presigned POST…');
      var pr = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, type: file.type })
      });
      if (!pr.ok) {
        var errTxt = '';
        try { errTxt = await pr.text(); } catch (_) {}
        throw new Error('presign ' + pr.status + ' ' + pr.statusText + ' ' + errTxt);
      }
      var pres = await pr.json();
      var url = pres.url;
      var fields = pres.fields || {};
      var key = pres.key || fields.key;
      if (!url || !fields || !key) throw new Error('presign missing url/fields/key');
      log('Presign OK, key: ' + key);

      // 2) Upload to S3 (POST form)
      log('2) Uploading to S3…');
      var form = new FormData();
      Object.keys(fields).forEach(function (k) { form.append(k, fields[k]); });
      form.append('Content-Type', file.type || 'video/mp4');
      form.append('file', file);

      var up = await fetch(url, { method: 'POST', body: form });
      if (!(up.status === 201 || up.status === 204 || up.ok)) {
        var upTxt = '';
        try { upTxt = await up.text(); } catch (_) {}
        throw new Error('upload ' + up.status + ' ' + up.statusText + ' ' + upTxt);
      }
      log('Upload complete ✔');

      // 3) Make report
      log('3) Creating report…');
      var mk = await fetch('/api/make-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key })   // server can derive jobId from key
      });
      if (!mk.ok) {
        var mkTxt = '';
        try { mkTxt = await mk.text(); } catch (_) {}
        throw new Error('make-report ' + mk.status + ' ' + mk.statusText + ' ' + mkTxt);
      }
      var r = await mk.json();

      // 4) Redirect to viewer
      var viewer = (r && r.viewerUrl) ? r.viewerUrl : '/report?report=/docs/report.json';
      log('Opening viewer: ' + viewer);
      setTimeout(function () { location.href = viewer; }, 600);

    } catch (err) {
      var msg = (err && err.message) ? err.message : String(err);
      log('Error: ' + msg);
      log('If you see 404/NOT_FOUND for /api routes, deploy /api/presign and /api/make-report.');
      busy(false);
    }
  });
})();
