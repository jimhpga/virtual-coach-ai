// api/mux-direct-upload.js
export const config = { runtime: "nodejs" };

import Mux from "@mux/mux-node";

// These MUST be set in Vercel > Project Settings > Environment Variables
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

    const mux = new Mux({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });
    const uploads = mux.video.uploads;

    // Create a direct-upload URL that we can PUT the file to
    const upload = await uploads.create({
      new_asset_settings: {
        playback_policy: "public", // we want public playback IDs
      },
      cors_origin: "*",
      // test: true, // flip on if you want "test" assets (cheaper) while debugging
    });

    return res.status(200).json({
      upload: {
        id: upload.id,
        url: upload.url, // front-end will PUT the file here
      },
    });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
