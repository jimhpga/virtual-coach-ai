// Full replace. Handles file pick, reads duration safely, blocks >10s,
// and confirms success for <=10s. No backend required.

async function uploadSwing() {
  const input = document.getElementById('swingUpload');
  const file = input.files[0];
  if (!file) {
    alert('Please select a swing file to upload.');
    return;
  }

  // Create a temporary video element to read duration
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.src = url;

  v.onloadedmetadata = () => {
    // Sometimes iOS reports Infinity until we seek—handle that:
    const maybeFinish = () => {
      URL.revokeObjectURL(url);
      let seconds = v.duration;

      if (!isFinite(seconds) || seconds === Infinity) {
        // Fallback: try seeking to a very large time to force metadata load
        v.currentTime = Number.MAX_SAFE_INTEGER;
        v.ontimeupdate = () => {
          v.ontimeupdate = null;
          seconds = v.duration;
          finalize(seconds);
        };
      } else {
        finalize(seconds);
      }
    };

    // If metadata is ready but duration isn't stable yet, delay a tick
    setTimeout(maybeFinish, 0);
  };

  v.onerror = () => {
    URL.revokeObjectURL(url);
    alert('Could not read this video file. Please try a different clip.');
    input.value = '';
  };

  function finalize(seconds) {
    if (!seconds || isNaN(seconds)) {
      alert('Could not detect video length. Try re-recording a short clip.');
      input.value = '';
      return;
    }

    if (seconds > 10) {
      alert('Clip is too long. Please upload a clip that is 10 seconds or less.');
      input.value = ''; // reset picker
      return;
    }

    // Success path (≤ 10s). Replace this alert with real upload later.
    alert('Swing uploaded successfully!');

    // TODO (later):
    // - Send to server or Cloudinary
    // - Start processing job
    // - Poll status, then redirect to report
  }
}
