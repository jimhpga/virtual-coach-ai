async function uploadSwing() {
  const input = document.getElementById('swingUpload');
  const file = input.files[0];
  if (!file) return alert('Please select a swing file to upload.');

  // Create a temporary video element to read duration
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.src = url;

  v.onloadedmetadata = () => {
    URL.revokeObjectURL(url);
    const seconds = v.duration || 0;

    if (seconds > 10) {
      alert('Clip is too long. Please upload a clip that is 10 seconds or less.');
      input.value = ''; // reset file picker
      return;
    }

    // Pass: under 10s — continue
    alert('Swing uploaded successfully!');
    // TODO: call your real upload/process endpoints here when ready
    // e.g., fetch('/api/upload', { method: 'POST', body: fd }) ...
  };

  v.onerror = () => {
    URL.revokeObjectURL(url);
    alert('Could not read this video file. Please try a different clip.');
    input.value = '';
  };
}
