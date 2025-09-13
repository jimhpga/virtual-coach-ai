module.exports = (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<meta charset="utf-8">
<title>Mini Report</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:24px;line-height:1.35}
  h1{margin:0 0 4px 0} .muted{color:#666}
  .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:16px}
  .card{border:1px solid #e3e3e3;border-radius:10px;padding:12px}
  .err{color:#b00020;font-weight:600;margin-top:8px}
  code{background:#f5f5f5;padding:2px 6px;border-radius:6px}
</style>
<h1>Swing Report — P1–P9</h1>
<div class="muted" id="meta"></div>
<div class="err" id="err"></div>
<p class="muted">Debug key: <code id="dbg"></code></p>

<div class="grid">
  <div class="card"><h3>Top 3 Priority Fixes</h3><ul id="prio"></ul></div>
  <div class="card"><h3>Top 3 Power Fixes</h3><ul id="power"></ul></div>
  <div class="card"><h3>Coaching Card</h3><div id="coach"></div></div>
  <div class="card"><h3>Position Consistency</h3><ul id="pos"></ul></div>
  <div class="card"><h3>Swing Consistency</h3><div id="swing"></div></div>
  <div class="card"><h3>Power Score Summary</h3><div id="psum"></div></div>
</div>

<script>
(async function(){
  const qs   = new URL(location.href).searchParams;
  const key  = qs.get('key')      || localStorage.getItem('KEY')       || '';
  const obj  = qs.get('objKey')   || localStorage.getItem('ReportKey') || '';
  const cid  = qs.get('clientId') || localStorage.getItem('ClientId')  || '';

  function $(id){ return document.getElementById(id) }
  function li(t){ const e=document.createElement('li'); e.textContent=t; return e }

  if(!key){ $('err').textContent='Missing API key (?key=...)'; return }
  if(!obj && !cid){ $('err').textContent='Provide ?objKey=… or ?clientId=…'; return }

  // Resolve objKey if only clientId
  let objKey = obj;
  if(!objKey && cid){
    const r0 = await fetch('/api/latest?clientId=' + encodeURIComponent(cid), {headers:{'x-api-key':key}});
    const j0 = await r0.json(); objKey = j0.key;
  }
  $('dbg').textContent = objKey || '(none)';

  // Helper fetch (compat first, then raw)
  async function get(u){
    const r = await fetch(u, {headers:{'x-api-key':key, 'cache-control':'no-store'}});
    const t = await r.text(); try { return JSON.parse(t) } catch { return {ok:false, parseError:t} }
  }
  const uCompat = '/api/report-compat?objKey=' + encodeURIComponent(objKey);
  const uRaw    = '/api/reports?objKey='       + encodeURIComponent(objKey);

  let j = await get(uCompat);
  if(!j?.ok || !j?.data?.report){ j = await get(uRaw) }

  const r = j?.data?.report || j?.report || null;
  if(!r){ $('err').textContent='No report fields found'; console.log('payload:', j); return }

  // meta
  const date = r.meta?.date || r.date || '';
  const swings = r.meta?.swings ?? r.swings ?? '';
  const mode = r.meta?.mode || r.mode || '';
  const score = r.swingScore ?? r.power?.score ?? '';
  $('meta').textContent = [date, mode && ('Mode: ' + mode), swings && ('Swings: ' + swings), score && ('Score: ' + score)]
    .filter(Boolean).join(' • ');

  // lists
  (r.top3PriorityFixes || r.priorityFixes || []).forEach(x => $('prio').appendChild(li(x.title || x.detail || x)));
  (r.top3PowerFixes    || r.powerFixes    || []).forEach(x => $('power').appendChild(li(x.title || x.detail || x)));
  $('coach').textContent = (r.coachingCard && (r.coachingCard.summary || r.coachingCard)) || '';

  const pos = r.positionConsistency || r.consistency?.position || r.consistency?.positions || r.phases || [];
  pos.forEach(p => $('pos').appendChild(li((p.position||p.pos||p.id||p.name||'?') + ': ' + (p.value ?? p.score ?? ''))));

  const sv = r.swingConsistency?.value ?? r.consistency?.swing ?? '';
  $('swing').textContent = sv ? ('Value: ' + sv) : '';

  const pv = r.powerScoreSummary?.value ?? r.power?.score ?? (typeof r.power==='number'?r.power:'');
  $('psum').textContent = pv ? ('Value: ' + pv) : '';
})();
</script>`);
};
