import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const key = `reports/${id}.json`;

    const report = {
      schema: "1.0",
      created: new Date().toISOString(),
      status: body.status || "ready",
      swingScore: body.swingScore ?? 80,
      muxPlaybackId: body.muxPlaybackId || null,   // initially null
      muxUploadId: body.muxUploadId || null,       // used by poller
      p1p9: body.p1p9 || [],
      faults: body.faults || [],
      note: body.note || ""
    };

    const { url } = await put(key, JSON.stringify(report), {
      access: "public",
      contentType: "application/json"
    });

    res.status(200).json({ id, url });
  } catch (e) {
    res.status(400).json({ error: String(e?.message || e) });
  }
}
