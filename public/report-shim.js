(() => {
  // ---- CONFIG: set to your real bucket/region ----
  const BUCKET = "virtualcoachai-prod";
  const REGION = "us-west-2"; // use "us-east-1" if that's your bucket
  // ------------------------------------------------

  const $ = (sel) => document.querySelector(sel);
  const params = new URL(location.href).searchParams;
  const id = params.get("id");

  const status = $(".muted");
  const view = $("#view");

  const jsonUrl = (rid) =>
    REGION === "us-east-1"
      ? `https://${BUCKET}.s3.amazonaws.com/reports/${encodeURIComponent(rid)}.json?cb=${Date.now()}`
      : `https://${BUCKET}.s3.${REGION}.amazonaws.com/reports/${encodeURIComponent(rid)}.json?cb=${Date.now()}`;

  const el = (tag, attrs = {}, html = "") => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => (n[k] = v));
    if (html) n.innerHTML = html;
    return n;
  };

  const render = (data) => {
    status.textContent = "✅ Report loaded.";
    const highlights = (data.highlights || []).map(h => `<li>${h}</li>`).join("");
    const faults = (data.faults || []).map(f => `<li><b>${f.code}</b> [${f.severity}] — ${f.note}</li>`).join("");
    const p1p9 = (data.p1p9 || []).map(p => `<li><b>${p[0]} ${p[1]}:</b> ${p[2]}</li>`).join("");

    view.innerHTML = `
      <h3>Virtual Coach AI — Swing Report</h3>
      <p><strong>Client:</strong> ${data?.client?.id || "—"} &nbsp;•&nbsp;
         <strong>Mode:</strong> ${data?.client?.mode || "—"} &nbsp;•&nbsp;
         <strong>Swings:</strong> ${data?.client?.swings ?? "—"}</p>
      <p><strong>Swing Score:</strong> ${data?.swingScore ?? "—"}</p>

      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <div style="flex:1 1 280px;min-width:260px">
          <h4>Highlights</h4>
          <ul>${highlights || "<li>—</li>"}</ul>

          <h4>Faults</h4>
          <ul>${faults || "<li>—</li>"}</ul>
        </div>

        <div style="flex:2 1 420px;min-width:320px">
          <h4>P1–P9</h4>
          <ol>${p1p9 || "<li>—</li>"}</ol>
        </div>
      </div>
    `;
  };

  const addActions = () => {
    const wrap = document.querySelector(".wrap");
    const bar = el("div");
    bar.style.cssText = "display:flex;gap:8px;margin:8px 0 16px 0";
    bar.innerHTML = `
      <button id="copyLink">Copy Report Link</button>
      <button id="refresh">Refresh</button>
    `;
    wrap.insertBefore(bar, wrap.children[2]);

    $("#copyLink").onclick = async () => {
      await navigator.clipboard.writeText(location.href);
      status.textContent = "🔗 Link copied.";
    };
    $("#refresh").onclick = () => location.reload();
  };

  const fetchOnce = async () => {
    const res = await fetch(jsonUrl(id), { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  };

  const pollUntilFound = async () => {
    status.textContent = "⏳ Processing… your report will appear automatically.";
    while (true) {
      try {
        const data = await fetchOnce();
        render(data);
        break;
      } catch {
        await new Promise(r => setTimeout(r, 30000)); // 30s
      }
    }
  };

  // ---- Run
  addActions();
  if (!id) {
    status.textContent = "❌ Missing ?id=… in URL.";
    return;
  }
  // fast path: try once, else poll
  fetchOnce().then(render).catch(pollUntilFound);
})();
