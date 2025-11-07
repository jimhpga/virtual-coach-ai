// /public/upload.client.js â€” Mux flow (no S3)
// v5-final

(() => {
  console.log("[upload mux v5] client JS loaded");

  const $ = (s) => document.querySelector(s);

  // Fallback-friendly selectors
  const fileInput =
    $("#fileInput") || $("#file") || document.querySelector('input[type="file"]');
  const fileLabel = $("#fileLabel");
  const btn =
    $("#uploadBtn") ||
    $("#submit") ||
    document.querySelector('button[type="submit"]') ||
    document.querySelector("button");

  // Minimal log area if none exists
  const logEl =
    $("#log") ||
    (() => {
      const d = document.createElement("pre");
      d.id = "log";
      d.style.cssText =
        "margin-top:1rem;color:#666;white-space:pre-wrap;background:#f7f7f8;border:1px solid #ddd;padding:.5rem;border-radius:8px;max-width:680px";
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
    btn && (btn.disabled = on);
    fileInput && (fileInput.disabled = on);
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

  async function jsonOrThrow(res, fallback = "Request failed") {
    let data = null;
    try {
      data = await res.json();
    } catch (_) {}
    if (!res.ok) throw new Error(data?.error || `${fallback} (${res.status})`);
    return data || {};
  }

  // Main handler (blocks any old listeners)
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
      // 1) Get a Mux direct-upload URL
      log("Requesting Mux upload URLâ€¦");
      const r1 = await fetch("https://api.virtualcoachai.net/api/mux-direct-upload", { method: "POST" });
      const j1 = await jsonOrThrow(r1, "Mux upload URL request failed");
      const upload = j1?.upload;
      if (!upload?.url) throw new Error("Mux upload URL missing");

      // 2) PUT the file to Mux
      log("Uploading to Mux (this can take a minute)...");
      const put = await fetch(upload.url, { method: "PUT", body: file });
      if (!put.ok) throw new Error(`Mux upload failed (${put.status})`);

      // 3) Save your report JSON (store the Mux upload id so your backend can resolve playback later)
      log("Saving report JSONâ€¦");
      const r2 = await fetch("https://api.virtualcoachai.net/api/save-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "ready",
          swingScore: 80,
          muxPlaybackId: null, // resolved later by /api/resolve-mux
          muxUploadId: upload.id,
          p1p9: [],
          faults: [],
          note: `uploaded ${file.name}`,
          meta: data,
        }),
      });
      const rep = await jsonOrThrow(r2, "Report save failed");

      // 4) Open the report â€” prefer the direct Blob URL, fall back to id
      log("Opening report viewâ€¦");
      if (rep.url) {
        location.assign(`/report.html?url=${encodeURIComponent(rep.url)}`);
      } else if (rep.id) {
        location.assign(`/report.html?id=${encodeURIComponent(rep.id)}`);
      } else {
        throw new Error("Report response missing url/id");
      }
    } catch (err) {
      log("Error: " + (err?.message || err));
      busy(false);
      window.__uploadRunning = false;
    }
  });
})();
