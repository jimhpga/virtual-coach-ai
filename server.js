// server.js — local stub first, fall back to api/analyze.js
const express = require('express');
const bodyParser = require('body-parser');

const FORCE_LOCAL_STUB = String(process.env.FORCE_LOCAL_STUB || '').toLowerCase() === 'true';

// Try to load your existing handler (used when not forcing local stub)
let analyzeHandler = null;
try {
  const mod = require('./api/analyze.js');
  analyzeHandler = (mod && typeof mod === 'function') ? mod
                 : (mod && typeof mod.default === 'function') ? mod.default
                 : (mod && typeof mod.handler === 'function') ? mod.handler
                 : null;
} catch (e) {
  // ignore: we can still run with local stub
}

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/json' })); // handles raw JSON body too

// Local stub path — zero S3, always ready
function localStub(req, res) {
  const key = (req.body && req.body.key) || (req.query && req.query.key) || 'uploads/demo.mov';
  const jobId = key.replace(/^uploads\//, '').replace(/\.[^.]+$/, '');
  const report = {
    swing_id: jobId,
    p_frames: ["P1","P2","P3","P4","P5","P6","P7","P8","P9"],
    faults:   ["EarlyExtension","OpenClubface"],
    score:    Number(process.env.STUB_SCORE || 82),
    note:     "local-stub"
  };
  // return the report inline so the frontend can render immediately
  res.json({ ok: true, status: "ready", jobId, report, stub: true, mode: "local" });
}

// Route
app.post('/api/analyze', (req, res) => {
  if (FORCE_LOCAL_STUB || !analyzeHandler) return localStub(req, res);
  return analyzeHandler(req, res);
});
app.get('/api/analyze', (req, res) => {
  if (FORCE_LOCAL_STUB || !analyzeHandler) return localStub(req, res);
  return analyzeHandler(req, res);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API listening on http://localhost:${port} (stub=${FORCE_LOCAL_STUB || !analyzeHandler})`));
