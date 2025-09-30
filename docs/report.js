// docs/report.js — robust renderer that replaces placeholders and draws meters
(function () {
  "use strict";

  // ---------- helpers ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) =>
    (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
    }[c]));

  const clamp100 = (x) => Math.max(0, Math.min(100, x | 0));
  const li = (s) => `<li>${s}</li>`;
  const ul = (items) => `<ul class="vc-list">${items.filter(Boolean).join("")}</ul>`;

  // Find a card by its <h3> title, **remove all placeholder content after <h3>**, and inject ours.
  function putInCard(title, html) {
    const h3 = $$(".card h3").find(
      (h) => h.textContent.trim().toLowerCase() === title.toLowerCase()
    );
    if (!h3) return false;
    const card = h3.closest(".card");
    // Create a real “content” slot right after the h3 and clear what was there.
    let slot = $(".content", card);
    if (!slot) {
      slot = document.createElement("div");
      slot.className = "content";
      while (h3.nextSibling) card.removeChild(h3.nextSibling); // nuke placeholders
      h3.after(slot);
    } else {
      slot.innerHTML = "";
    }
    slot.innerHTML = html || "";
    card.classList.add("filled");
    return true;
  }

  // Tiny meters (bars), no libs
  function meter(label, val) {
    let num = (typeof val === "number") ? clamp100(val) : null;
    const txt = (num == null ? esc(val ?? "-") : `${num}%`);
    const w = (num == null ? 0 : num);
    return `
      <div class="vc-meter">
        <div class="vc-meter-row">
          <div class="vc-meter-label">${esc(label || "")}</div>
          <div class="vc-meter-bar"><span style="width:${w}%"></span></div>
          <div class="vc-meter-val">${txt}</div>
        </div>
      </div>`;
  }

  // Inject CSS once
  function ensureCSS() {
    if ($("#vc-meter-css")) return;
    const css = document.createElement("style");
    css.id = "vc-meter-css";
    css.textContent = `
      body.loaded .card{ background:rgba(255,255,255,.05) }           /* tone down skeleton grey */
      .card.filled .content:empty{min-height:0}
      .vc-list{margin:6px 0 0 18px; padding:0}
      .vc-meter{margin:6px 0 10px 0}
      .vc-meter-row{display:grid; grid-template-columns: 140px 1fr 48px; align-items:center; gap:10px}
      .vc-meter-label{opacity:.9; font-weight:600}
      .vc-meter-bar{height:8px; background:rgba(255,255,255,.12); border-radius:999px; overflow:hidden}
      .vc-meter-bar > span{display:block; height:100%; background:#5fd4a4}
      .vc-meter-val{text-align:right; font-variant-numeric:tabular-nums; opacity:.9}
      .vc-fault{margin:8px 0 10px 0; padding-left:2px}
      .vc-fault h4{margin:0 0 2px 0; font-size:14px}
      .vc-fault small{opacity:.7}
      .vc-drill{margin:10px 0 14px 0}
      .vc-drill h4{margin:0 0 4px 0; font-size:14px}
      .vc-steps{margin:4px 0 0 18px}
    `;
    document.head.appendChild(css);
  }

  // Header text used by report.html
  function setHeader(j) {
    const get = (a, b, c) => a ?? b ?? c ?? "";
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText("date",       get(j.date, j.header?.date));
    setText("modeLabel",  get(j.mode, j.header?.mode, "Full Swing"));
    setText("swingCount", get(j.swings, j.header?.swings, ""));
  }

  // Sections
  function renderP1P9(j) {
    const seq = j.p1p9 || j.p1ToP9 || [];
    const el = document.getElementById("plist");
    if (el && seq.length) {
      el.innerHTML = seq.map(x => `<div class="row"><strong>${esc(x.p||"")}</strong> — ${esc(x.note||"")}</div>`).join("");
      el.closest(".card")?.classList.add("filled");
    }
  }

  function renderPositionConsistency(j) {
    const pos = j.position_consistency || j.positionConsistency;
    if (!pos) return;
    let html = "";
    if (pos.overall != null) html += meter("Overall", pos.overall);
    const by = pos.by_position || pos.byPosition || [];
    if (by.length) html += ul(by.map(x => li(`<strong>${esc(x.p)}</strong> — ${esc(x.score)}%`)));
    putInCard("Position Consistency", html);
  }

  function renderSwingConsistency(j) {
    const sw = j.swing_consistency || j.swingConsistency;
    if (!sw) return;
    let html = "";
    if (sw.tempo != null) html += ul([li(`Tempo Ratio — <strong>${esc(sw.tempo)}</strong>`)]); // text ratio
    if (sw.variance != null) html += meter("Variance", sw.variance);
    if (sw.stability != null) html += meter("Stability", sw.stability);
    putInCard("Swing Consistency", html);
  }

  function renderPower(j) {
    const p = j.power_score_summary || j.powerScoreSummary || j.power;
    if (!p) return;
    const total = p.total ?? p.value ?? p.score;
    const comps = p.components || [];
    let html = "";
    if (total != null) html += meter("Total", total);
    if (Array.isArray(comps) && comps.length) {
      html += comps.map(c => meter(c.name || "Score", c.score)).join("");
    }
    putInCard("Power Score Summary", html);
  }

  function renderTop3s(j) {
    const f  = j.fundamentals_top3 || j.top3Fundamentals || j.top_3_fundamentals || [];
    const pe = j.power_errors_top3 || j.top3PowerErrors || j.top_3_power_errors || [];
    const qf = j.quick_fixes_top3 || j.top3QuickFixes || j.top_3_quick_fixes || [];

    if (f.length)  putInCard("Top 3 Fundamentals", ul(f.map(x => li(esc(x.label || x)))));
    if (pe.length) putInCard("Top 3 Power Errors", ul(pe.map(x => li(`<strong>${esc(x.label||"")}</strong>${x.evidence?.length ? ": " + esc(x.evidence.join(", ")) : ""}`))));
    if (qf.length) putInCard("Top 3 Quick Fixes", ul(qf.map(x => li(esc(x.label || x)))));
  }

  function renderFaults(j) {
    const faults = j.faults || [];
    if (!faults.length) return;
    const html = faults.map((f, i) => `
      <div class="vc-fault">
        <h4>${i + 1}. ${esc(f.code || "")} — <small>${esc(f.why || "")}</small></h4>
        ${f.evidence?.length ? ul(f.evidence.map(e => li(esc(e)))) : ""}
      </div>
    `).join("");
    putInCard("Faults", html);
  }

  function renderDrills(j) {
    const drills = j.drills || [];
    if (!drills.length) return;
    const html = drills.map(d => `
      <div class="vc-drill">
        <h4>${esc(d.title || d.id || "Drill")}</h4>
        ${d.cue ? `<div><small>Cue:</small> ${esc(d.cue)}</div>` : ""}
        ${Array.isArray(d.steps) && d.steps.length ? `<ol class="vc-steps">${d.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
        ${d.reps ? `<div><small>Reps:</small> ${esc(d.reps)}</div>` : ""}
      </div>
    `).join("");
    putInCard("Drills", html);
  }

  async function boot() {
    ensureCSS();
    try {
      const q = new URLSearchParams(location.search);
      const src = q.get("report") || "/reports/latest.json"; // works on GitHub Pages too
      const r = await fetch(src, { cache: "no-store" });
      const j = await r.json();
      window.__lastReport = j;

      // header + sections
      setHeader(j);
      renderP1P9(j);
      renderPositionConsistency(j);
      renderSwingConsistency(j);
      renderPower(j);
      renderTop3s(j);
      renderFaults(j);
      renderDrills(j);

      document.body.classList.add("loaded");
    } catch (e) {
      console.error("report.js boot failed:", e);
      const box = document.createElement("pre");
      box.style.cssText = "white-space:pre-wrap;padding:12px;margin:12px;border:1px solid #c33;background:#200;color:#fbd";
      box.textContent = "Report load error:\n" + (e && e.stack || e);
      document.body.prepend(box);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
