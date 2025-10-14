// POST { id: "<reportId>", uploadId: "<muxUploadId>" }
// If playback is ready, updates the report JSON (muxPlaybackId) in Blob and returns {status:"ready", playbackId}
// Else returns {status:"pending"}
import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  try {
    const { id, uploadId } = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (!id || !uploadId) return res.status(400).json({ error: "Missing id or uploadId" });

    const auth = Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString("base64");

    // 1) Direct Upload → status (asset_id when ready)
    const upRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const upJson = await upRes.json();
    if (!upRes.ok) return res.status(upRes.status).json(upJson);

    const assetId = upJson?.data?.asset_id;
    if (!assetId) return res.status(200).json({ status: "pending" });

    // 2) Asset → playback_ids
    const asRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const asJson = await asRes.json();
    if (!asRes.ok) return res.status(asRes.status).json(asJson);

    const playbackId = asJson?.data?.playback_ids?.[0]?.id;
    if (!playbackId) return res.status(200).json({ status: "pending" });

    // 3) Patch report JSON in Blob
    const base = (process.env.BLOB_PUBLIC_BASE || "").replace(/\/+$/,"");
    if (!base) return res.status(500).json({ error: "BLOB_PUBLIC_BASE missing" });

    const getUrl = `${base}/reports/${id}.json`;
    const existing = await fetch(getUrl, { cache: "no-store" }).then(r => r.ok ? r.json() : null);

    const patched = {
      ...(existing || {}),
      muxPlaybackId: playbackId,
      muxUploadId: null
    };

    await put(`reports/${id}.json`, JSON.stringify(patched), {
      access: "public",
      contentType: "application/json"
    });

    return res.status(200).json({ status: "ready", playbackId });
  } catch (e) {
    return res.status(400).json({ error: String(e?.message || e) });
  }
}
