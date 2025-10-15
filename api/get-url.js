import { list } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    const { id, key, url } = req.query || {};

    // 1) If a full URL is given, just return it
    if (url) return res.status(200).json({ url });

    // 2) If a blob key is given, build a public URL from env
    if (key) {
      const base = (process.env.BLOB_PUBLIC_BASE || "").replace(/\/+$/, "");
      if (!base) return res.status(500).json({ error: "BLOB_PUBLIC_BASE missing" });
      return res.status(200).json({ url: `${base}/${key.replace(/^\\/+/, "")}` });
    }

    // 3) If an id is given, find the first blob whose key starts with reports/<id>
    if (id) {
      const prefix = `reports/${id}`;
      // list() returns up to 1000; our prefix narrows this to the single JSON we want
      const { blobs = [] } = await list({ prefix });
      const hit = blobs[0];
      if (!hit) return res.status(404).json({ error: "not found" });
      return res.status(200).json({ url: hit.url, key: hit.pathname });
    }

    return res.status(400).json({ error: "missing id|key|url" });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
