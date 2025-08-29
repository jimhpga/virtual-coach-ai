// /api/hello.js — Node runtime sanity check
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    ok: true,
    runtime: 'node',
    url: req.url,
    host: req.headers.host,
    t: Date.now()
  }, null, 2));
}
