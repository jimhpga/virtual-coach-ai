// /api/mux-direct-upload.js
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    // CORS preflight (harmless on same-origin)
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return res.status(500).json({
        error: "Missing MUX credentials. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET in Vercel env."
      });
    }

    // Try to read JSON body (works whether body is object or string)
    let body = req.body;
    if (typeof body !== "object") {
      try { body = JSON.parse(body || "{}"); } catch { body = {}; }
    }

    // Optional client hints
    const contentType = body?.content_type || "video/mp4";
    // Prefer explicit client-provided origin; otherwise use request header or '*'
    const corsOrigin  = body?.cors_origin || req.headers.origin || "*";

    const resp = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString("base64")
      },
      body: JSON.stringify({
        new_asset_settings: { playback_policy: ["public"] },
        cors_origin: corsOrigin
      })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(resp.status).json({
        ok: false,
        error: "Mux API error",
        status: resp.status,
        detail: data
      });
    }

    const up = data?.data || {};
    return res.status(200).json({
      ok: true,
      upload: { id: up.id || null, url: up.url || null, timeout_at: up.timeout_at || null },
      hints: { contentType, corsOrigin }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
