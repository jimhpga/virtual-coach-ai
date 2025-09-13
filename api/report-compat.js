module.exports = async (req, res) => {
  try {
    const apiKey = String(
      req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || ""
    ).trim();
    const objKey  = req.query.objKey || "";
    const clientId= req.query.clientId || "";

    if (!apiKey)  return res.status(401).json({ ok:false, error:"Missing x-api-key" });
    if (!objKey && !clientId) return res.status(400).json({ ok:false, error:"Missing objKey or clientId" });

    const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

    // resolve latest if only clientId provided
    let key = objKey;
    if (!key && clientId) {
      const r0 = await fetch(`${base}/api/latest?clientId=${encodeURIComponent(clientId)}`, { headers:{ "x-api-key": apiKey }});
      const j0 = await r0.json();
      key = j0.key || "";
      if (!key) return res.status(404).json({ ok:false, error:"No report found for clientId" });
    }

    // fetch raw report
    const r1 = await fetch(`${base}/api/reports?objKey=${encodeURIComponent(key)}`, { headers:{ "x-api-key": apiKey }});
    const t1 = await r1.text();
    let j1; try { j1 = JSON.parse(t1) } catch { return res.status(502).json({ ok:false, error:"Upstream not JSON", body:t1 }) }
    if (!r1.ok) return res.status(r1.status).json(j1);

    const raw = j1?.data?.report || j1?.report || {};
    const out = normalize(raw);

    return res.status(200).json({ ok:true, key, data:{ report: out }});
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};

function asArray(x){ return Array.isArray(x) ? x : (x == null ? [] : [x]); }

function normalize(r){
  const out = {};

  // base identity
  out.status    = r.status ?? "ready";
  out.note      = r.note   ?? "";
  out.clientId  = r.clientId ?? "";
  out.email     = r.email    ?? "";

  // meta
  out.date   = r.date ?? r.meta?.date ?? "";
  out.mode   = r.mode ?? r.meta?.mode ?? "";
  out.swings = r.swings ?? r.meta?.swings ?? "";

  // score
  out.swingScore = (typeof r.swingScore === "number") ? r.swingScore
                 : (typeof r.power?.score === "number") ? r.power.score
                 : (typeof r.power === "number") ? r.power
                 : undefined;

  // coaching card (string or object.summary)
  out.coachingCard =
    (typeof r.coachingCard === "string") ? r.coachingCard :
    (r.coachingCard?.summary ? r.coachingCard.summary : "");

  // PRIORITY FIXES: accept top3PriorityFixes, priorityFixes, or topFixes
  const prio = r.top3PriorityFixes || r.priorityFixes || r.topFixes || [];
  out.top3PriorityFixes = asArray(prio).map(x => (
    typeof x === "string" ? x : (x?.title || x?.detail || String(x))
  ));

  // POWER FIXES: accept top3PowerFixes or powerFixes
  const pfix = r.top3PowerFixes || r.powerFixes || [];
  out.top3PowerFixes = asArray(pfix).map(x => (
    typeof x === "string" ? x : (x?.title || x?.detail || String(x))
  ));

  // POSITION CONSISTENCY:
  // accept positionConsistency[], or consistency.position/positions[], or phases[]
  if (Array.isArray(r.positionConsistency)) {
    out.positionConsistency = r.positionConsistency.map(p => ({
      position: p.position ?? p.pos ?? p.id ?? p.name ?? "",
      value:    p.value ?? p.score ?? null
    }));
  } else if (Array.isArray(r.consistency?.position) || Array.isArray(r.consistency?.positions)) {
    const arr = r.consistency.position || r.consistency.positions || [];
    out.positionConsistency = arr.map(p => ({
      position: p.position ?? p.pos ?? p.id ?? p.name ?? "",
      value:    p.value ?? p.score ?? null
    }));
  } else if (Array.isArray(r.phases)) {
    out.positionConsistency = r.phases.map(p => ({
      position: p.id ?? p.pos ?? p.position ?? p.name ?? "",
      value:    p.score ?? null
    }));
  }

  // SWING CONSISTENCY
  const sv = r.swingConsistency?.value ?? r.consistency?.swing;
  if (sv != null) out.swingConsistency = { value: sv };

  // POWER SCORE SUMMARY
  const pv = r.powerScoreSummary?.value ?? r.power?.score ?? (typeof r.power === "number" ? r.power : undefined);
  if (pv != null) out.powerScoreSummary = { value: pv, notes: r.powerScoreSummary?.notes ?? r.power?.notes ?? "" };

  // PHASES (tidy)
  if (Array.isArray(r.phases)) {
    out.phases = r.phases.map(p => ({
      id:    p.id    ?? p.position ?? p.pos ?? "",
      title: p.title ?? p.name ?? "",
      label: p.label ?? p.note ?? "",
      url:   p.url   ?? p.video ?? undefined
    }));
  }

  return out;
}
