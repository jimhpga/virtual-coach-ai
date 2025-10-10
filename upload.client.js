// public/upload.client.js (v10)
(function () {
  const $ = (s) => document.querySelector(s);
  const fileInput = $("#fileInput");
  const fileLabel = $("#fileLabel");
  const btn = $("#uploadBtn");
  const logEl = $("#log");

  const fields = {
    name:   $("#name"),
    email:  $("#email"),
    hcap:   $("#handicap"),
    handed: $("#handed"),
    eye:    $("#eye"),
    height: $("#height")
  };

  const log  = (m) => { logEl.textContent += (logEl.textContent ? "\n" : "") + m; logEl.scrollTop = logEl.scrollHeight; };
  const busy = (on) => { btn.disabled = on; fileInput.disabled = on; Object.values(fields).forEach(el => el && (el.disabled = on)); };

  log("[upload v10] client JS loaded");

  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    fileLabel.textContent = f ? `${f.name}` : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  function readForm() {
    return {
      name:   (fields.name?.value || "").trim(),
      email:  (fields.email?.value || "").trim(),
      hcap:   (fields.hcap?.value || "").trim(),
      handed: (fields.handed?.value || "").trim(),
      eye:    (fields.eye?.value || "").trim(),
      height: (fields.height?.value || "").trim()
    };
  }

  function validateHeight(h) {
    if (!h) return "Height is required.";
    const n = Number(h);
    if (!Number.isFinite(n)) return "Height must be a number.";
    if (n < 48 || n > 84) return "Height should be between 48 and 84 inches.";
    return "";
  }

  btn?.addEventListener("click", async () => {
    const file = fileInput?.files?.[0];
    if (!file) { log("Pick a video first."); return; }

    const data = readForm();
    const heightError = validateHeight(data.height);
    if (heightError) { log("Error: " + heightError); return; }

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

      // Pass golfer details to the viewer
      const q = new URLSearchParams({
        key,
        name: data.name,
        email: data.email,
        handicap: data.hcap,
        hand: data.handed,
        eye: data.eye,
        height: data.height
      });
      const reportUrl = `/report.html?${q.toString()}`;

      log("Opening report view…");
      location.assign(reportUrl);
    } catch (e) {
      log("Error: " + (e?.message || e));
      busy(false);
    }
  });
})();
