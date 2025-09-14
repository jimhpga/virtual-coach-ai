module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, 'http://local');
    if (url.searchParams.get('probe') === '1') {
      res.setHeader('X-Print-Rev', 'r7');
      return res.status(200).send('print alive');
    }

    const key = (req.headers['x-api-key'] || url.searchParams.get('key') || '').toString();
    const obj = url.searchParams.get('objKey') || '';
    if (!key || !obj) return res.status(400).send('Missing key or objKey');

    const origin = process.env.PRINT_ORIGIN || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;

    // 8s timeout to avoid hanging / cold-start issues
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    const r = await fetch(`${origin}/api/report-compat?objKey=${encodeURIComponent(obj)}`, {
      headers: { 'x-api-key': key },
      signal: ctrl.signal
    }).catch(e => ({ ok:false, status: 599, _err: e }));

    clearTimeout(timer);

    if (!r || !r.ok) {
      const status = r?.status ?? 599;
      const body   = r?._err?.message || (await (async () => { try { return await r.text(); } catch { return '' } })());
      return res.status(502).send(`/api/report-compat failed: ${status}\n${body}`);
    }

    const text = await r.text();
    let j; try { j = JSON.parse(text) } catch {
      return res.status(502).send('compat not JSON:\n' + text);
    }

    const rep = j?.data?.report;
    if (!rep) return res.status(404).send('No report fields.');

    const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const meta = [
      rep.date || '',
      rep.mode ? `Mode: ${rep.mode}` : '',
      (rep.swings ?? '') ? `Swings: ${rep.swings}` : '',
      (rep.swingScore ?? '') ? `Score: ${rep.swingScore}` : '',
    ].filter(Boolean).join(' • ');

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('X-Print-Rev','r7');
    return res.status(200).send(`<!doctype html>
<meta charset="utf-8"><title>Swing Report — P1–P9</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial;margin:24px}
  h2{margin:0 0 6px} .muted{color:#555;margin:0 0 16px}
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
</style>
<h2>Swing Report — P1–P9</h2>
<p class="muted">${esc(meta)}</p>
<p><small>Debug key: ${esc(obj)}</small></p>
<div class="grid">
  <div class="card"><h3>Top 3 Priority Fixes</h3><ul>${
    (rep.top3PriorityFixes||rep.priorityFixes||[]).map(x=>{
      const s = (typeof x==='string')?x:(x.title||x.detail||JSON.stringify(x));
      return `<li>${esc(s)}</li>`}).join('')}</ul></div>
  <div class="card"><h3>Top 3 Power Fixes</h3><ul>${
    (rep.top3PowerFixes||rep.powerFixes||[]).map(x=>{
      const s = (typeof x==='string')?x:(x.title||x.detail||JSON.stringify(x));
      return `<li>${esc(s)}</li>`}).join('')}</ul></div>
  <div class="card"><h3>Coaching Card</h3><div>${
    esc((rep.coachingCard && (rep.coachingCard.summary || rep.coachingCard)) || '')}</div></div>
  <div class="card"><h3>Position Consistency</h3><ul>${
    (rep.positionConsistency||[]).map(p=>{
      const pos = p.position||p.pos||p.id||'';
      const val = (p.value??p.score??'');
      return `<li>${esc(pos)}: ${esc(val)}</li>`}).join('')}</ul></div>
  <div class="card"><h3>Swing Consistency</h3><div>${
    (rep.swingConsistency?.value ?? rep.consistency?.swing ?? '') ? `Value: ${esc(rep.swingConsistency?.value ?? rep.consistency?.swing)}` : ''}</div></div>
  <div class="card"><h3>Power Score Summary</h3><div>${(Number.isFinite(rep?.powerScoreSummary?.value)
  ? `Value: ${esc(rep.powerScoreSummary.value)}`
  : Number.isFinite(rep?.power?.score)
    ? `Value: ${esc(rep.power.score)}`
    : (typeof rep?.power === 'number'
        ? `Value: ${esc(rep.power)}`
        : ''))}</div></div>
</div>`);
  } catch (e) {
    console.error('PRINT_ERROR', e);
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    return res.status(500).send('print error: ' + (e?.message || e));
  }
};
module.exports.config = { maxDuration: 10 };



