module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok:false, error:"Method Not Allowed" });
    }

    // Same auth as /api/report
    const expected = String(process.env.REPORT_API_KEY || "").trim();
    const incoming = String(
      req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || ""
    ).trim();

    if (!expected) return res.status(500).json({ ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    // Email provider env (trimmed!)
    const RESEND = String(process.env.RESEND_API_KEY || "").trim();
    const FROM   = String(process.env.EMAIL_FROM || "onboarding@resend.dev").trim();

    const { to, subject, html, text } = req.body || {};
    if (!to)      return res.status(400).json({ ok:false, error:"Missing 'to'" });
    if (!subject) return res.status(400).json({ ok:false, error:"Missing 'subject'" });
    if (!html && !text) return res.status(400).json({ ok:false, error:"Missing 'html' or 'text'" });

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html, text })
    });

    const body = await r.text();
    let data; try { data = JSON.parse(body) } catch {}
    if (!r.ok) return res.status(r.status).json({ ok:false, provider:"resend", status:r.status, body });
    return res.status(200).json({ ok:true, id: data?.id ?? null });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
