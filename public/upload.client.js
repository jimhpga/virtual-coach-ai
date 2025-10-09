// public/upload.client.js
(function () {
  const $ = (s) => document.querySelector(s);
  const fileInput = $("#fileInput");
  const fileLabel = $("#fileLabel");
  const btn = $("#uploadBtn");
  const logEl = $("#log");

  const log  = (m) => { logEl.textContent += (logEl.textContent ? "\n" : "") + m; logEl.scrollTop = logEl.scrollHeight; };
  const busy = (on) => { btn.disabled = on; fileInput.disabled = on; };

  log("[upload v9] client JS loaded");

  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    fileLabel.textContent = f ? `${f.name}` : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  btn?.addEventListener("click", async () => {
    const file = fileInput?.files?.[0];
    if (!file) { log("Pick a video first."); return; }

    busy(true);
    try {
      log("Requesting presign…");
      const pre = await fetch("/api/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, type: file.type || "video/mp4", size: file.size }),
      });
      if (!pre.ok) throw new Error("presign failed " + pre.status);
      const { url, fields, key } = await pre.json();
      if (!url || !fields || !key) throw new Error("presign response malformed");

      log("Uploading to S3…");
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      fd.append("file", file, file.name);
      const up = await fetch(url, { method: "POST", body: fd });
      if (!up.ok) throw new Error("S3 upload failed " + up.status);

      log("Upload complete.");
      const reportUrl = `/report.html?key=${encodeURIComponent(key)}`;
      log("Opening report view…");
      location.assign(reportUrl);
    } catch (e) {
      log("Error: " + (e?.message || e));
      busy(false);
    }
  });
})();
