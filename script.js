function uploadSwing() {
    const fileInput = document.getElementById('swingUpload');
    if (fileInput.files.length === 0) {
        alert("Please select a file first.");
        return;
    }
    alert("Swing uploaded successfully!");
}