// ===== script.js =====
document.getElementById('uploadButton').addEventListener('click', async () => {
  const fileInput = document.getElementById('fileInput');
  const status = document.getElementById('status');

  if (!fileInput.files.length) {
    status.textContent = 'Please select a video file first.';
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('video', file);

  status.textContent = 'Uploading...';

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed.');

    const result = await response.json();
    status.textContent = `Upload successful: ${result.message}`;
  } catch (error) {
    status.textContent = 'Upload failed. Please try again.';
    console.error(error);
  }
});

// Optional: Show video preview
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', () => {
  const preview = document.getElementById('preview');
  preview.innerHTML = '';

  const file = fileInput.files[0];
  if (file) {
    const video = document.createElement('video');
    video.controls = true;
    video.src = URL.createObjectURL(file);
    preview.appendChild(video);
  }
});
