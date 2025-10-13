// public/report.client.js
(function () {
  const $ = (s) => document.querySelector(s);
  const byId = (id) => document.getElementById(id);

  const qs = () => Object.fromEntries(new URLSearchParams(location.search).entries());

  async function getJSON(url) {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    const t = await r.text();
    try { return JSON.parse(t); } catch { throw new Error(`Bad JSON: ${t}`); }
  }

  function setProgress(barId, lblId, val) {
    const n = Math.max(0, Math.min(100, Number(val) || 0));
    byId(barId).style.width = n + "%";
    byId(lblId).textContent = String(n);
  }
  function setList(id, arr) {
    const el = byId(id); el.innerHTML = "";
    (arr || []).forEach((x) => { const li = document.createElement("li"); li.textContent = x; el.appendChild(li);});
  }
  function setUl(id, arr) { setList(id, arr); }
  function setBadges(id, badges) {
    const row = byId(id); row.innerHTML = "";
    (badges || []).forEach((b) => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = b.title || b.label || b.id;
      row.appendChild(span);
    });
  }

  function renderShapeA(d) {
    const s = d.summary || {};
    setProgress("pwrBar", "pwrLbl", s.powerScore);
    setProgress("consBar", "consLbl", s.consistency);
    setList("funds", d.fundamentals);
    setList("errs", d.errors);
    setList("fixes", d.quickFixes);
    setUl("exp", d.expectations);
    setUl("drillList", d.drills);
    setBadges("badgeRow", d.badges);
    byId("coachCopy").textContent = d.coachCopy || "";
    const deltas = d.deltas || {};
    byId("deltas").innerHTML =
      (deltas.powerScore || deltas.consistency)
        ? `<span class="mono">Δ Power: ${deltas.powerScore ?? 0} • Δ Consistency: ${deltas.consistency ?? 0}</span>`
        : "";
  }

  function renderShapeB(r) {
    const meta = r.meta || {};
    const sections = r.sections || {};
    const pwr = r.summary?.powerScore ?? r.metrics?.powerScore;
    const cons = r.summary?.consistency ?? r.metrics?.consistency;

    setProgress("pwrBar", "pwrLbl", pwr);
    setProgress("consBar", "consLbl", cons);
    setList("funds", sections.fundamentalsTop3 || []);
    setList("errs", sections.powerErrorsTop3 || []);
    setList("fixes", sections.quickFixesTop3 || []);
    setUl("exp", r.expectations || []);
    setUl("drillList", sections.drills || r.drills || []);
    setBadges("badgeRow", r.badges || []);
    byId("coachCopy").textContent = r.teacherVoice?.sample || r.coachCopy || "";

    const bits = [];
    if (meta.date) bits.push(`Date: ${meta.date}`);
    if (meta.mode) bits.push(meta.mode);
    if (meta.key) bits.push(`<span class="mono">${meta.key}</span>`);
    byId("meta").innerHTML = bits.join(" • ");
  }

  function showPending(msg) {
    const p = byId("pending");
    p.style.display = "";
    p.innerHTML = `<div class="mono">${msg}</div>`;
  }

  function render(data) {
    if (data.report) renderShapeB(data.report);
    else renderShapeA(data);
    byId("pending").style.display = "none";
    byId("report").style.display = "";
  }

  async function init() {
    const params = qs();
    const key = params.key || "demo.mov";
    const demo = params.demo;

    const share = $("#share");
    if (share) {
      share.addEventListener("click", (e) => {
        e.preventDefault();
        navigator.clipboard?.writeText(location.href);
        share.textContent = "Copied!";
        setTimeout(() => (share.textContent = "Copy share link"), 1200);
      });
    }

    showPending("Loading report…");

    const url = new URL("/api/report", location.origin);
    url.searchParams.set("key", key);
    if (demo) url.searchParams.set("demo", demo);

    const start = Date.now();
    while (true) {
      try {
        const data = await getJSON(url.toString());
        if (data?.ok) { render(data); return; }
        if (data?.error === "NOT_READY") showPending("Analyzing your swing… (auto-refreshing)");
        else showPending("Waiting on analysis…");
      } catch (e) {
        console.warn(e);
        showPending("Problem loading the report.");
      }
      if (Date.now() - start > 60000) { showPending("Still processing — check back soon."); return; }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
