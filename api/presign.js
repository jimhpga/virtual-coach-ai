// /api/presign.js  (Node Serverless Function on Vercel)
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
const BUCKET = process.env.S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  // CORS for your site; OPTIONS preflight
  res.setHeader("Access-Control-Allow-Origin", "https://virtualcoachai.net");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!BUCKET) return res.status(500).json({ ok: false, error: "Missing env S3_BUCKET" });

  // Health check if you hit it in a browser
  if (req.method === "GET") return res.status(200).json({ ok: true, bucket: BUCKET });

  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });

  try {
    const { filename, type } = (req.body || {});
    const clean = String(filename || "video").replace(/[^a-z0-9.\-_]/gi, "_");
    const key = `uploads/${Date.now()}-${clean}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: BUCKET,
      Key: key,
      Fields: { "Content-Type": type || "video/mp4" },
      Conditions: [["content-length-range", 1, 200 * 1024 * 1024]], // up to 200 MB
      Expires: 3600
    });

    return res.status(200).json({ ok: true, url, fields, key });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
