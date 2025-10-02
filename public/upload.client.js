(() => {
  const $ = (s) => document.querySelector(s);
  const fileInput = $("#fileInput");
  const fileLabel = $("#fileLabel");
  const btn = $("#uploadBtn");
  const logEl = $("#log");

  function log(msg){ logEl.textContent += (logEl.textContent ? "\\n" : "") + msg; logEl.scrollTop = logEl.scrollHeight; }
  function busy(on){ btn.disabled = on; fileInput.disabled = on; }

  log("[upload] client JS loaded");

  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    fileLabel.textContent = f ? `${f.name} (${f.type||"video"}), ${f.size} bytes` : "(no file)";
    if (f) log("Selected: " + f.name);
  });

  btn?.addEventListener("click", async () => {
    const f = fileInput?.files?.[0];
    if (!f) { log("No file selected"); return; }

    busy(true);
    try {
      const jobId = Date.now().toString();
      log("Calling /api/make-report?");
      const r = await fetch(`/api/make-report?jobId=${encodeURIComponent(jobId)}`, { method:"GET", headers:{accept:"application/json"} });
      if (!r.ok) {
        const t = await r.text().catch(()=> "");
        throw new Error(`make-report HTTP ${r.status} ${r.statusText} ${t}`);
      }
      const data = await r.json();
      log("Report created.");
      const viewer = (data && data.viewerUrl) ? data.viewerUrl : "/report.html?report=/docs/report/report.json";
      log("Opening viewer: " + viewer);
      setTimeout(()=> location.href = viewer, 600);
    } catch (err) {
      log("Error: " + (err?.message || String(err)));
      log("Falling back to local sample report.");
      const fallback = "/report.html?report=/docs/report/report.json";
      setTimeout(()=> location.href = fallback, 800);
    }
  });
})();
