module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Only POST" });

    // API key (same auth as /api/report)
    const expected = String(process.env.REPORT_API_KEY || "").trim();
    const incoming = String(
      req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || ""
    ).trim();

    if (!expected) return res.status(500).json({ ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    // Provider env
    const RESEND = String(process.env.RESEND_API_KEY || "").trim();
    const FROM   = String(process.env.EMAIL_FROM || "onboarding@resend.dev").trim();

    const { to, subject, html, text } = req.body || {};
    if (!to)      return res.status(400).json({ ok:false, error:"Missing 'to'" });
    if (!subject) return res.status(400).json({ ok:false, error:"Missing 'subject'" });
    if (!html && !text) return res.status(400).json({ ok:false, error:"Missing 'html' or 'text'" });

    const payload = JSON.stringify({ from: FROM, to, subject, html, text });

    // Lightweight retry on 429/5xx
    let attempt = 0, status = 0, lastText = "", data = null;
    while (attempt < 2) {
      attempt++;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: payload
      });
      status = r.status;
      lastText = await r.text();
      try { data = JSON.parse(lastText) } catch {}
      if (r.ok) break;
      if (status === 429 || status >= 500) await new Promise(s => setTimeout(s, 350));
      else break;
    }
    if (status < 200 || status >= 300) {
      return res.status(status).json({ ok:false, provider:"resend", status, body:lastText });
    }

    // Audit to S3 via our existing /api/report
    try {
      const origin = `https://${process.env.VERCEL_URL || req.headers.host}`;
      const meta = { kind:"email", to, subject, provider:"resend", id: data?.id ?? null, status:"sent", at: Date.now() };
      await fetch(`${origin}/api/report`, {
        method: "POST",
        headers: { "content-type":"application/json" },
        body: JSON.stringify({ key: expected, report: meta })
      });
    } catch (_) {}

    return res.status(200).json({ ok:true, id: data?.id ?? null });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
