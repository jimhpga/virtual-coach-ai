<<<<<<< Updated upstream
// public/report.client.js
(function () {
  const $ = (s) => document.querySelector(s);
  const byId = (id) => document.getElementById(id);
  const qs = () => Object.fromEntries(new URLSearchParams(location.search).entries());

  async function getJSON(url) {
    const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    const t = await r.text();
    try { return JSON.parse(t); } catch { throw new Error(`Bad JSON: ${t}`); }
  }

  function setProgress(barId, lblId, val) {
    const n = Math.max(0, Math.min(100, Number(val) || 0));
    const bar = byId(barId), lbl = byId(lblId);
    if (bar) bar.style.width = n + "%";
    if (lbl) lbl.textContent = `${n} / 100`;
  }

  function setList(id, arr) {
    const el = byId(id); if (!el) return;
    el.innerHTML = "";
    (arr || []).forEach((x) => {
      const li = document.createElement("li");
      li.textContent = String(x);
      el.appendChild(li);
    });
  }
  const setUl = setList;

  function setBadges(id, badges) {
    const row = byId(id); if (!row) return;
    row.innerHTML = "";
    (badges || []).forEach((b) => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = (b.title || b.label || b.id || b.code || "").toString().replace(/[-_]/g, " ");
      row.appendChild(span);
    });
  }

  // --------- Shape A (legacy) ----------
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

  // --------- Shape B (wrapped report) ----------
  function renderShapeB(r) {
    const meta = r.meta || {};
    const sections = r.sections || {};
    const pwr = r.summary?.powerScore ?? r.metrics?.powerScore ?? 0;
    const cons = r.summary?.consistency ?? r.metrics?.consistency ?? 0;

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

  // --------- Shape VC (your current API) ----------
  function renderShapeVC(r) {
    // meta/header
    const when = r.ts ? new Date(r.ts) : new Date();
    const parts = [
      when.toLocaleDateString(),
      r.mode ? `Mode: ${title(r.mode)}` : "",
      r.sourceKey ? `<span class="mono">${r.sourceKey}</span>` : ""
    ].filter(Boolean);
    byId("meta").innerHTML = parts.join(" • ");

    // scores
    const pwr = r.swingScore ?? 0;
    const cons = Math.round((r.swingScore ?? 0) * 0.9); // simple proxy until you add a real field
    setProgress("pwrBar", "pwrLbl", pwr);
    setProgress("consBar", "consLbl", cons);

    // p-checkpoints → fundamentals list
    const funds = (r.p_checkpoints || [])
      .slice(0, 3)
      .map(x => `P${x.p} — ${x.notes || x.label || ""}`);
    setList("funds", funds);

    // faults → errors list & badges
    const errs = (r.faults || []).map(f => `${nice(f.code)}${f.severity ? ` (${f.severity})` : ""}`);
    setList("errs", errs.slice(0, 3));
    setBadges("badgeRow", r.faults);

    // friendly placeholders until you return these arrays
    setList("fixes", [
      "Add vertical force earlier",
      "Keep trail wrist bent through P6",
      "Match face closer to path at P7"
    ]);
    setUl("exp", [
      "Ball flight may start lower for a few sessions",
      "Tempo can feel slower as mechanics improve",
      "Contact consistency improves after 50–100 reps"
    ]);
    setUl("drillList", [
      "Step-Through Drill",
      "Pump to P6 Drill",
      "Alignment Stick Side-Bend"
    ]);

    byId("coachCopy").textContent =
      "Great foundation. Build verticals sooner and keep side-bend into P6. Expect straighter starts as face matches path.";
  }

  function showPending(msg) {
    const p = byId("pending");
    if (!p) return;
    p.style.display = "";
    p.innerHTML = `<div class="mono">${msg}</div>`;
  }

  function render(data) {
    if (data?.report) renderShapeB(data.report);
    else if ("swingScore" in data || "p_checkpoints" in data) renderShapeVC(data);
    else renderShapeA(data);

    const pending = byId("pending"), report = byId("report");
    if (pending) pending.style.display = "none";
    if (report) report.style.display = "";
  }

  async function init() {
    const params = qs();
    // Your flow uses uploads/<date>/demo.mov; keep that default to match S3 keys you write
    const key = params.key || "uploads/demo.mov";
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

  function title(s){ return (s||"").replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase()); }
  function nice(s){ return (s||"").replace(/[-_]/g," ").replace(/\b\w/g,m=>m.toUpperCase()); }
})();
=======
﻿<PASTE THE NEW JS FROM MY LAST MESSAGE HERE>
>>>>>>> Stashed changes
