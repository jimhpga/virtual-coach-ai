export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return res.status(500).json({
        error: "Missing MUX credentials. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET in Vercel environment variables.",
      });
    }

    const muxBody = {
      new_asset_settings: { playback_policy: ["public"] },
      cors_origin: req.headers.origin || "*",
    };

    const r = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization:
          "Basic " + Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString("base64"),
      },
      body: JSON.stringify(muxBody),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        error: "Mux API error",
        status: r.status,
        data,
      });
    }

    const upload = data?.data;
    return res.status(200).json({ upload: { id: upload?.id, url: upload?.url } });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
