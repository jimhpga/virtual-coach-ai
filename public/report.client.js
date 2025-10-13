// report.client.js  (serve from site root: /report.client.js)
// Renders the Swing Report from /api/report?key=... (supports demo=1)

(function () {
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  function qs() {
    const out = {};
    for (const [k, v] of new URLSearchParams(location.search).entries()) out[k] = v;
    return out;
  }

  async function getJSON(url) {
    const r = await fetch(url, { headers: { "accept": "application/json" } });
    const txt = await r.text();
    try { return JSON.parse(txt); } catch { throw new Error(`Bad JSON: ${txt}`); }
  }

  function setProgress(idBar, idLbl, val) {
    const pct = Math.max(0, Math.min(100, Number(val) || 0));
    byId(idBar).style.width = pct + "%";
    byId(idLbl).textContent = `${pct}`;
  }

  function setList(olId, items) {
    const el = byId(olId);
    el.innerHTML = "";
    (items || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      el.appendChild(li);
    });
  }

  function setUl(ulId, items) {
    const el = byId(ulId);
    el.innerHTML = "";
    (items || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      el.appendChild(li);
    });
  }

  function setBadges(rowId, badges) {
    const row = byId(rowId);
    row.innerHTML = "";
    (badges || []).forEach((b) => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = b.title || b.label || b.id;
      row.appendChild(span);
    });
  }

  function text(id, v) { const el = byId(id); if (el) el.textContent = v ?? ""; }

  function fillFromShapeA(data) {
    // Shape A -> fields at top-level (demo from /api/report earlier)
    const s = data.summary || {};
    setProgress("pwrBar", "pwrLbl", s.powerScore);
    setProgress("consBar", "consLbl", s.consistency);
    setList("funds", data.fundamentals);
    setList("errs", data.errors);
    setList("fixes", data.quickFixes);
    setUl("exp", data.expectations);
    setUl("drillList", data.drills);
    setBadges("badgeRow", data.badges);
    text("coachCopy", data.coachCopy || "");
    const deltas = data.deltas || {};
    byId("deltas").innerHTML =
      (deltas.powerScore || deltas.consistency)
        ? `<span class="mono">Δ Power: ${deltas.powerScore ?? 0} • Δ Consistency: ${deltas.consistency ?? 0}</span>`
        : "";
  }

  function fillFromShapeB(report) {
    // Shape B -> nested under report.meta / report.sections (newer demo)
    const meta = report.meta || {};
    const sections = report.sections || {};
    const pwr = (report.summary && report.summary.powerScore)
      || (report.metrics && report.metrics.powerScore);
    const cons = (report.summary && report.summary.consistency)
      || (report.metrics && report.metrics.consistency);

    setProgress("pwrBar", "pwrLbl", pwr);
    setProgress("consBar", "consLbl", cons);

    setList("funds", sections.fundamentalsTop3 || []);
    setList("errs", sections.powerErrorsTop3 || []);
    setList("fixes", sections.quickFixesTop3 || []);
    setUl("exp", report.expectations || []);
    setUl("drillList", sections.drills || report.drills || []);
    setBadges("badgeRow", report.badges || []);
    text("coachCopy", (report.teacherVoice && report.teacherVoice.sample) || report.coachCopy || "");

    // header meta
    const k = meta.key ? ` — <span class="mono">${meta.key}</span>` : "";
    const dateStr = meta.date ? `Date: ${meta.date}` : "";
    byId("meta").innerHTML = [dateStr, meta.mode].filter(Boolean).join(" • ") + k;
  }

  function render(data) {
    // Try both shapes
    if (data && data.report) {
      fillFromShapeB(data.report);
    } else {
      fillFromShapeA(data);
    }
    byId("pending").style.display = "none";
    byId("report").style.display = "";
  }

  function showPending(msg) {
    const p = byId("pending");
    p.style.display = "";
    p.innerHTML = `<div class="mono">${msg}</div>`;
  }

  async function init() {
    const params = qs();
    const key = params.key || "demo.mov";
    const demo = params.demo;

    // update share link
    const share = $("#share");
    if (share) {
      share.addEventListener("click", (e) => {
        e.preventDefault();
        const url = location.href;
        navigator.clipboard?.writeText(url);
        share.textContent = "Copied!";
        setTimeout(() => (share.textContent = "Copy share link"), 1500);
      });
    }

    showPending("Loading report…");

    const u = new URL("/api/report", location.origin);
    u.searchParams.set("key", key);
    if (demo) u.searchParams.set("demo", demo);

    const start = Date.now();
    while (true) {
      try {
        const data = await getJSON(u.toString());
        if (data && data.ok) { render(data); return; }
        if (data && data.error === "NOT_READY") {
          showPending("Analyzing your swing… (refreshes every 5s)");
        } else {
          showPending(`Waiting… ${data && data.error ? data.error : ""}`);
        }
      } catch (e) {
        showPending("Problem loading the report.");
        console.warn(e);
      }
      if (Date.now() - start > 60000) { // give up after 60s
        showPending("Analysis still processing. Check back soon.");
        return;
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
