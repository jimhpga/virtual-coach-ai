// public/upload.client.js
(function () {
  const $ = (s) => document.querySelector(s);
  const log = (m) => { const el = $("#log"); el.textContent += (el.textContent ? "\n" : "") + m; };

  $("#fileInput").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    $("#fileLabel").textContent = f ? `${f.name}` : "(no file)";
  });

  $("#uploadBtn").addEventListener("click", async () => {
    try {
      const file = $("#fileInput").files?.[0];
      if (!file) { log("Pick a video first."); return; }

      log("[upload] client JS loaded");
      log("Requesting presign…");

      // 1) presign
      const pre = await fetch("/api/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, type: file.type || "video/mp4", size: file.size }),
      });
      if (!pre.ok) throw new Error("presign failed " + pre.status);
      const { url, fields, key } = await pre.json();
      if (!url || !fields || !key) throw new Error("presign response malformed");

      log("Uploading to S3…");

      // 2) POST to S3 (presigned POST)
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      fd.append("file", file, file.name);

      const up = await fetch(url, { method: "POST", body: fd });
      if (!up.ok) throw new Error("S3 upload failed " + up.status);

      log("Upload complete.");

      // 3) Go to report viewer with the key we just wrote
      const reportUrl = `/report.html?key=${encodeURIComponent(key)}`;
      log("Opening report view…"); 
      location.assign(reportUrl);
    } catch (e) {
      log("Error: " + (e?.message || e));
    }
  });

  log("Ready.");
})();
