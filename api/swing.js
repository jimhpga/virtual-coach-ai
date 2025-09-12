/**
 * POST /api/swing
 * Body: { score: number (0..100), note?: string }
 * Auth: REPORT_API_KEY via header x-api-key OR ?key= OR body.key
 * Wraps /api/report so the client can send minimal fields.
 */
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Use POST" });

    // Auth (same as /api/report)
    const expected = String(process.env.REPORT_API_KEY || "").trim();
    const incoming = String(
      req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || ""
    ).trim();
    if (!expected) return res.status(500).json({ ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    // Inputs for iPad
    const rawScore = (req.body && req.body.score) ?? req.query.score;
    const score = Number(rawScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({ ok:false, error:"score must be 0–100" });
    }
    const note = String(((req.body && req.body.note) ?? req.query.note ?? "")).trim();

    const clientId = String(process.env.CLIENT_ID   || "unknown").trim();
    const email    = String(process.env.CLIENT_EMAIL|| "").trim();

    // Call existing /api/report internally
    const base = `https://${req.headers.host}`;
    const payload = {
      key: expected,
      report: {
        status: "ready",
        note: note || `lesson-${new Date().toISOString().replace(/[:.]/g,"-")}`,
        clientId,
        email,
        swingScore: score
      }
    };

    const r = await fetch(`${base}/api/report`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let data; try { data = JSON.parse(text) } catch {}
    if (!r.ok) return res.status(r.status).json({ ok:false, via:"report", body:text });

    return res.status(200).json({ ok:true, ...(data || {}) });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
