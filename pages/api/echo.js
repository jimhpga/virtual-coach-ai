// pages/api/echo.js
export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };
export default function handler(req, res) {
  const method  = req.method;
  const headers = req.headers;
  const query   = req.query;
  const body    = req.body ?? null;
  res.status(200).json({ ok:true, router:"pages", method, headers, query, body });
}
