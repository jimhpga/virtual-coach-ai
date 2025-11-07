const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.text({ type: "application/json" }));

function makeReport(key){
  const jobId = String(key || "uploads/demo.mov").replace(/^uploads\//,"").replace(/\.[^.]+$/, "");
  return {
    ok: true, status: "ready", jobId, stub: true, mode: "local",
    report: {
      swing_id: jobId,
      p_frames: ["P1","P2","P3","P4","P5","P6","P7","P8","P9"],
      faults: ["EarlyExtension","OpenClubface"],
      score: Number(process.env.STUB_SCORE || 82),
      note: "local-stub"
    }
  };
}

app.get("https://api.virtualcoachai.net/api/analyze",  (req, res) => res.json(makeReport(req.query.key)));
app.post("https://api.virtualcoachai.net/api/analyze", (req, res) => {
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body) } catch {} }
  res.json(makeReport(body?.key));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API listening on http://localhost:${port} (LOCAL STUB)`));
