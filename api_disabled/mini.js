module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const key = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
  const objFromQuery = url.searchParams.get("objKey") || "";
const cid = url.searchParams.get("clientId") || "";
let obj = objFromQuery;
  if(!key) return res.status(400).send("Missing key");
if(!obj && cid){
  const r0 = await fetch(`https://${req.headers.host}/api/latest?clientId=${encodeURIComponent(cid)}`, { headers:{ "x-api-key":key } });
  const j0 = await r0.json(); obj = j0?.key || "";
}
if(!obj) return res.status(400).send("Missing objKey");

  const compat = await fetch(`https://${req.headers.host}/api/report-compat?objKey=${encodeURIComponent(obj)}`, {
    headers: { "x-api-key": key }
  });
  const t = await compat.text();
  let j; try { j = JSON.parse(t) } catch { return res.status(502).send("Bad JSON from report-compat: "+t) }
  const rep = j?.data?.report || {};

  const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const li  = s => `<li>${esc(s)}</li>`;
  const list = arr => (arr||[]).map(x => li(typeof x==='string' ? x : (x.title||x.detail||JSON.stringify(x)))).join('');
  const posList = (rep.positionConsistency||[]).map(p => li(`${p.position||p.pos||p.id||''}: ${p.value??p.score??''}`)).join('');
  const phases  = (rep.phases||[]).map(p => {
    const id    = p.id || p.position || p.pos || '';
    const title = p.title || p.name || '';
    const label = p.label || p.note || '';
    const url   = p.url || p.video;
    const link  = url ? ` <a href="${esc(url)}" target="_blank" rel="noopener">watch</a>` : '';
    return `<li><b>${esc(id)}</b> ${esc(title)}${label?` — ${esc(label)}`:''}${link}</li>`;
  }).join('');

  res.setHeader("Content-Type","text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<meta charset="utf-8"><title>Mini Report</title>
<style>
 body{font-family:system-ui,Segoe UI,Arial;margin:24px}
 h2{margin:0 0 8px}
 .sub{margin:0 0 12px;color:#555}
 .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
 .card{border:1px solid #ddd;border-radius:10px;padding:12px}
</style>
<h2>Swing Report — P1–P10</h2>
<p class="sub">${esc(rep.date||'')} • Mode: ${esc(rep.mode||'')} • Swings: ${esc(rep.swings??'')} • <b>Score: ${esc(rep.swingScore??'')}</b></p>
<p><small>Debug key: ${esc(obj)}</small></p>
<div class="grid">
  <div class="card"><h3>Top 3 Priority Fixes</h3><ul>${list(rep.top3PriorityFixes||rep.priorityFixes)}</ul></div>
  <div class="card"><h3>Top 3 Power Fixes</h3><ul>${list(rep.top3PowerFixes||rep.powerFixes)}</ul></div>
  <div class="card"><h3>Coaching Card</h3><div>${esc((rep.coachingCard && (rep.coachingCard.summary||rep.coachingCard))||"")}</div></div>
  <div class="card"><h3>Position Consistency</h3><ul>${posList}</ul></div>
  <div class="card"><h3>Swing Consistency</h3><div>${(rep.swingConsistency?.value ?? rep.consistency?.swing ?? "") ? `Value: ${esc(rep.swingConsistency?.value ?? rep.consistency?.swing)}` : ""}</div></div>
  <div class="card"><h3>Power Score Summary</h3><div>${(rep.powerScoreSummary?.value ?? rep.power?.score ?? rep.power ?? "") ? `Value: ${esc(rep.powerScoreSummary?.value ?? rep.power?.score ?? rep.power)}` : ""}</div></div>
  <div class="card"><h3>P1–P10 Phases</h3><ol>${phases}</ol></div>
</div>
<details style="margin-top:16px"><summary>Raw normalized JSON</summary><pre>${esc(JSON.stringify(rep,null,2))}</pre></details>`);
};

