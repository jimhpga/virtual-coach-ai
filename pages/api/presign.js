// pages/api/presign.js
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
    if (!S3_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      return res.status(500).json({ ok: false, error: "Missing AWS env" });
    }

    const name = (req.query.name || "upload.mp4").toString();
    const type = (req.query.type || "video/mp4").toString();
    // size is optional; we still validate on S3 form
    const Region = AWS_REGION || "us-west-1";

    const safeName = name.replace(/[^\w.\-]/g, "_");
    const Key = `raw/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;

    const s3 = new S3Client({
      region: Region,
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    });

    const post = await createPresignedPost(s3, {
      Bucket: S3_BUCKET,
      Key,
      Conditions: [
        ["content-length-range", 0, 1024 * 1024 * 1024], // up to 1 GB
        ["starts-with", "$Content-Type", ""],
      ],
      Fields: { "Content-Type": type },
      Expires: 300, // 5 minutes
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, ...post, key: Key, bucket: S3_BUCKET, region: Region });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || "presign failed" });
  }
}
