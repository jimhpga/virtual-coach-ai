// api/report.js (Vercel Serverless Function)
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok:false, error:"Method Not Allowed" });
    }
    const key = req.headers["x-api-key"] || (req.query && req.query.key) || (req.body && req.body.key);
    if (!key) return res.status(401).json({ ok:false, error:"Missing API key" });

    const body   = req.body ?? {};
    const report = body.report ?? body;

    if (!report || typeof report !== "object") {
      return res.status(400).json({ ok:false, error:"Missing report object" });
    }
    if (!report.status) return res.status(400).json({ ok:false, error:"Missing report.status" });
    if (!report.note)   return res.status(400).json({ ok:false, error:"Missing report.note" });

    // TODO: persist report if needed
    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
