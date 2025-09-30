(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
  function setText(id,v){ const el=document.getElementById(id); if(el) el.textContent = v==null? "" : v; }
  function setHTML(id,v){ const el=document.getElementById(id); if(el) el.innerHTML = v==null? "" : v; }

  function buildSrc(){
    const q = new URLSearchParams(location.search);
    const report = q.get("report");
    const key    = q.get("key");    // e.g. uploads/abc.json or reports/abc.json
    const jobId  = q.get("jobId");  // preferred: reports/<jobId>.json
    const bucket = q.get("bucket") || "virtualcoachai-swings";
    const region = q.get("region") || "us-west-1";

    if (jobId) return `https://${bucket}.s3.${region}.amazonaws.com/reports/${jobId}.json`;
    if (key)   return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    if (report) return report; // can be /reports/....json or absolute
    return "/report.json";     // local dev fallback
  }

  async function boot(){
    try{
      const src = buildSrc();
      const r = await fetch(src, { cache:"no-store" });
      const j = await r.json();
      window.__lastReport = j;

      // Header text (if these IDs exist in index.html)
      setText("date",       j.date || j.header?.date || "");
      setText("modeLabel",  j.mode || j.header?.mode || "");
      setText("swingCount", j.swings ?? j.header?.swings ?? "");

      // --- P1–P9 ------------------------------------------------------------
      const seq = Array.isArray(j.p1p9) ? j.p1p9 : (Array.isArray(j.p1ToP9) ? j.p1ToP9 : []);
      const noteByP = new Map(seq.map(x => [String(x.p||"").toUpperCase(), x.note||""]));
      const order = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"];
      const plist = order.map(p => {
        const note = noteByP.get(p) || "";
        return `<div class="row"><strong>${p}</strong>${note?` — ${esc(note)}`:""}</div>`;
      }).join("");
      setHTML("plist", plist);

      // Optional: make Copy Share Link button include current query
      const btnCopy = document.getElementById("btnCopyLink");
      if (btnCopy) {
        btnCopy.addEventListener("click", ()=>{
          const url = location.origin + location.pathname + location.search;
          navigator.clipboard.writeText(url);
          btnCopy.textContent = "Copied!";
          setTimeout(()=>btnCopy.textContent="Copy Share Link",1200);
        });
      }
    }catch(e){
      console.error("Report shim failed:", e);
      const pre = document.createElement("pre");
      pre.style.cssText = "white-space:pre-wrap;padding:12px;margin:12px;border:1px solid #d55;background:#220;color:#ffd";
      pre.textContent = "Report load error:\n" + (e && e.stack || e);
      document.body.prepend(pre);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
