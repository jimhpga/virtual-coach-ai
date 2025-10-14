// Issues a short-lived client upload URL for Vercel Blob.
// Use this for JSON/images/etc. (Video handled by Mux route below.)
import { handleUpload } from "@vercel/blob/client";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  try {
    const out = await handleUpload({
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => ({
        allowedContentTypes: ["application/json", "image/*", "text/plain", "video/*"],
        tokenPayload: { clientPayload }
      }),
      onUploadCompleted: async ({ blob }) => {
        // optional: audit/log
      }
    });
    res.status(200).json(out);
  } catch (e) {
    res.status(400).json({ error: String(e?.message || e) });
  }
}
