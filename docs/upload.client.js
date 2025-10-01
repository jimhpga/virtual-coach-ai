(function () {
  const fileInput = document.getElementById("fileInput");
  const fileLabel = document.getElementById("fileLabel");
  const uploadBtn = document.getElementById("uploadBtn");
  const logEl = document.getElementById("log");

  function log(m) {
    logEl.textContent += "\n" + m;
    logEl.scrollTop = logEl.scrollHeight;
  }
  function busy(b) {
    uploadBtn.disabled = !!b;
    fileInput.disabled = !!b;
  }

  fileInput.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    fileLabel.textContent = f
      ? `${f.name} (${f.type || "video"}, ${f.size} bytes)`
      : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  uploadBtn.addEventListener("click", async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) {
      log("No file selected");
      return;
    }

    busy(true);
    try {
      log("Step 1: presign...");
      const pres = await fetch("/api/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.name, type: f.type }),
      });

      if (!pres.ok) throw new Error("presign " + pres.status + " " + pres.statusText);
      const { url, fields, key } = await pres.json();
      if (!url || !fields || !key) throw new Error("presign response missing fields");

      log("Step 2: uploading to S3...");
      const form = new FormData();
      Object.keys(fields).forEach((k) => form.append(k, fields[k]));
      form.append("Content-Type", f.type || "video/mp4");
      form.append("file", f);

      const up = await fetch(url, { method: "POST", body: form });
      if (!(up.ok || up.status === 201 || up.status === 204)) {
        const txt = await up.text().catch(() => "");
        throw new Error("S3 upload failed " + up.status + " " + up.statusText + " " + txt);
      }

      log("Step 3: make-report...");
      const mk = await fetch("/api/make-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, s3_key: key, name: f.name, type: f.type, size: f.size }),
      });
      if (!mk.ok) throw new Error("make-report " + mk.status + " " + mk.statusText);
      const r = await mk.json();

      const viewer = (r && r.viewerUrl) || "/report?report=/docs/report.json";
      log("Opening viewer: " + viewer);
      setTimeout(() => (location.href = viewer), 800);
    } catch (e) {
      log("Error: " + (e?.message || String(e)));
      busy(false);
    }
  });
})();
