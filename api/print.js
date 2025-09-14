module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, "http://local");
    if (url.searchParams.get("probe") === "1") {
      res.setHeader("X-Print-Rev", "r8");
      return res.status(200).send("print alive");
    }

    const key = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
    const obj = url.searchParams.get("objKey") || "";
    if (!key || !obj) return res.status(400).send("Missing key or objKey");

    const origin = process.env.PRINT_ORIGIN || `https://${req.headers["x-forwarded-host"] || req.headers.host}`;

    // Timeout to avoid hanging
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    const r = await fetch(`${origin}/api/report-compat?objKey=${encodeURIComponent(obj)}`, {
      headers: { "x-api-key": key },
      signal: ctrl.signal
    }).catch(e => ({ ok:false, status: 599, _err: e }));

    clearTimeout(timer);

    if (!r || !r.ok) {
      const status = r?.status ?? 599;
      const body   = r?._err?.message || (await (async () => { try { return await r.text(); } catch { return "" } })());
      return res.status(502).send(`/api/report-compat failed: ${status}\n${body}`);
    }

    const text = await r.text();
    let j; try { j = JSON.parse(text) } catch {
      return res.status(502).send("compat not JSON:\n" + text);
    }

    const rep = j?.data?.report;
    if (!rep) return res.status(404).send("No report fields.");

    const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));

    const meta = [
      rep.date || "",
      rep.mode ? `Mode: ${rep.mode}` : "",
      (rep.swings ?? "") ? `Swings: ${rep.swings}` : "",
      (rep.swingScore ?? "") ? `Score: ${rep.swingScore}` : "",
    ].filter(Boolean).join(" • ");

    // Normalize phases to include short/long/status/url consistently
    const phases = (rep.phases || []).map(p => ({
      id:     p.id    ?? p.pos ?? p.position ?? "",
      title:  p.title ?? p.name ?? "",
      short:  p.short ?? p.label ?? p.note ?? "",
      long:   p.long  ?? p.description ?? p.detail ?? "",
      status: (p.status ?? p.color ?? (
        (typeof p.score === "number") ? (p.score >= 80 ? "green" : (p.score >= 60 ? "yellow" : "red")) : ""
      )),
      url:    p.url   ?? p.video ?? p.href
    }));

    const renderPhases = () => {
      return phases.map(p => {
        const badge = p.status ? `<span class="badge ${p.status}">${(p.status || "").toUpperCase()}</span>` : "";
        const head  = [p.id, p.title].filter(Boolean).join(" ").trim();
        const short = esc(p.short || "");
        const more  = p.long ? `<details><summary>Details</summary><div>${esc(p.long)}</div></details>` : "";
        const linkOpen  = p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">` : "";
        const linkClose = p.url ? `</a>` : "";
        return `<li>${badge}${linkOpen}${esc(head)}${linkClose}${short ? ` — ${short}` : ""}${more}</li>`;
      }).join("");
    };

    const li = arr => (arr || []).map(x => {
      const s = (typeof x === "string") ? x : (x.title || x.detail || JSON.stringify(x));
      return `<li>${esc(s)}</li>`;
    }).join("");

    const posList = (rep.positionConsistency || []).map(p => {
      const pos = p.position || p.pos || p.id || "";
      const val = (p.value ?? p.score ?? "");
      return `<li>${esc(pos)}: ${esc(val)}</li>`;
    }).join("");

    const swingVal = rep.swingConsistency?.value ?? rep.consistency?.swing ?? "";
    const powerVal = rep.powerScoreSummary?.value ?? rep.power?.score ?? rep.power ?? "";

    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.setHeader("X-Print-Rev","r8");
    return res.status(200).send(`<!doctype html>
<meta charset="utf-8"><title>Swing Report — P1–P9</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial;margin:24px}
  h2{margin:0 0 6px}
  .muted{color:#555;margin:0 0 16px}
  .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
  .card{border:1px solid #ddd;border-radius:10px;padding:12px}
  ul{margin:8px 0 0 18px}
  .badge{display:inline-block;font-size:12px;padding:2px 6px;border-radius:6px;margin-right:6px;border:1px solid #ccc}
  .badge.green {background:#d1fae5;border-color:#a7f3d0;color:#065f46}
  .badge.yellow{background:#fef9c3;border-color:#fde68a;color:#854d0e}
  .badge.red   {background:#fee2e2;border-color:#fecaca;color:#991b1b}
  details{margin-top:6px}
  details>summary{cursor:pointer;user-select:none;list-style:none}
  details>summary::-webkit-details-marker{display:none}
  .debug{margin-top:8px;color:#777;font-size:12px}
</style>
<h2>Swing Report — P1–P9</h2>
<p class="muted">${esc(meta)}</p>
<p class="debug"><small>Debug key: ${esc(obj)}</small></p>

<div class="grid">
  <div class="card"><h3>Top 3 Priority Fixes</h3><ul>${li(rep.top3PriorityFixes || rep.priorityFixes)}</ul></div>
  <div class="card"><h3>Top 3 Power Fixes</h3><ul>${li(rep.top3PowerFixes || rep.powerFixes)}</ul></div>
  <div class="card"><h3>Coaching Card</h3><div>${esc((rep.coachingCard && (rep.coachingCard.summary || rep.coachingCard)) || "")}</div></div>
  <div class="card"><h3>Position Consistency</h3><ul>${posList}</ul></div>
  <div class="card"><h3>Swing Consistency</h3><div>${swingVal ? `Value: ${esc(swingVal)}` : ""}</div></div>
  <div class="card"><h3>Power Score Summary</h3><div>${powerVal ? `Value: ${esc(powerVal)}` : ""}</div></div>
  <div class="card"><h3>P1–P9 Phases</h3><ul>${renderPhases()}</ul></div>
</div>`);
  } catch (e) {
    console.error("PRINT_ERROR", e);
    res.setHeader("Content-Type","text/plain; charset=utf-8");
    return res.status(500).send("print error: " + (e?.message || e));
  }
};
module.exports.config = { maxDuration: 10 };
