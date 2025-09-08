// server.js — minimal backend wrapper
const express = require('express');
const bodyParser = require('body-parser');

// pull in your analyzer function
const analyzeHandler = require('./api/analyze.js');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ type: 'application/json' })); // handles raw string JSON bodies too

// route to analyzer
app.post('/api/analyze', (req, res) => analyzeHandler(req, res));
app.get('/api/analyze',  (req, res) => analyzeHandler(req, res));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ API listening on http://localhost:${port}`);
});
