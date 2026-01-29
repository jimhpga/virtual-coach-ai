;/* VCA_PROGRESS_OVERLAY (safe) */
(function(){
  try{
    if(window.__VCA_OVERLAY_READY__) return;
    window.__VCA_OVERLAY_READY__ = true;

    function ensure(){
      if(document.getElementById("vca-progress-overlay")) return;
      var d = document.createElement("div");
      d.id = "vca-progress-overlay";
      d.style.cssText = "position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);";
      d.innerHTML = '<div style="width:min(520px,92vw);border:1px solid rgba(255,255,255,0.16);border-radius:16px;background:rgba(15,18,22,0.92);box-shadow:0 18px 70px rgba(0,0,0,0.55);padding:18px 18px 16px;color:#eaf1ff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;">'
        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">'
        + '  <div style="width:10px;height:10px;border-radius:999px;background:#6ee7b7;box-shadow:0 0 0 3px rgba(110,231,183,0.15)"></div>'
        + '  <div style="font-weight:900;letter-spacing:.2px">Virtual Coach AI</div>'
        + '</div>'
        + '<div id="vca-progress-title" style="font-size:16px;font-weight:950;margin:6px 0 8px 0;">Uploading…</div>'
        + '<div id="vca-progress-sub" style="font-size:12px;opacity:.82;margin-bottom:12px;">Stay on this page. This can take a moment.</div>'
        + '<div style="height:10px;border-radius:999px;background:rgba(255,255,255,0.10);overflow:hidden;border:1px solid rgba(255,255,255,0.14);">'
        + '  <div id="vca-progress-bar" style="height:100%;width:8%;border-radius:999px;background:rgba(255,255,255,0.65);transition:width .35s ease;"></div>'
        + '</div>'
        + '<div id="vca-progress-note" style="margin-top:10px;font-size:11px;opacity:.75;">Why this matters: upload → processing → report.</div>'
        + '</div>';
      document.body.appendChild(d);
    }

    window.vcaOverlayShow = function(title, sub){
      ensure();
      var o = document.getElementById("vca-progress-overlay");
      var t = document.getElementById("vca-progress-title");
      var s = document.getElementById("vca-progress-sub");
      if(t && title) t.textContent = title;
      if(s && sub) s.textContent = sub;
      if(o) o.style.display = "flex";
    };

    window.vcaOverlayHide = function(){
      var o = document.getElementById("vca-progress-overlay");
      if(o) o.style.display = "none";
    };

    window.vcaOverlayBar = function(pct){
      var b = document.getElementById("vca-progress-bar");
      if(!b) return;
      var v = Math.max(3, Math.min(97, pct|0));
      b.style.width = v + "%";
    };

    window.vcaStage = function(title, pct, sub){
      try{
        window.vcaOverlayShow(title || "Processing…", sub || "One moment…");
        if(typeof pct === "number") window.vcaOverlayBar(pct);
      }catch(e){}
    };
  }catch(e){}
})();
function vcaSetStatus(msg){
  try{
    var el = document.querySelector("[data-vca-status]");
    if(el) el.textContent = msg || "";
  }catch(e){}
}
function vcaDisableAnalyze(disabled){
  try{
    var btn = document.querySelector("[data-vca-analyze]");
    if(btn) btn.disabled = !!disabled;
  }catch(e){}
}
function vcaSleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
async function vcaFakePipeline(){
  vcaDisableAnalyze(true);
  vcaSetStatus("Uploading your swing…");
  await vcaSleep(650);
  vcaSetStatus("Processing frames…");
  await vcaSleep(650);
  vcaSetStatus("Building your report…");
  await vcaSleep(650);
  vcaSetStatus("Almost there…");
  await vcaSleep(450);
}
// /public/upload.client.js Ã¢â‚¬â€ Mux flow (no S3)
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
      log("Requesting Mux upload URLÃ¢â‚¬Â¦");
      const r1 = await fetch("/api/mux-direct-upload", { method: "POST" });
      const j1 = await jsonOrThrow(r1, "Mux upload URL request failed");
      const upload = j1?.upload;
      if (!upload?.url) throw new Error("Mux upload URL missing");

      // 2) PUT the file to Mux
      log("Uploading to Mux (this can take a minute)...");
      const put = await fetch(upload.url, { method: "PUT", body: file });
      if (!put.ok) throw new Error(`Mux upload failed (${put.status})`);

      // 3) Save your report JSON (store the Mux upload id so your backend can resolve playback later)
      log("Saving report JSONÃ¢â‚¬Â¦");
      const r2 = await fetch("/api/save-report", {
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

      // 4) Open the report Ã¢â‚¬â€ prefer the direct Blob URL, fall back to id
      log("Opening report viewÃ¢â‚¬Â¦");
      if (rep.url) {
        location.assign(`/report-beta/full?src=${encodeURIComponent(rep.url)}`);
      } else if (rep.id) {
        (async () => { try { await vcaFakePipeline();
    await fetch("/api/analyze-swing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: rep.id })
    });
  } catch (e) { /* ignore */ }
  location.assign(`/report-beta/full?jobId=${encodeURIComponent(rep.id)}`);
})();} else {
        throw new Error("Report response missing url/id");
      }
    } catch (err) {
      log("Error: " + (err?.message || err));
      busy(false);
      window.__uploadRunning = false;
    }
  });
})();







