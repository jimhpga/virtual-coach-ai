// /public/upload.client.js — Mux flow (no S3)
// v4
(function () {
  console.log("[upload mux v4] client JS loaded");

  const $ = (s) => document.querySelector(s);

  // Fallback-friendly selectors
  const fileInput = $("#fileInput") || $("#file");
  const fileLabel = $("#fileLabel");
  const btn =
    $("#uploadBtn") ||
    $("#submit") ||
    document.querySelector('button[type="submit"]') ||
    document.querySelector('button');

  const logEl =
    $("#log") ||
    (() => {
      const d = document.createElement("pre");
      d.id = "log";
      d.style = "margin-top:1rem;color:#666;white-space:pre-wrap;";
      document.body.appendChild(d);
      return d;
    })();

  const fields = {
    name: $("#name"),
    email: $("#email"),
    hcap: $("#handicap"),
    handed: $("#handed"),
    eye: $("#eye"),
    height: $("#height"),
  };

  const log = (m) => {
    logEl.textContent += (logEl.textContent ? "\n" : "") + m;
    logEl.scrollTop = logEl.scrollHeight;
  };

  const busy = (on) => {
    if (btn) btn.disabled = on;
    if (fileInput) fileInput.disabled = on;
    Object.values(fields).forEach((el) => el && (el.disabled = on));
  };

  // File label update
  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (fileLabel) fileLabel.textContent = f ? f.name : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  // Helpers
  function readForm() {
    return {
      name: (fields.name?.value || "").trim(),
      email: (fields.email?.value || "").trim(),
      hcap: (fields.hcap?.value || "").trim(),
      handed: (fields.handed?.value || "").trim(),
      eye: (fields.eye?.value || "").trim(),
      height: (fields.height?.value || "").trim(),
    };
  }

  function validateHeight(h) {
    if (!h) return "Height is required.";
    const n = Number(h);
    if (!Number.isFinite(n)) return "Height must be a number.";
    if (n < 48 || n > 84) return "Height should be between 48 and 84 inches.";
    return "";
  }

  // Main handler (blocks any old S3 listeners)
  btn?.addEventListener("click", async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    e?.stopImmediatePropagation?.();

    if (window.__uploadRunning) return;
    window.__uploadRunning = true;

    const file = fileInput?.files?.[0];
    if (!file) {
      log("Pick a video first.");
      window.__uploadRunning = false;
      return;
    }

    const data = readForm();
    const heightError = validateHeight(data.height);
    if (heightError) {
      log("Error: " + heightError);
      window.__uploadRunning = false;
      return;
    }

    busy(true);
    try {
      log("Requesting Mux upload URL…");
      const r1 = await fetch("/api/mux-direct-upload", { method: "POST" });
      const j1 = await r1.json().catch(() => ({}));
      const upload = j1?.upload;
      if (!r1.ok || !upload?.url) throw new Error("Mux upload URL missing");

      log("Uploading to Mux (this can take a minute)...");
      const put = await fetch(upload.url, { method: "PUT", body: file });
      if (!put.ok) throw new Error(`Mux upload failed (${put.status})`);

      log("Saving report JSON…");
      const r2 = await fetch("/api/save-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "ready",
          swingScore: 80,
          muxPlaybackId: null,   // resolved later by /api/resolve-mux
          muxUploadId: upload.id,
          p1p9: [],
          faults: [],
          note: `uploaded ${file.name}`,
          meta: data,
        }),
      });
      const rep = await r2.json().catch(() => ({}));
      if (!r2.ok || !rep?.id) throw new Error("Report save failed");

      log("Opening report view…");
      location.assign(`/report?id=${encodeURIComponent(rep.id)}`);
    } catch (err) {
      log("Error: " + (err?.message || err));
      busy(false);
      window.__uploadRunning = false;
    }
  });
})();
