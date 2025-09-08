cd "C:\Users\jimh\OneDrive\Documents\GitHub\virtual-coach-ai"
@'
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/json' }));

// LOCAL STUB: always returns a ready report immediately
app.post('/api/analyze', (req, res) => {
  const key = (req.body && req.body.key) || (req.query && req.query.key) || 'uploads/demo.mov';
  const jobId = String(key).replace(/^uploads\//,'').replace(/\.[^.]+$/, '');

  const report = {
    swing_id: jobId,
    p_frames: ["P1","P2","P3","P4","P5","P6","P7","P8","P9"],
    faults:   ["EarlyExtension","OpenClubface"],
    score:    Number(process.env.STUB_SCORE || 82),
    note:     "local-stub"
  };

  res.json({ ok: true, status: "ready", jobId, report, stub: true, mode: "local" });
});

app.get('/api/analyze', (req, res) => {
  // Same behavior for GET (handy for quick tests)
  const key = (req.query && req.query.key) || 'uploads/demo.mov';
  const jobId = String(key).replace(/^uploads\//,'').replace(/\.[^.]+$/, '');
  res.json({
    ok: true,
    status: "ready",
    jobId,
    report: {
      swing_id: jobId,
      p_frames: ["P1","P2","P3","P4","P5","P6","P7","P8","P9"],
      faults: ["EarlyExtension","OpenClubface"],
      score: Number(process.env.STUB_SCORE || 82),
      note: "local-stub"
    },
    stub: true,
    mode: "local"
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API listening on http://localhost:${port} (LOCAL STUB)`));
'@ | Set-Content -Encoding UTF8 .\server.js
