(() => {
  // ===== CONFIG =====
  const BUCKET = "virtualcoachai-prod";
  const REGION = "us-west-2"; // use "us-east-1" if that’s your bucket
  // ==================

  const $ = (s) => document.querySelector(s);
  const id = new URL(location.href).searchParams.get("id");
  const status = $("#status");
  const view = $("#view");

  $("#copyLink").onclick = async () => {
    await navigator.clipboard.writeText(location.href);
    status.textContent = "🔗 Link copied.";
  };
  $("#refresh").onclick = () => location.reload();

  function s3UrlFor(id) {
    return REGION === "us-east-1"
      ? `https://${BUCKET}.s3.amazonaws.com/reports/${encodeURIComponent(id)}.json?cb=${Date.now()}`
      : `https://${BUCKET}.s3.${REGION}.amazonaws.com/reports/${encodeURIComponent(id)}.json?cb=${Date.now()}`;
  }

  async function fetchOnce(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const txt = await res.text();
    return JSON.parse(txt.trim().replace(/^\uFEFF/, ""));
  }

  // ---- NORMALIZER: adapts your current JSON to the viewer shape
  function normalizeReport(d) {
    const out = { ...d };

    // client -> top-level
    if (out.client) {
      if (out.swings == null && out.client.swings != null) out.swings = out.client.swings;
      if (!out.discipline && out.client.mode) out.discipline = out.client.mode;
      if (!out.client.id) out.client.id = "player";
    } else {
      out.client = { id: "player" };
    }

    // p1p9 -> phases
    if (!Array.isArray(out.phases) && Array.isArray(out.p1p9)) {
      out.phases = out.p1p9.map(row => {
        const [pid, name, desc] = row;
        return { id: pid || "", name: name || "", short: desc || "", long: desc || "" };
      });
    }
    if (!Array.isArray(out.phases)) out.phases = [];

    // highlights/drills -> coaching cards
    if (!out.coaching) out.coaching = {};
    if (!Array.isArray(out.coaching.priority_fixes) && Array.isArray(out.highlights)) {
      out.coaching.priority_fixes = out.highlights.map(t => ({ title: t, short: "", long: "" }));
    }
    if (!Array.isArray(out.coaching.power_fixes) && Array.isArray(out.drills)) {
      out.coaching.power_fixes = out.drills.map(dr => ({
        title: dr.name || dr.code || "Drill",
        short: dr.why || "",
        long: dr.how || "",
        ref: dr.url || dr.video_url || ""
      }));
    }
    if (!Array.isArray(out.coaching.priority_fixes)) out.coaching.priority_fixes = [];
    if (!Array.isArray(out.coaching.power_fixes)) out.coaching.power_fixes = [];

    // safe defaults
    if (!Array.isArray(out.position_metrics)) out.position_metrics = [];
    if (!Array.isArray(out.swing_metrics)) out.swing_metrics = [];
    if (!out.power) out.power = { score: 0, tempo: "—", release_timing: 0 };

    return out;
  }

  function render(dataRaw) {
    const data = normalizeReport(dataRaw);
    status.textContent = "✅ Report loaded.";
    const phases = data.phases.map(p => `<li><b>${p.id} ${p.name}:</b> ${p.short}</li>`).join("") || "<li>—</li>";
    const prio = data.coaching.priority_fixes.map(x => `<li>${x.title}</li>`).join("") || "<li>—</li>";
    const powr = data.coaching.power_fixes.map(x => `<li><b>${x.title}:</b> ${x.short || x.long}</li>`).join("") || "<li>—</li>";

    view.innerHTML = `
      <div><b>Client:</b> ${data.client.id} • <b>Mode:</b> ${data.discipline || "—"} • <b>Swings:</b> ${data.swings ?? "—"}</div>
      <div class="card">
        <h3>P1–P9</h3>
        <ol>${phases}</ol>
      </div>
      <div class="card">
        <h3>Highlights</h3>
        <ul>${(data.highlights||[]).map(h=>`<li>${h}</li>`).join("") || "<li>—</li>"}</ul>
      </div>
      <div class="card">
        <h3>Coaching — Priority Fixes</h3>
        <ul>${prio}</ul>
      </div>
      <div class="card">
        <h3>Coaching — Power Fixes</h3>
        <ul>${powr}</ul>
      </div>
      <div class="card">
        <h3>Power Summary</h3>
        <div>Score: ${data.power.score ?? 0}% • Tempo: ${data.power.tempo || "—"} • Release: ${data.power.release_timing ?? 0}%</div>
      </div>
    `;
  }

  async function boot() {
    if (!id) {
      status.textContent = "❌ Missing ?id=… in URL.";
      return;
    }
    const url = s3UrlFor(id);
    try {
      const d = await fetchOnce(url);
      render(d);
    } catch {
      status.textContent = "⏳ Processing… (auto-refreshing every 30s)";
      // poll until present
      const tick = async () => {
        try {
          const d = await fetchOnce(s3UrlFor(id));
          render(d);
        } catch {
          setTimeout(tick, 30000);
        }
      };
      setTimeout(tick, 30000);
    }
  }

  boot();
})();
