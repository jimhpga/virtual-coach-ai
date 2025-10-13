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

  log("[upload v12] client JS LOADED 🔥");

  // Show selected file name
  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (fileLabel) fileLabel.textContent = f ? f.name : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  // --- Helpers ---------------------------------------------------------------

  async function presignPut(filename) {
    // Backend returns { ok, url, key }
    const r = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ filename }),
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
    });
    if (!r.ok) throw new Error(`Presign failed: ${r.status}`);
    const j = await r.json();
    if (!j?.ok || !j?.url || !j?.key) throw new Error("Bad presign payload");
    if (/\bx-amz-checksum-/i.test(j.url)) {
      throw new Error("Presign URL contains checksum params; server must NOT sign Checksum* for PUT");
    }
    return j;
  }

  async function fetchPutToS3(url, file) {
    // Minimal headers only. Do NOT add Authorization or any x-amz-*.
    // Omit Content-Type unless the server signed it (we didn't).
    const res = await fetch(url, {
      method: "PUT",
      body: file,
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
      referrerPolicy: "no-referrer",
      // headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!res.ok) {
      const txt = await safeText(res);
      throw new Error(`S3 PUT failed: ${res.status} ${res.statusText} ${txt ? "- " + txt : ""}`);
    }
    return true;
  }

  function xhrPutToS3(url, file, onProgress) {
    // Fallback for environments where fetch surfaces generic network errors.
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      xhr.withCredentials = false; // critical for S3
      // If (and only if) server signed ContentType, set it; otherwise comment out:
      // xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      if (xhr.upload && typeof onProgress === "function") {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) resolve(true);
          else reject(new Error(`S3 XHR PUT failed: ${xhr.status} ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error("S3 XHR PUT network error"));
      xhr.send(file);
    });
  }

  async function kickAnalysis(key) {
    const r = await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
    });
    const j = await r.json().catch(() => ({}));
    if (!j?.ok) throw new Error(`Analyze failed: ${j?.error || r.status}`);
    return j;
  }

  function safeText(res) {
    return res.text().then(
      (t) => (t && t.length <= 200 ? t : ""),
      () => ""
    );
  }

  // --- Main flow -------------------------------------------------------------

  async function startUploadFlow(file) {
    if (!file) throw new Error("No file selected");
    log("Requesting presign…");
    const pre = await presignPut(file.name);
    log("Uploading to S3…");

    // Try fetch first, then XHR fallback for hostile environments/extensions
    try {
      await fetchPutToS3(pre.url, file);
    } catch (err) {
      log("Fetch PUT failed — trying XHR fallback…");
      await xhrPutToS3(pre.url, file, (p) => log(`Progress: $
