module.exports = async (req, res) => {
  try {
    const expected = String(process.env.REPORT_API_KEY || "").trim();
    const incoming =
      String(req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || "").trim();

    if (!expected) return res.status(500).json({ ok:false, error:"REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    const objKey   = req.query.objKey;
    const clientId = req.query.clientId;
    const base     = `https://${req.headers.host}`;

    let key = objKey;
    if (!key && clientId) {
      const r0 = await fetch(`${base}/api/latest?clientId=${encodeURIComponent(clientId)}`, {
        headers: { "x-api-key": incoming },
      });
      const j0 = await r0.json();
      key = j0.key;
    }
    if (!key) return res.status(400).json({ ok:false, error:"Missing objKey or clientId" });

    const r1 = await fetch(`${base}/api/reports?objKey=${encodeURIComponent(key)}`, {
      headers: { "x-api-key": incoming },
    });
    const j1 = await r1.json();
    if (!r1.ok) return res.status(r1.status).json(j1);

    const src = (j1 && j1.data && j1.data.report) || {};
    const out = normalize(src);

    return res.status(200).json({ ok:true, key, data:{ report: out } });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};

function normalize(r){
  const out = { ...r };

  // meta → top-level
  if (r.meta){
    out.mode   = out.mode   ?? r.meta.mode;
    out.swings = out.swings ?? r.meta.swings;
    out.date   = out.date   ?? r.meta.date;
  }

  // fixes
  if (!out.top3PriorityFixes && Array.isArray(r.topFixes))   out.top3PriorityFixes = r.topFixes;
  if (!out.top3PowerFixes    && Array.isArray(r.powerFixes)) out.top3PowerFixes    = r.powerFixes;

  // coaching card (string → object)
  if (typeof r.coachingCard === "string"){
    out.coachingCard = { summary: r.coachingCard, cues: [], drills: [] };
  }

  // consistency
  if (r.consistency){
    if (!out.swingConsistency){
      if (typeof r.consistency.swing === "number") out.swingConsistency = { value:r.consistency.swing };
      else if (r.consistency.swing) out.swingConsistency = r.consistency.swing;
    }
    if (!out.positionConsistency && Array.isArray(r.consistency.position)){
      out.positionConsistency = r.consistency.position.map(p => ({
        position: p.position || p.pos || p.id || "",
        value:    p.value ?? p.score ?? 0,
      }));
    }
  }

  // power → summary
  if (r.power){
    const val = typeof r.power === "number" ? r.power : r.power.score;
    if (!out.powerScoreSummary && (typeof val === "number")){
      out.powerScoreSummary = { value: val, notes: r.power.notes || "" };
    }
  }

  // phases tidy
  if (Array.isArray(r.phases)){
    out.phases = r.phases.map(p => ({
      id:    p.id    ?? p.position ?? p.pos ?? "",
      title: p.title ?? p.name ?? "",
      label: p.label ?? p.note ?? "",
      url:   p.url   ?? p.video ?? undefined,
    }));
  }

  if (out.swingScore == null && typeof r.power?.score === "number") out.swingScore = r.power.score;
  return out;
}
