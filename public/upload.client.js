// /public/upload.client.js  — Mux flow (no S3)
// v3
(function () {
  console.log("[upload mux v3] client JS loaded");

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
  const busy = (on) => { if(btn) btn.disabled = on; if(fileInput) fileInput.disabled = on; Object.values(fields).forEach(el => el && (el.disabled = on)); };

  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (fileLabel) fileLabel.textContent = f ? `${f.name}` : "(no file)";
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
      log("Requesting Mux upload URL…");
      const { upload } = await fetch("/api/mux-direct-upload", { method: "POST" }).then(r => r.json());
      if (!upload?.url) throw new Error("Mux upload URL missing");

      log("Uploading to Mux (this can take a minute)...");
      const put = await fetch(upload.url, { method: "PUT", body: file });
      if (!put.ok) throw new Error(`Mux upload failed (${put.status})`);

      log("Saving report JSON…");
      const rep = await fetch("/api/save-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "ready",
          swingScore: 80,
          muxPlaybackId: null,     // resolved later by poller
          muxUploadId: upload.id,  // used by /api/resolve-mux
          p1p9: [],
          faults: [],
          note: `uploaded ${file.name}`,
          meta: data
        })
      }).then(r => r.json());

      if (!rep?.id) throw new Error("Report save failed");
      log("Opening report view…");
      location.assign(`/report?id=${encodeURIComponent(rep.id)}`);
    } catch (e) {
      log("Error: " + (e?.message || e));
      busy(false);
    }
  });
})();
