// script.js - Handles video upload for upload-html

function uploadVideo() {
  const fileInput = document.getElementById('fileInput');
  const status = document.getElementById('status');
  const preview = document.getElementById('preview');

  const file = fileInput.files[0];

  if (!file) {
    status.textContent = 'Please select a video file.';
    return;
  }

  // Show video preview
  const reader = new FileReader();
  reader.onload = function (e) {
    preview.src = e.target.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);

  // Start upload process
  status.textContent = 'Uploading...';

  const formData = new FormData();
  formData.append('video', file);

  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Upload failed.');
      }
      return response.json();
    })
    .then(data => {
      status.textContent = 'Upload successful!';
      // If you want to redirect or update the page, do it here
    })
    .catch(error => {
      console.error('Upload error:', error);
      status.textContent = 'Upload failed. Please try again.';
    });
}
