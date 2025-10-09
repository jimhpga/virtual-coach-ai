/**
 * /api/health — simple heartbeat for CI
 * Vercel: Node runtime, single region
 */
export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  // Light sanity check: quick, non-blocking
  return res.status(200).json({
    ok: true,
    service: "virtual-coach-ai",
    time: new Date().toISOString(),
    region: process.env.VERCEL_REGION || "unknown"
  });
}
