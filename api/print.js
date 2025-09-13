module.exports = async (req, res) => {
  try {
    const host = req.headers.host || "api.virtualcoachai.net";
    const url  = new URL(req.url, `https://${host}`);

    const key  = String(req.headers["x-api-key"] || url.searchParams.get("key") || "");
    let   obj  = url.searchParams.get("objKey") || "";
    const cid  = url.searchParams.get("clientId") || "";
    const dbg  = url.searchParams.get("debug") || "";

    if (!key) return res.status(400).send("Missing key");
    if (!obj && !cid) return res.status(400).send("Missing objKey or clientId");

    // Resolve latest if only clientId was provided
    if (!obj && cid) {
      const r0 = await fetch(`https://${host}/api/latest?clientId=${encodeURIComponent(cid)}`, {
        headers: { "x-api-key": key }
      });
      const t0 = await r0.text();
      let j0; try { j0 = JSON.parse(t0) } catch {}
      obj = j0?.key || "";
      if (!obj) return res.status(502).send(`Could not resolve latest for ${cid}. Response: ${t0}`);
    }

    // Pull normalized report
    const r1   = await fetch(`https://${host}/api/report-compat?objKey=${encodeURIComponent(obj)}`, {
      headers: { "x-api-key": key }
    });
    const txt1 = await r1.text();
    if (!r1.ok) return res.status(r1.status).send(`report-compat HTTP ${r1.status}: ${txt1}`);

    let j; try { j = JSON.parse(txt1) } catch {
      return res.status(502).send(`Bad JSON from report-compat: ${txt1}`);
    }
    const rep = j?.data?.report;
    if (!rep) return res.status(502).send(`No report in payload: ${txt1}`);

    // Helpers
    const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const phases = Array.isArray(rep.phases) ? rep.phases : [];

    res.setHeader("Content-Type","text/html; charset=utf-8");
    return res.status(200).send(`<!doctype html>
<meta charset="utf-8">
<title>Virtual Coach • Swing Report</title>
<style>
  :root { --fg:#111; --muted:#666; --line:#ddd; --brand:#0b5; }
  @media print { .noprint { display:none !important } a { color: inherit; text-decoration: none } }
  body { font: 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial; color:var(--fg); margin:24px }
  h1 { margin:0 0 6px 0; font-size:22px }
  .meta { color:var(--muted); margin-bottom:14px }
  .grid { display:grid; gap:14px; grid-template-columns: 1.2fr 1.2fr 1fr }
  .card { border:1px solid var(--line); border-radius:10px; padding:12px; break-inside: avoid }
  h3 { margin:0 0 8px 0; font-size:16px }
  ul { margin:0; padding-left:18px }
  .phases { margin-top:18px }
  .phase { border:1px solid var(--line); border-radius:10px; padding:12px; margin:10px 0; break-inside: avoid }
  .phead { display:flex; gap:8px; align-items:baseline }
  .pid { font-weight:600; color:var(--brand) }
  .ptitle { font-weight:600 }
  .pshort { margin:6px 0 4px 0 }
  .plong { color:var(--muted) }
  .plink { margin-top:6px }
  .dbg { color:var(--muted); font-size:12px; margin-top:10px; white-space:pre-wrap }
</style>

<h1>Swing Report — P1–P9</h1>
<div class="meta">${[
  rep.date || '',
  rep.mode ? \`Mode: \${rep.mode}\` : '',
  (rep.swings ?? '') ? \`Swings: \${rep.swings}\` : '',
  (rep.swingScore ?? '') ? \`Score: \${rep.swingScore}\` : ''
].filter(Boolean).join(' • ')}</div>

<div class="grid">
  <div class="card">
    <h3>Top 3 Priority Fixes</h3>
    <ul>${
      (rep.top3PriorityFixes || rep.priorityFixes || [])
      .map(x => typeof x==='string' ? x : (x.title||x.detail||JSON.stringify(x)))
      .map(s => \`<li>\${esc(s)}</li>\`).join('')
    }</ul>
  </div>

  <div class="card">
    <h3>Top 3 Power Fixes</h3>
    <ul>${
      (rep.top3PowerFixes || rep.powerFixes || [])
      .map(x => typeof x==='string' ? x : (x.title||x.detail||JSON.stringify(x)))
      .map(s => \`<li>\${esc(s)}</li>\`).join('')
    }</ul>
  </div>

  <div class="card">
    <h3>Coaching Card</h3>
    <div>${esc((rep.coachingCard && (rep.coachingCard.summary || rep.coachingCard)) || '')}</div>
  </div>

  <div class="card">
    <h3>Position Consistency</h3>
    <ul>${
      (rep.positionConsistency || [])
      .map(p => \`\${p.position||p.pos||p.id||''}: \${p.value ?? p.score ?? ''}\`)
      .map(s => \`<li>\${esc(s)}</li>\`).join('')
    }</ul>
  </div>

  <div class="card">
    <h3>Swing Consistency</h3>
    <div>${
      (rep.swingConsistency?.value ?? rep.consistency?.swing ?? '') ? \`Value: \${esc(rep.swingConsistency?.value ?? rep.consistency?.swing)}\` : ''
    }</div>
  </div>

  <div class="card">
    <h3>Power Score Summary</h3>
    <div>${
      (rep.powerScoreSummary?.value ?? rep.power?.score ?? rep.power ?? '') ? \`Value: \${esc(rep.powerScoreSummary?.value ?? rep.power?.score ?? rep.power)}\` : ''
    }</div>
  </div>
</div>

<div class="phases">
  <h3>P1–P9 Phases</h3>
  ${ (Array.isArray(phases) ? phases : []).map(p => {
      const id    = p.id    ?? p.position ?? p.pos ?? '';
      const title = p.title ?? p.name     ?? '';
      const label = p.label ?? p.note     ?? '';
      const short = p.short ?? p.summary  ?? '';
      const long  = p.long  ?? p.detail   ?? p.description ?? p.explanation ?? '';
      const url   = p.url   ?? p.video    ?? '';
      const yt    = url && /^(https?:)?\/\/(www\.)?youtu(\.be|be\.com)\//i.test(url);
      const link  = url ? \`<div class="plink">\${yt ? 'YouTube: ' : 'Link: '}<a href="\${esc(url)}">\${esc(url)}</a></div>\` : '';
      return \`
        <div class="phase">
          <div class="phead"><div class="pid">\${esc(id)}</div><div class="ptitle">\${esc(title)}</div><div class="plabel">— \${esc(label)}</div></div>
          <div class="pshort"><b>\${esc(short)}</b></div>
          <div class="plong">\${esc(long)}</div>
          \${link}
        </div>\`;
    }).join('') }
</div>

${dbg ? \`<div class="dbg noprint">Debug objKey: \${esc(obj)}</div>\` : '' }
`);
  } catch (e) {
    res.status(500).send(\`print crash: \${String(e?.stack || e)}\`);
  }
};
