export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const auth = Buffer.from(
    `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
  ).toString("base64");

  const r = await fetch("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      new_asset_settings: { playback_policy: ["public"] },
      cors_origin: "*"   // allow from your site
    })
  });

  const json = await r.json();
  if (!r.ok) return res.status(r.status).json(json);

  res.status(200).json({ upload: json.data }); // {id, url, ...}
}
