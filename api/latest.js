module.exports = async (req, res) => {
  try {
    const expected = String(process.env.REPORT_API_KEY || "").trim();
    const incoming = String(req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || "").trim();
    if (!expected) return res.status(500).json({ ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    const clientId = String(req.query.clientId || (req.body && req.body.clientId) || "").trim();
    if (!clientId) return res.status(400).json({ ok:false, error:"Missing clientId" });

    const r = await fetch(`${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/reports?clientId=${encodeURIComponent(clientId)}`, {
      headers: { "x-api-key": incoming }
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json(j);

    const items = Array.isArray(j.items) ? j.items : [];
    if (!items.length) return res.status(404).json({ ok:false, error:"No reports for client" });
    return res.status(200).json({ ok:true, key: items[0].key, item: items[0] });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
