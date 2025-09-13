module.exports = async (req, res) => {
  try{
    const url = new URL(req.url, `https://${req.headers.host}`);
    const key = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
    const obj = url.searchParams.get("objKey") || "";
    if(!key || !obj) return res.status(400).json({ok:false,error:"Missing key or objKey"});

    const r = await fetch(`https://${req.headers.host}/api/reports?objKey=${encodeURIComponent(obj)}`, {
      headers: { "x-api-key": key }
    });
    const j = await r.json();
    const r0 = j?.data?.report || j?.report || {};
    const out = {};

    // simple passthroughs
    ["status","note","clientId","email","date","mode","swings","swingScore","coachingCard"].forEach(k=>{
      if (r0[k] != null) out[k]=r0[k];
    });

    // top fixes
    out.top3PriorityFixes = r0.top3PriorityFixes || r0.topFixes || r0.priorityFixes || [];
    out.top3PowerFixes    = r0.top3PowerFixes    || r0.powerFixes || [];

    // consistency
    if (r0.positionConsistency) out.positionConsistency = r0.positionConsistency;
    if (r0.consistency?.swing || r0.swingConsistency) {
      out.swingConsistency = r0.swingConsistency || { value: r0.consistency?.swing };
    }

    // power
    if (typeof r0.power === "number") out.powerScoreSummary = { value: r0.power, notes: "" };
    else if (r0.power?.score != null) out.powerScoreSummary = { value: r0.power.score, notes: r0.power.notes || "" };

    // phases (carry id/title/label + short/long/url if present)
    if (Array.isArray(r0.phases)) {
      out.phases = r0.phases.map(p => ({
        id:    p.id    ?? p.position ?? p.pos ?? "",
        title: p.title ?? p.name     ?? "",
        label: p.label ?? p.note     ?? "",
        short: p.short ?? p.summary  ?? "",
        long:  p.long  ?? p.detail   ?? p.description ?? p.explanation ?? "",
        url:   p.url   ?? p.video    ?? undefined,
      }));
    }

    // fallback: if swingScore missing, try power.score
    if (out.swingScore == null && typeof r0.power?.score === "number") out.swingScore = r0.power.score;

    return res.status(200).json({ ok:true, key: j.key, data: { report: out }});
  } catch(e){
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
};
