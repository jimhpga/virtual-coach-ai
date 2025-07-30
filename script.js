
function uploadSwing() {
    const input = document.getElementById('swingUpload');
    if (!input.files.length) {
        alert("Please select a video file first.");
        return;
    }
    alert("File selected: " + input.files[0].name + "\n(This would be sent to server in production.)");
}
