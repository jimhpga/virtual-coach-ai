<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Virtual Coach AI — Upload</title>
<link rel="stylesheet" href="site.css">
<style>
  .log {white-space:pre-wrap;border:1px solid #ccc;padding:10px;border-radius:8px;background:#111;color:#0f0;margin-top:10px}
</style>
</head>
<body>
<h1>Upload → Report → Improve</h1>

<input id="fileInput" type="file" accept="video/*,.mov,.mp4,.m4v" />
<button id="uploadBtn">Upload & Generate Report</button>

<div id="log" class="log">Ready.</div>

<script>
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const logEl = document.getElementById('log');
const log = m => logEl.textContent += '\n' + m;

window.addEventListener('error',e=>log('JS error: '+(e.message||e.error)));

fileInput.addEventListener('change', e=>{
  const f = e.target.files[0];
  if (f) log(`Selected: ${f.name} (${f.type}) size=${f.size}`);
});

uploadBtn.addEventListener('click', async ()=>{
  const file = fileInput.files[0];
  if (!file) {
    log('No file selected');
    return;
  }
  log('Requesting upload URL…');

  try {
    // Step 1: ask backend for upload URL
    const r = await fetch('/api/upload-url', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:file.name, type:file.type})
    });
    const {url} = await r.json();
    log('Got URL: '+url);

    // Step 2: upload file to Blob storage
    const up = await fetch(url, {method:'PUT', body:file});
    if (!up.ok) throw new Error(`Upload failed ${up.status}`);
    log('Upload complete');

    // Step 3: hit your create-report endpoint if you want
    const report = await fetch('/api/create-report',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fileName:file.name})
    });
    const reportRes = await report.json();
    log('Report queued: '+JSON.stringify(reportRes));

  } catch(err){
    log('Error: '+err.message);
    console.error(err);
  }
});
</script>
</body>
</html>
