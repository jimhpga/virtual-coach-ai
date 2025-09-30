(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
  function setText(id, v){ const el=document.getElementById(id); if(el) el.textContent = v==null? "": v; }
  function setHTML(id, v){ const el=document.getElementById(id); if(el) el.innerHTML = v==null? "": v; }

  // Build a URL from either ?report=... or S3 trio (?jobId&bucket&region)
  function resolveReportUrl(){
    const q = new URLSearchParams(location.search);
    const direct = q.get("report");
    if (direct) return direct; // can be relative (/reports/..., report.json) or absolute

    // S3 pattern: ?jobId=...&bucket=...&region=...
    const jobId  = q.get("jobId");
    const bucket = q.get("bucket");
    const region = q.get("region") || "us-west-1";
    if (jobId && bucket){
      return `https://${bucket}.s3.${region}.amazonaws.com/reports/${encodeURIComponent(jobId)}.json`;
    }
    return "report.json"; // default right next to /docs
  }

  async function boot(){
    try{
      const src = resolveReportUrl();
      const r = await fetch(src, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${src}`);
      const j = await r.json();
      window.__lastReport = j;

      // Header fields (IDs expected by the template)
      setText("date",       j.date || j.header?.date || "");
      setText("modeLabel",  j.mode || j.header?.mode || "");
      setText("swingCount", j.swings ?? j.header?.swings ?? "");

      // Summary (if your template has an element with id="summary")
      setText("summary", j.summary || "");

      // P1–P9 list (works with either p1p9 or p1ToP9)
      const seq = j.p1p9 || j.p1ToP9 || [];
      if (seq.length){
        const rows = seq.map(x => `<div class="row"><strong>${esc(x.p||"")}</strong> — ${esc(x.note||"")}</div>`).join("");
        setHTML("plist", rows);
      }

      // Make the Download button (id="btnDownload") generate a clean HTML file
      const dl = document.getElementById("btnDownload");
      if (dl){
        dl.addEventListener("click", ()=>{
          // collect ALL <style> blocks so charts/widgets look right
          const css = Array.from(document.querySelectorAll("style")).map(s=>s.textContent).join("\n");
          const sect = id => (document.getElementById(id)?.innerHTML)||"";
          const txt  = id => (document.getElementById(id)?.textContent)||"";
          const html = [
            "<!doctype html><html lang=\"en\"><head>",
            "<meta http-equiv=\"Cache-Control\" content=\"no-store, max-age=0\">",
            "<meta http-equiv=\"Pragma\" content=\"no-cache\">",
            "<meta http-equiv=\"Expires\" content=\"0\"><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>",
            "<title>Virtual Coach AI — Swing Report</title><style>"+css+"</style></head><body style=\"background:#0b1520\">",
            "<main class=\"wrap\" style=\"width:900px;max-width:94%;margin:20px auto\">",
            "<header class=\"hdr\" style=\"margin-bottom:10px\"><div><div class=\"title\">Swing Report — P1–P9</div><div class=\"sub\">Date: <strong>"+esc(txt("date"))+"</strong> • Mode: <strong>"+esc(txt("modeLabel"))+"</strong></div></div><div><span class=\"badge\">Swings: <span>"+esc(txt("swingCount"))+"</span></span></div></header>",
            "<section class=\"card\"><h3>Summary</h3><div class=\"content\">"+esc(txt("summary"))+"</div></section>",
            "<section class=\"card\"><h3>P1–P9</h3><div class=\"content\">"+sect("plist")+"</div></section>",
            "</main></body></html>"
          ].join("\n");

          const blob = new Blob([html], {type:"text/html"});
          const a = Object.assign(document.createElement("a"), {
            href: URL.createObjectURL(blob),
            download: "VirtualCoachAI-Report.html"
          });
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
        });
      }
    }catch(e){
      console.error("Report load failed:", e);
      const box = document.createElement("pre");
      box.style.cssText = "white-space:pre-wrap;padding:12px;margin:12px;border:1px solid #c33;background:#200;color:#fbd";
      box.textContent = "Report load error:\n" + (e && (e.stack||e.message) || e);
      document.body.prepend(box);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
