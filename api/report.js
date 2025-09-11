// api/report.js
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method Not Allowed" });

    const rawKey = req.headers["x-api-key"] ?? req.query?.key ?? req.body?.key;
    const incoming = String(rawKey ?? "").trim();
    const expected = String(process.env.REPORT_API_KEY ?? "").trim();

    if (!incoming) return res.status(401).json({ ok:false, error:"Missing API key" });
    if (expected && incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    const body   = req.body ?? {};
    const report = body.report ?? body;
    if (!report || typeof report !== "object") return res.status(400).json({ ok:false, error:"Missing report object" });
    if (!report.status) return res.status(400).json({ ok:false, error:"Missing report.status" });
    if (!report.note)   return res.status(400).json({ ok:false, error:"Missing report.note" });

    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
