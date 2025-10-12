// report.client.js (v4)
(function () {
  const $ = (sel) => document.querySelector(sel);
  const params = new URLSearchParams(location.search);
  const key = params.get("key") || "";
  const demo = params.get("demo") === "1";

  const ui = {
    pending: $("#pending"),
    report: $("#report"),
    meta: $("#meta"),
    pwrBar: $("#pwrBar"),
    pwrLbl: $("#pwrLbl"),
    consBar: $("#consBar"),
    consLbl: $("#consLbl"),
    deltas: $("#deltas"),
    funds: $("#funds"),
    errs: $("#errs"),
    fixes: $("#fixes"),
    exp: $("#exp"),
    drillList: $("#drillList"),
    badgeRow: $("#badgeRow"),
    coachCopy: $("#coachCopy"),
    baseline: $("#baseline"),
    teacher: $("#teacher"),
    setBaseline: $("#setBaseline"),
    clearBaseline: $("#clearBaseline"),
    share: $("#share"),
  };

  function li(txt) { const li = document.createElement("li"); li.textContent = txt; return li; }
  function badge(txt) {
    const b = document.createElement("span");
    b.className = "badge"; b.textContent = txt; return b;
  }
  function percent(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  async function fetchReport() {
    const qs = demo ? `?demo=1&key=${encodeURIComponent(key)}` : `?key=${encodeURIComponent(key)}`;
    const res = await fetch(`/api/report${qs}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  }

  function render(data) {
    if (!data || data.ok === false) return;

    ui.meta.textContent = `Video: ${data.videoKey || key}`;
    ui.pwrBar.style.width = percent(data.summary?.powerScore ?? 0) + "%";
    ui.pwrLbl.textContent = `${data.summary?.powerScore ?? "—"}/100`;

    ui.consBar.style.width = percent(data.summary?.consistency ?? 0) + "%";
    ui.consLbl.textContent = `${data.summary?.consistency ?? "—"}/100`;

    ui.deltas.innerHTML = "";
    if (data.deltas) {
      const p = document.createElement("div");
      const pDelta = data.deltas.powerScore ?? 0;
      const cDelta = data.deltas.consistency ?? 0;
      const s = (v) => (v > 0 ? `+${v}` : `${v}`);
      p.textContent = `Δ Power: ${s(pDelta)} | Δ Consistency: ${s(cDelta)}`;
      ui.deltas.appendChild(p);
    }

    ui.funds.innerHTML = "";
    for (const f of data.fundamentals || []) ui.funds.appendChild(li(f));

    ui.errs.innerHTML = "";
    for (const e of data.errors || []) ui.errs.appendChild(li(e));

    ui.fixes.innerHTML = "";
    for (const f of data.quickFixes || []) ui.fixes.appendChild(li(f));

    ui.exp.innerHTML = "";
    for (const ex of data.expectations || []) ui.exp.appendChild(li(ex));

    ui.drillList.innerHTML = "";
    for (const d of data.drills || []) ui.drillList.appendChild(li(d));

    ui.badgeRow.innerHTML = "";
    for (const b of data.badges || []) ui.badgeRow.appendChild(badge(b.label || b.id));

    ui.coachCopy.textContent = data.coachCopy || "—";

    if (ui.pending) ui.pending.style.display = "none";
    if (ui.report) ui.report.style.display = "";
  }

  async function init() {
    if (!key) {
      if (ui.pending) {
        ui.pending.style.display = "";
        ui.pending.textContent = "Missing ?key in URL. Use demo with ?demo=1&key=demo.mov";
      }
      return;
    }

    // share link
    if (ui.share) {
      ui.share.addEventListener("click", (e) => {
        e.preventDefault();
        const url = location.href;
        navigator.clipboard?.writeText(url);
        ui.share.textContent = "Copied ✓";
        setTimeout(() => (ui.share.textContent = "Copy share link"), 1500);
      });
    }

    // polling loop (waits for analyzer unless demo)
    const start = Date.now();
    while (true) {
      try {
        const data = await fetchReport();
        if (data?.ok) { render(data); return; }
        if (data?.error === "NOT_READY") {
          if (ui.pending) {
            ui.pending.style.display = "";
            ui.pending.textContent = "Analyzing swing… this can take ~1–3 minutes. This page will refresh automatically.";
          }
        } else {
          throw new Error(data?.error || "Unknown error");
        }
      } catch (err) {
        console.warn(err);
        if (ui.pending) {
          ui.pending.style.display = "";
          ui.pending.textContent = "Problem loading report. Please retry.";
        }
      }

      if (!demo && Date.now() - start > 60_000) {
        if (ui.pending) {
          ui.pending.style.display = "";
          ui.pending.textContent = "Still processing. Please check back in a minute.";
        }
        return;
      }
      await new Promise((r) => setTimeout(r, demo ? 0 : 5000));
      if (demo) break; // demo returns immediately
    }
  }

  init();
})();
