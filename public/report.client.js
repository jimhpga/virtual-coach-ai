/* /public/report.client.js v5 — resolves ?url= or ?id= via /api/get-url */
(function () {
  const $ = s => document.querySelector(s);

  function showError(msg){
    console.error("[report]", msg);
    let el = document.getElementById("error");
    if (!el) { el = document.createElement("div"); el.id="error"; el.style="color:red;margin:10px 0"; (document.querySelector("main")||document.body).prepend(el); }
    el.textContent = msg;
  }

  async function fetchJson(u){
    const r = await fetch(u, { cache: "no-store" });
    if (!r.ok) throw new Error(`Fetch ${r.status} for ${u}`);
    const t = await r.text();
    return JSON.parse(t.trim().replace(/^\uFEFF/, ""));
  }

  async function resolveReportUrl(){
    const q = new URLSearchParams(location.search);
    const urlParam = q.get("url");
    const idParam  = q.get("id");
    if (urlParam) return urlParam;
    if (idParam) {
      const r = await fetch(`/api/get-url?id=${encodeURIComponent(idParam)}`);
      const j = await r.json().catch(()=> ({}));
      if (!r.ok || !j?.url) throw new Error(`Could not resolve URL for id=${idParam}`);
      return j.url;
    }
    throw new Error("Missing report id or url. Use /report.html?url=<full-json> or /report.html?id=<id>.");
  }

  function setText(id, v){ const el = document.getElementById(id); if (el) el.textContent = v ?? "—"; }
  function renderReport(data){
    setText("score",   data.swingScore ?? data.power?.score ?? "—");
    setText("status",  data.status ?? "—");
    setText("created", data.created ?? data.createdAt ?? "—");
    // mount mux player later if data.muxPlaybackId exists
  }

  (async () => {
    try {
      const u = await resolveReportUrl();
      console.log("[report] loading:", u);
      const json = await fetchJson(u);
      console.log("[report] loaded:", json);
      renderReport(json);
    } catch (e) {
      showError("Failed to load report: " + (e?.message || e));
    }
  })();
})();



