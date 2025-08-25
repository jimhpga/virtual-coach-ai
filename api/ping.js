// /api/ping.js
export default function handler(req, res) {
  res.status(200).json({ ok: true, route: "/api/ping", now: Date.now() });
}
