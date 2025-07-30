function uploadSwing() {
    const fileInput = document.getElementById('swingUpload');
    if (fileInput.files.length > 0) {
        alert('Swing uploaded successfully!');
    } else {
        alert('Please select a swing file to upload.');
    }
}
