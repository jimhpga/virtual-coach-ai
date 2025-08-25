// /api/ping.js  (CommonJS, zero deps)
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify({
    ok: true,
    route: '/api/ping',
    ts: Date.now()
  }));
};
