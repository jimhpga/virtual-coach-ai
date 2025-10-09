// api/health.js
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res
    .status(200)
    .json({
      ok: true,
      ts: Date.now(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      region: process.env.VERCEL_REGION || null,
    });
}
