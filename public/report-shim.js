(() => {
  const el = document.getElementById("view");
  const qp = new URLSearchParams(location.search);
  const report = qp.get("report") || "/docs/report/report.json";

  async function load() {
    try {
      const r = await fetch(report, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
      const data = await r.json();
      el.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    } catch (e) {
      el.innerHTML = `<p style="color:#f88">Failed to load <code>${report}</code>: ${e && e.message ? e.message : e}</p>`;
    }
  }
  load();
})();
