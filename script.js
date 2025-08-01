// After a valid (≤10s) clip is chosen, go to report.html?id=...

async function uploadSwing() {
  const input = document.getElementById('swingUpload');
  const file = input.files[0];
  if (!file) { alert('Please select a swing file.'); return; }

  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.src = url;

  v.onloadedmetadata = () => {
    const finish = () => {
      URL.revokeObjectURL(url);

      let seconds = v.duration;
      if (!seconds || !isFinite(seconds)) {
        alert('Could not detect video length. Try a different clip.');
        input.value = '';
        return;
      }
      if (seconds > 10) {
        alert('Clip is too long. Please upload a clip ≤ 10 seconds.');
        input.value = '';
        return;
      }

      // SUCCESS → generate a simple ID and redirect to report page
      const id = Date.now().toString(); // placeholder ID for demo
      window.location.href = `report.html?id=${encodeURIComponent(id)}`;
    };

    // iOS quirk fix: duration may be Infinity until we seek
    if (!isFinite(v.duration) || v.duration === Infinity) {
      v.currentTime = Number.MAX_SAFE_INTEGER;
      v.ontimeupdate = () => { v.ontimeupdate = null; finish(); };
    } else {
      finish();
    }
  };

  v.onerror = () => {
    URL.revokeObjectURL(url);
    alert('Could not read this video file. Please try a different clip.');
    input.value = '';
  };
}


