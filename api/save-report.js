// api/save-report.js
export const config = { runtime: "nodejs" }; // force Node runtime

import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Parse body safely
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `reports/${id}.json`;

    const report = {
      schema: "1.0",
      created: new Date().toISOString(),
      status: body.status ?? "ready",
      swingScore: body.swingScore ?? 80,
      muxPlaybackId: body.muxPlaybackId ?? null,
      muxUploadId: body.muxUploadId ?? null,
      p1p9: Array.isArray(body.p1p9) ? body.p1p9 : [],
      faults: Array.isArray(body.faults) ? body.faults : [],
      note: body.note || ""
    };

    // write JSON to Blob (public)
    const { url } = await put(key, JSON.stringify(report), {
      access: "public",
      contentType: "application/json",
    });

    return res.status(200).json({ id, url });
  } catch (e) {
    // return the real error so the page shows it
    return res.status(500).json({
      error: String(e?.message || e),
      hint: "Check @vercel/blob is installed and BLOB_READ_WRITE_TOKEN env is set",
    });
  }
}
