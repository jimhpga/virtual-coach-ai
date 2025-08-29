// /api/version.js
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    vercelUrl: process.env.VERCEL_URL || null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null
  });
}
