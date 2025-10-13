// public/report.client.js  (v5)
(() => {
  const qs = new URLSearchParams(location.search);
  const key = qs.get("key") || "demo.mov";
  const demo = qs.get("demo"); // "1" if present

  // ---------- helpers ----------
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  function ensureListAfterHeading(headingText, preferId) {
    // Prefer a specific container ID if your newer report.html has it.
    if (preferId && byId(preferId)) return byId(preferId);

    // Otherwise find any element that looks like a section heading and insert a list after it.
    const h = $$(".wrap *")
      .find((el) => {
        const t = (el.textContent || "").trim().toLowerCase();
        return (
          ["h2", "h3", "div", "span", "p"].includes(el.tagName.toLowerCase()) &&
          t.includes(headingText.toLowerCase())
        );
      });

    if (!h) {
      // Fallback to a container near bottom if nothing found
      const fallback = document.createElement("ul");
      document.body.appendChild(fallback);
      return fallback;
    }

    // If next sibling is already a list, reuse it.
    const next = h.nextElementSibling;
    if (next && /^(ul|ol)$/i.test(next.tagName)) return next;

    const list = document.createElement("ul");
    list.style.margin = "8px 0 0 0";
    list.style.paddingLeft = "18px";
    h.insertAdjacentElement("afterend", list);
    return list;
  }

  function setList(listEl, items) {
    if (!listEl) return;
    listEl.innerHTML = "";
    (items || []).forEach((txt) => {
      const li = document.createElement("li");
      li.textContent = txt;
      listEl.appendChild(li);
    });
  }

  function fillBars(summary) {
    // Works only if your newer report.html has these IDs; otherwise skip.
    const pwrBar = byId("pwrBar");
    const consBar = byId("consBar");
    const pwrLbl = byId("pwrLbl");
    const consLbl = byId("consLbl");
    if (summary?.powerScore != null && pwrBar) {
      const v = Math.max(0, Math.min(100, Number(summary.powerScore)));
      pwrBar.style.width = `${v}%`;
      if (pwrLbl) pwrLbl.textContent = `${v}`;
    }
    if (summary?.consistency != null && consBar) {
      const v = Math.max(0, Math.min(100, Number(summary.consistency)));
      consBar.style.width = `${v}%`;
      if (consLbl) consLbl.textContent = `${v}`;
    }
  }

  function setTextAfterHeading(headingText, copy, preferId) {
    if (preferId && byId(preferId)) {
      byId(preferId).textContent = copy ?? "";
      return;
    }
    const h = $$(".wrap *").find((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      return (
        ["h2", "h3", "div", "span", "p"].includes(el.tagName.toLowerCase()) &&
        t.includes(headingText.toLowerCase())
      );
    });
    if (!h) return;
    const p = document.createElement("p");
    p.textContent = copy ?? "";
    p.style.margin = "8px 0 0 0";
    h.insertAdjacentElement("afterend", p);
  }

  // ---------- fetch + render ----------
  async function fetchReport() {
    const url = new URL("/api/report", location.origin);
    url.searchParams.set("key", key);
    if (demo) url.searchParams.set("demo", demo);
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  function render(payload) {
    // Shape for demo
    // { ok:true, source:"demo", report: { meta, checkpoints, sections:{...}, expectations, teacherVoice, badges, ... } }
    const data = payload?.report || payload;

    // Meta / header
    const metaEl = byId("meta");
    if (metaEl && data?.meta) {
      const m = data.meta;
      const bits = [];
      if (m.title) bits.push(m.title);
      if (m.date) bits.push(m.date);
      if (m.mode) bits.push(`Mode: ${m.mode}`);
      if (m.key)  bits.push(`Key: ${m.key}`);
      metaEl.textContent = bits.join(" • ");
    }

    // Bars (if present in your DOM)
    fillBars(data?.summary);

    // Sections mapping
    const S = data?.sections || {};
    setList(ensureListAfterHeading("Position Consistency", "positionConsistencyList"), S.positionConsistency);
    setList(ensureListAfterHeading("Swing Consistency", "swingConsistencyList"), S.swingConsistency);
    setList(ensureListAfterHeading("Power Score Summary", "powerScoreSummaryList"), S.powerScoreSummary);
    setList(ensureListAfterHeading("Top 3 Fundamentals", "funds"), S.fundamentalsTop3);
    setList(ensureListAfterHeading("Top 3 Power Errors", "errs"), S.powerErrorsTop3);
    setList(ensureListAfterHeading("Top 3 Quick Fixes", "fixes"), S.quickFixesTop3);
    setList(ensureListAfterHeading("Faults", "faultsList"), S.faults);
    setList(ensureListAfterHeading("Drills", "drillList"), S.drills);

    // Expectations (if you have a dedicated section)
    if (Array.isArray(data?.expectations) && data.expectations.length) {
      setList(ensureListAfterHeading("What to Expect", "exp"), data.expectations);
    }

    // Teacher voice / coach copy
    if (data?.teacherVoice?.sample) {
      setTextAfterHeading("Your Coach Says", data.teacherVoice.sample, "coachCopy");
    }

    // Badges (simple chips if a “badgeRow” exists)
    const badgeRow = byId("badgeRow");
    if (badgeRow && Array.isArray(data?.badges)) {
      badgeRow.innerHTML = "";
      data.badges.forEach((b) => {
        const span = document.createElement("span");
        span.textContent = b.title || b.id;
        span.className = "badge";
        if (!b.earned) span.style.opacity = "0.55";
        badgeRow.appendChild(span);
      });
    }

    // Done
  }

  async function init() {
    try {
      const json = await fetchReport();

      if (json?.ok) {
        render(json);
        return;
      }

      // For real analyzer path: poll while NOT_READY (demo should never hit this)
      const t0 = Date.now();
      while (json?.error === "NOT_READY") {
        if (Date.now() - t0 > 60000) {
          alert("Analysis still processing. Check back soon.");
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
        const again = await fetchReport();
        if (again?.ok) { render(again); return; }
      }

      alert(`Problem loading report: ${json?.error || "Unknown"}`);
    } catch (err) {
      console.error(err);
      alert("Problem loading the report.");
    }
  }

  init();
})();
