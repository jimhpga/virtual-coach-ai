module.exports = async (req, res) => {
  try {
    const expected = String(process.env.REPORT_API_KEY || "").trim();
    const incoming = String(req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || "").trim();
    if (!expected) return res.status(500).json({ ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    const RESEND = String(process.env.RESEND_API_KEY || "").trim();
    const FROM   = String(process.env.EMAIL_FROM || "onboarding@resend.dev").trim();

    const body = req.body || {};
    const clientId = String(req.query.clientId || body.clientId || "").trim();
    const to       = String(req.query.to || body.to || "").trim();
    const subject  = String(body.subject || `Your Virtual Coach report`).trim();

    if (!clientId) return res.status(400).json({ ok:false, error:"Missing clientId" });
    if (!to)       return res.status(400).json({ ok:false, error:"Missing to" });

    // fetch latest -> share URL
    const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

    const r1 = await fetch(`${origin}/api/latest?clientId=${encodeURIComponent(clientId)}`, {
      headers: { "x-api-key": incoming }
    });
    const j1 = await r1.json();
    if (!r1.ok) return res.status(r1.status).json({ ok:false, via:"latest", ...j1 });

    const r2 = await fetch(`${origin}/api/share?objKey=${encodeURIComponent(j1.key)}`, {
      headers: { "x-api-key": incoming }
    });
    const j2 = await r2.json();
    if (!r2.ok) return res.status(r2.status).json({ ok:false, via:"share", ...j2 });

    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Inter,Arial,sans-serif">
        <h2>Virtual Coach – Latest Report</h2>
        <p>Client: <b>${clientId}</b></p>
        <p><a href="${j2.url}">Open report JSON</a> (expires in ~10 minutes)</p>
      </div>`;

    const r3 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html })
    });
    const text = await r3.text();
    let data; try { data = JSON.parse(text) } catch {}
    if (!r3.ok) return res.status(r3.status).json({ ok:false, provider:"resend", body:text });

    return res.status(200).json({ ok:true, id: data?.id ?? null, key: j1.key, share: j2.url });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
