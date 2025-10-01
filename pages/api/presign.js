// pages/api/presign.js
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-1";
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const Bucket = process.env.S3_BUCKET;
    if (!Bucket) return res.status(500).json({ error: "S3_BUCKET not set" });

    const { filename, type } = req.body || {};
    const safe = (filename || "video.mp4").replace(/[^\w.\-]/g, "_");
    const Key = `uploads/${Date.now()}-${safe}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket,
      Key,
      Conditions: [
        ["content-length-range", 0, 1024 * 1024 * 1024], // up to 1GB
        ["starts-with", "$Content-Type", ""],
      ],
      Fields: { "Content-Type": type || "video/mp4" },
      Expires: 60, // seconds
    });

    res.json({ url, fields, key: Key });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
