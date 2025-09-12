module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method Not Allowed" });

  // Optional auth: reuse your REPORT_API_KEY
  const expected = (process.env.REPORT_API_KEY || "").trim();
  const incoming = (req.headers["x-api-key"]?.toString() || req.query.key || req.body?.key || "").trim();
  if (expected && incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

  const RESEND = (process.env.RESEND_API_KEY || "").trim();
  const FROM   = (req.body?.from || process.env.EMAIL_FROM || "onboarding@resend.dev").trim();
  const TO     = req.body?.to;
  const SUBJECT= req.body?.subject || "Virtual Coach";
  const HTML   = req.body?.html || "<b>Hello from /api/email</b>";
  const TEXT   = req.body?.text || undefined;

  if (!RESEND) return res.status(500).json({ ok:false, error:"Missing RESEND_API_KEY" });
  if (!TO)     return res.status(400).json({ ok:false, error:"Missing 'to'" });

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: TO, subject: SUBJECT, html: HTML, text: TEXT })
    });
    const body = await r.text();
    let data; try { data = JSON.parse(body) } catch {}
    if (!r.ok) return res.status(r.status).json({ ok:false, provider:"resend", status:r.status, body });
    return res.status(200).json({ ok:true, id: data?.id ?? null });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
