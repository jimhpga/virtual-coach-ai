module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const key = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
  const obj = url.searchParams.get("objKey") || "";
  if(!key || !obj) return res.status(400).send("Missing key or objKey");

  const compat = await fetch(`https://${req.headers.host}/api/report-compat?objKey=${encodeURIComponent(obj)}`, {
    headers: { "x-api-key": key }
  });
  const j = await compat.json();
  const rep = j?.data?.report || {};
  const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  res.setHeader("Content-Type","text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<meta charset="utf-8"><title>Mini Report</title>
<style>
 body{font-family:system-ui,Segoe UI,Arial;margin:24px} h2{margin:0 0 8px} .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
 .card{border:1px solid #ddd;border-radius:10px;padding:12px}
</style>
<h2>Swing Report — P1–P9</h2>
<p><b>Score:</b> ${esc(rep.swingScore)}</p>
<p><small>Debug key: ${esc(obj)}</small></p>
<div class="grid">
  <div class="card"><h3>Top 3 Priority Fixes</h3><ul>${
    (rep.top3PriorityFixes||rep.priorityFixes||[]).map(x=>{
      const s = (typeof x==="string")?x:(x.title||x.detail||JSON.stringify(x));
      return `<li>${esc(s)}</li>`}).join("")}</ul></div>
  <div class="card"><h3>Top 3 Power Fixes</h3><ul>${
    (rep.top3PowerFixes||rep.powerFixes||[]).map(x=>{
      const s = (typeof x==="string")?x:(x.title||x.detail||JSON.stringify(x));
      return `<li>${esc(s)}</li>`}).join("")}</ul></div>
  <div class="card"><h3>Coaching Card</h3><div>${esc((rep.coachingCard&& (rep.coachingCard.summary||rep.coachingCard))||"")}</div></div>
  <div class="card"><h3>Position Consistency</h3><ul>${
    (rep.positionConsistency||[]).map(p=>{
      const pos = p.position||p.pos||p.id||"";
      const val = (p.value??p.score??"");
      return `<li>${esc(pos)}: ${esc(val)}</li>`}).join("")}</ul></div>
  <div class="card"><h3>Swing Consistency</h3><div>${
    (rep.swingConsistency?.value ?? rep.consistency?.swing ?? "") ? `Value: ${esc(rep.swingConsistency?.value ?? rep.consistency?.swing)}` : ""}</div></div>
  <div class="card"><h3>Power Score Summary</h3><div>${
    (rep.powerScoreSummary?.value ?? rep.power?.score ?? rep.power ?? "") ? `Value: ${esc(rep.powerScoreSummary?.value ?? rep.power?.score ?? rep.power)}` : ""}</div></div>
</div>
<details style="margin-top:16px"><summary>Raw normalized JSON</summary><pre>${esc(JSON.stringify(rep, null, 2))}</pre></details>`);
};
