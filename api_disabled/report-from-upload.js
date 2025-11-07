module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);

    // Health probe
    if (url.searchParams.get("probe") === "1") {
      res.setHeader("X-ReportFromUpload-Rev","r1");
      return res.status(200).send("report-from-upload alive");
    }

    const key = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
    if (!key) return res.status(400).json({ ok:false, error:"Missing API key" });

    // Read JSON body safely
    const raw = await new Promise((resolve,reject)=>{
      const chunks=[]; req.on("data",d=>chunks.push(d))
        .on("end",()=>resolve(Buffer.concat(chunks).toString("utf8")))
        .on("error",reject);
    });
    let body; try { body = JSON.parse(raw) } catch {
      return res.status(400).json({ ok:false, error:"Invalid JSON" });
    }

    const { clientId, email, note, score, uploadKey, filename, contentType, bytes } = body;
    if (!clientId || !uploadKey) return res.status(400).json({ ok:false, error:"Missing clientId or uploadKey" });

    const today = new Date().toISOString().slice(0,10);
    const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;

    // Try to get a temporary viewer URL for the media (ok if it fails)
    let shareUrl = "";
    try {
      const rShare = await fetch(`${origin}/api/share?objKey=${encodeURIComponent(uploadKey)}`, {
        headers: { "x-api-key": key }
      });
      const jShare = await rShare.json();
      shareUrl = jShare?.url || "";
    } catch { /* ignore */ }

    // Build a rich report compatible with /api/report-compat & viewers
    const rep = {
      status: "ready",
      clientId,
      email: email || "noreply@virtualcoachai.net",
      note: note || "auto-from-upload",
      date: today,
      mode: "Full Swing",
      swings: 1,
      swingScore: (typeof score === "number") ? score : 78,

      coachingCard: "Quick wins: neutral grip; hands-in takeaway; maintain wrist angles",
      top3PriorityFixes: ["Neutral grip","Hands-in takeaway (P2)","Maintain wrist angles (P6)"],
      top3PowerFixes:    ["Bigger trail hip turn","Post up on lead leg","Extend later (P8–P9)"],
      positionConsistency: [
        { position:"P2", value:82 }, { position:"P4", value:76 },
        { position:"P6", value:80 }, { position:"P7", value:85 }
      ],
      swingConsistency: { value:81 },
      powerScoreSummary: { value:76, notes:"" },
      phases: [
        { id:"P1", title:"Setup",  label:"Neutral grip",   url: shareUrl },
        { id:"P4", title:"Top",    label:"Flat lead wrist" },
        { id:"P7", title:"Impact", label:"Handle forward"  }
      ],
      media: { key: uploadKey, contentType: contentType || "", filename: filename || "", bytes: bytes || 0 }
    };

    // Persist via your existing writer
    const r = await fetch(`${origin}/api/report`, {
      method: "POST",
      headers: { "x-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ report: rep })
    });
    const j = await (async()=>{ try { return await r.json() } catch { return {} } })();
    if (!r.ok || !j?.key) return res.status(r.status || 502).json({ ok:false, error:"/api/report failed", body:j });

    const print = `${origin}/api/print?key=${encodeURIComponent(key)}&objKey=${encodeURIComponent(j.key)}`;
    return res.status(200).json({ ok:true, key: j.key, print });
  } catch(e) {
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
};
module.exports.config = { maxDuration: 10 };
