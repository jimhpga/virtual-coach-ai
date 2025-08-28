// /api/health.js
export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    openai: !!process.env.OPENAI_API_KEY,
    time: new Date().toISOString(),
    version: "2025-08-05-1"
  });
}
