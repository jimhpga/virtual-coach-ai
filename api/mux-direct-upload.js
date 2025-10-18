// api/mux-direct-upload.js
export const config = { runtime: "nodejs" }; // Node runtime so we have server env

// Uses the native fetch in Node 18+ (Vercel default)
const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return res.status(500).json({
        error: "Missing MUX_TOKEN_ID / MUX_TOKEN_SECRET environment variables",
      });
    }

    // Basic auth header: base64("tokenId:tokenSecret")
    const basic = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString("base64");

    // Create a Mux Direct Upload via REST
    const r = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Basic ${basic}`,
      },
      body: JSON.stringify({
        cors_origin: "*",
        new_asset_settings: { playback_policy: ["public"] },
        // test: true, // uncomment if you want test assets while debugging
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.error?.message || JSON.stringify(data) || "Mux create upload failed",
      });
    }

    // Mux REST returns: { data: { id, url, ... } }
    const upload = data?.data;
    if (!upload?.url) {
      return res.status(500).json({ error: "Mux response missing upload.url", raw: data });
    }

    return res.status(200).json({ upload: { id: upload.id, url: upload.url } });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
