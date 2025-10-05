(function () {
  const BUCKET = "virtualcoachai-prod";          // <- your bucket
  const REGION = "us-west-2";                    // <- your region
  const url = new URL(location.href);
  const id = url.searchParams.get("id");

  const statusEl = document.getElementById("status") || (() => {
    const s = document.createElement("div");
    s.id = "status";
    s.style.cssText = "padding:12px;margin:10px 0;border:1px solid #ccc;border-radius:8px;font:14px/1.4 system-ui";
    document.body.prepend(s);
    return s;
  })();

  const render = (data) => {
    statusEl.textContent = "✅ Report loaded.";
    // very minimal render – adapt to your page structure
    const root = document.getElementById("report") || (() => {
      const r = document.createElement("div");
      r.id = "report";
      document.body.appendChild(r);
      return r;
    })();
    root.innerHTML = `
      <h2>Virtual Coach AI — Swing Report</h2>
      <p><strong>Client:</strong> ${data?.client?.id || "—"} • <strong>Mode:</strong> ${data?.client?.mode || "—"} • <strong>Swings:</strong> ${data?.client?.swings || "—"}</p>
      <p><strong>Swing Score:</strong> ${data?.swingScore ?? "—"}</p>
      <h3>Highlights</h3>
      <ul>${(data?.highlights||[]).map(h=>`<li>${h}</li>`).join("")}</ul>
      <h3>Faults</h3>
      <ul>${(data?.faults||[]).map(f=>`<li><b>${f.code}</b> [${f.severity}] — ${f.note}</li>`).join("")}</ul>
      <h3>P1–P9</h3>
      <ol>${(data?.p1p9||[]).map(p=>`<li><b>${p[0]} ${p[1]}:</b> ${p[2]}</li>`).join("")}</ol>
    `;
  };

  const makeJsonUrl = (id) => {
    return REGION === "us-east-1"
      ? `https://${BUCKET}.s3.amazonaws.com/reports/${encodeURIComponent(id)}.json?cb=${Date.now()}`
      : `https://${BUCKET}.s3.${REGION}.amazonaws.com/reports/${encodeURIComponent(id)}.json?cb=${Date.now()}`;
  };

  const addActions = () => {
    const bar = document.getElementById("actions") || (() => {
      const a = document.createElement("div");
      a.id = "actions";
      a.style.cssText = "display:flex;gap:8px;margin:10px 0;";
      document.body.prepend(a);
      return a;
    })();
    bar.innerHTML = `
      <button id="copyLink">Copy Report Link</button>
      <button id="refresh">Refresh</button>
    `;
    document.getElementById("copyLink").onclick = async () => {
      await navigator.clipboard.writeText(location.href);
      statusEl.textContent = "🔗 Link copied.";
    };
    document.getElementById("refresh").onclick = () => location.reload();
  };

  const fetchOnce = async () => {
    const res = await fetch(makeJsonUrl(id), { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  };

  const pollUntilFound = async () => {
    statusEl.textContent = "⏳ Processing… your report will appear automatically.";
    while (true) {
      try {
        const data = await fetchOnce();
        render(data);
        break;
      } catch (e) {
        await new Promise(r => setTimeout(r, 30000)); // 30s
      }
    }
  };

  if (!id) {
    statusEl.textContent = "❌ Missing ?id=… in URL.";
    return;
  }

  addActions();
  // First try immediate load; if not there, poll.
  fetchOnce().then(render).catch(pollUntilFound);
})();
