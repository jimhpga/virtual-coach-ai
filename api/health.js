// /api/health.js
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, now: Date.now(), region: process.env.VERCEL_REGION || 'unknown' });
}
