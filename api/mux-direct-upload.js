// /api/mux-direct-upload.js
export const config = { runtime: "nodejs" };

import Mux from "@mux/mux-node";
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const upload = await mux.video.directUploads.create({
      // accept any file; your UI limits to video/*
      new_asset_settings: {
        playback_policy: ["public"], // report can stream without a signed token
      },
      cors_origin: req.headers.origin || "*",
    });
    // Shape the response the client expects
    res.status(200).json({ upload: { id: upload.id, url: upload.url } });
  } catch (e) {
    res
      .status(400)
      .json({ error: e?.message || String(e), details: e?.response?.data || null });
  }
}
