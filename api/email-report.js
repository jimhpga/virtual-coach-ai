module.exports = async (req, res) => {
  const bad=(r,s,m)=>r.status(s).json({ok:false,error:m}); const ok=(r,o)=>r.status(200).json({ok:true,...o});
  try{
    const expected = String(process.env.REPORT_API_KEY||'').trim();
    const incoming = String(req.headers["x-api-key"] || (req.query&&req.query.key) || (req.body&&req.body.key) || '').trim();
    if(!expected) return bad(res,500,"Server REPORT_API_KEY not set");
    if(!incoming || incoming!==expected) return bad(res,401,"Bad API key");

    const clientId = String((req.body&&req.body.clientId) || process.env.CLIENT_ID || '').trim() || 'unknown';
    const to       = String((req.body&&req.body.to)       || process.env.CLIENT_EMAIL || '').trim();
    if(!to) return bad(res,400,"Missing 'to'");

    const base = `https://${req.headers.host}`;
    const j1 = await fetch(`${base}/api/latest?clientId=${encodeURIComponent(clientId)}`, { headers: { 'x-api-key': expected }});
    const latest = await j1.json(); if(!j1.ok) return bad(res,j1.status,JSON.stringify(latest));
    const objKey = latest.key;

    const j2 = await fetch(`${base}/api/share?objKey=${encodeURIComponent(objKey)}`, { headers: { 'x-api-key': expected }});
    const share = await j2.json(); if(!j2.ok) return bad(res,j2.status,JSON.stringify(share));
    const url = share.url;
    const viewer = `${base}/api/view?url=${encodeURIComponent(url)}`;

    const RESEND = String(process.env.RESEND_API_KEY||'').trim();
    const FROM   = String(process.env.EMAIL_FROM||'onboarding@resend.dev').trim();
    const SUBJECT= `Your Swing Report • ${clientId}`;

    const card = `
      <div style="font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Arial">
        <h2 style="margin:0 0 8px">Swing Report</h2>
        <p style="margin:0 0 8px">Client: <b>${clientId}</b></p>
        <p style="margin:0 0 12px"><a href="${viewer}">Open viewer</a> • <a href="${url}">Raw JSON</a></p>
      </div>`.trim();

    const r3 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject: SUBJECT, html: card })
    });
    const text = await r3.text(); let data; try{ data=JSON.parse(text) }catch{}
    if(!r3.ok) return res.status(r3.status).json({ ok:false, provider:"resend", body:text });

    return ok(res, { id: data?.id ?? null, key: objKey, share: url, viewer });
  }catch(e){ return bad(res,500,String(e?.message||e)) }
};
