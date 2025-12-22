// script.js â€” S3 presign + direct upload + preview + redirect

function setStatus(text, isError = false) {
  const box = document.getElementById('status');
  if (!box) return;
  box.textContent = text;
  box.style.color = isError ? '#ffd7d7' : '#bfffc7';
}

function guessContentType(file) {
  if (file.type) return file.type;
  const n = (file.name || '').toLowerCase();
  if (n.endsWith('.mp4')) return 'video/mp4';
  if (n.endsWith('.mov')) return 'video/quicktime';
  return 'application/octet-stream';
}

export async function uploadVideo() {
  const fileInput = document.getElementById('fileInput');
  const preview = document.getElementById('preview');
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;

  if (!file) {
    setStatus('Please select a video file.', true);
    return;
  }

  // live preview
  if (preview) {
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = 'block';
  }

  // 1) ask backend for a presigned POST
  const contentType = guessContentType(file);
  setStatus(`Requesting upload linkâ€¦ (${contentType})`);

  let presign;
  try {
    const res = await fetch('/api/s3-presign', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ filename: file.name, contentType })
    });
    if (!res.ok) {
      const t = await res.text().catch(()=>'');
      setStatus(`Failed to get upload URL (${res.status}). ${t}`, true);
      return;
    }
    presign = await res.json();
  } catch (e) {
    setStatus(`Network error contacting /api/s3-presign: ${e.message}`, true);
    return;
  }

  const { url, fields, publicUrl } = presign || {};
  if (!url || !fields || !publicUrl) {
    setStatus('Bad presign response from server.', true);
    return;
  }

  // 2) upload the big file directly to S3
  setStatus('Uploading to cloudâ€¦');
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  formData.append('file', file);

  let s3Res, s3Text = '';
  try {
    s3Res = await fetch(url, { method: 'POST', body: formData });
    // S3 returns 204 with empty body on success; read text to show XML on error
    s3Text = await s3Res.text().catch(()=> '');
  } catch (e) {
    setStatus(`Network error posting to S3: ${e.message}`, true);
    return;
  }

  if (!s3Res.ok) {
    // Show precise S3 error (e.g., AccessDenied / SignatureDoesNotMatch)
    setStatus(`S3 upload failed: ${s3Res.status} ${s3Res.statusText}\n---\n${s3Text}`, true);
    return;
  }

  // 3) hand off to report page
  try { sessionStorage.setItem('uploadedVideoUrl', publicUrl); } catch {}
  setStatus('Upload complete. Redirectingâ€¦');
  window.location.href = 'report.html';
}

// Optional: auto-wire if your upload.html uses a button with id="uploadBtn"
(function attach() {
  const btn = document.getElementById('uploadBtn');
  if (btn && !btn.dataset._bound) {
    btn.addEventListener('click', uploadVideo);
    btn.dataset._bound = '1';
  }
})();
