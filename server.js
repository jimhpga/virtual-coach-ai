// server.js — replace the top import with this robust load
const express = require('express');
const bodyParser = require('body-parser');

const analyzeModule  = require('./api/analyze.js');      // <- unchanged path
const analyzeHandler = analyzeModule.default             // ESM default export
                    || analyzeModule.handler             // named export
                    || analyzeModule;                    // CommonJS module.exports

if (typeof analyzeHandler !== 'function') {
  throw new Error('api/analyze.js did not export a handler function');
}

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/json' }));  // handle raw JSON text
app.post('/api/analyze', (req, res) => analyzeHandler(req, res));
app.get('/api/analyze',  (req, res) => analyzeHandler(req, res));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API listening on http://localhost:${port}`));
