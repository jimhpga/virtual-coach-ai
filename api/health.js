export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    ok: true,
    service: 'vcai',
    t: Date.now()
  }, null, 2));
}
