// /api/s3-presign.js
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export const config = { api: { bodyParser: true } };

const client = new S3Client({ region: process.env.AWS_REGION });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { filename, contentType } = req.body || {};
  if (!filename || !contentType) return res.status(400).json({ error: "filename and contentType required" });

  const safeName = filename.replace(/\s+/g, "_");
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  try {
    const { url, fields } = await createPresignedPost(client, {
      Bucket: process.env.S3_BUCKET,                    // e.g. virtualcoachai-swings
      Key: key,
      Conditions: [
        ["starts-with", "$key", "uploads/"],
        ["content-length-range", 0, 200000000]          // up to ~200MB
      ],
      // Do NOT set ACL if your bucket has Object Ownership = Bucket owner enforced
      Fields: { "Content-Type": contentType },
      Expires: 300
    });

    const publicUrl = `${process.env.S3_PUBLIC_URL_BASE}/${key}`;
    res.status(200).json({ url, fields, key, publicUrl });
  } catch (err) {
    console.error("[s3-presign] error", err);
    res.status(500).json({ error: "Failed to create presigned post" });
  }
}
