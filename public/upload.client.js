// public/upload.client.js
(function () {
  const $ = (s) => document.querySelector(s);
  const fileInput = $("#fileInput");
  const fileLabel = $("#fileLabel");
  const btn = $("#uploadBtn");
  const logEl = $("#log");

  const log = (m) => {
    if (!logEl) return;
    logEl.textContent += (logEl.textContent ? "\n" : "") + m;
    logEl.scrollTop = logEl.scrollHeight;
  };
  const busy = (on) => {
    if (btn) btn.disabled = on;
    if (fileInput) fileInput.disabled = on;
  };

  log("[upload v11] client JS loaded");

  // Show selected file name
  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (fileLabel) fileLabel.textContent = f ? f.name : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  // Core flow
  async function presignPut(filename) {
    // Your backend returns { ok, url, key }
    const r = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename })
    });
    if (!r.ok) throw new Error(`Presign failed: ${r.status}`);
    const j = await r.json();
    if (!j?.ok || !j?.url || !j?.key) throw new Error("Bad presign payload");
    // Sanity: checksum params should NOT be present
    if (/\bx-amz-checksum-/i.test(j.url)) {
      throw new Error("Presign contains checksum params; server must remove Checksum* when signing");
    }
    return j;
  }

  async function putToS3(url, file) {
    // Minimal headers. Do NOT add Authorization or x-amz-*.
    // Only add Content-Type IF your server signed it. Since our presign doesn't, omit it.
    const res = await fetch(url, { method: "PUT", body: file });
    if (!res.ok) throw new Error(`S3 PUT failed: ${res.status} ${res.statusText}`);
    return true;
  }

  async function kickAnalysis(key) {
    const r = await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key })
    });
    const j = await r.json().catch(() => ({}));
    if (!j?.ok) throw new Error(`Analyze failed: ${j?.error || r.status}`);
    return j;
  }

  async function startUploadFlow(file) {
    if (!file) throw new Error("No file selected");
    log("Requesting presign…");
    const pre = await presignPut(file.name);
    log("Uploading to S3…");
    await putToS3(pre.url, file);
    log("Upload complete. Starting analysis…");
    await kickAnalysis(pre.key);
    log("Opening report view…");
    const u = new URL("/report.html", location.origin);
    u.searchParams.set("key", pre.key);
    location.assign(u.toString());
  }

  btn?.addEventListener("click", async () => {
    const file = fileInput?.files?.[0];
    if (!file) { log("Pick a video first."); return; }

    busy(true);
    try {
      await startUploadFlow(file);
    } catch (e) {
      log("Error: " + (e?.message || e));
      busy(false);
    }
  });

  // Optional: auto-start if user drops a file onto the page
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", async (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    if (fileLabel) fileLabel.textContent = f.name;
    if (fileInput) {
      // reflect in input for consistency
      const dt = new DataTransfer();
      dt.items.add(f);
      fileInput.files = dt.files;
    }
    busy(true);
    try {
      log("Selected (drop): " + f.name);
      await startUploadFlow(f);
    } catch (err) {
      log("Error: " + (err?.message || err));
      busy(false);
    }
  });
})();
