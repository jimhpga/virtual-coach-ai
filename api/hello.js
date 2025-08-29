// /api/hello.js — simple Node function
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    ok: true,
    where: 'hello',
    url: req.url,
    host: req.headers.host,
    t: Date.now()
  }, null, 2));
}
