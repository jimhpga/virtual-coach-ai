// /api/presign.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req, res) {
  try {
    const { key, type } = req.query;
    if (!key) return res.status(400).json({ error: "key required" });

    const Bucket = process.env.UPLOADS_BUCKET;           // e.g. virtualcoachai-swings
    const Region = process.env.AWS_REGION;               // e.g. us-west-1
    if (!Bucket || !Region) return res.status(500).json({ error: "server not configured" });

    const s3 = new S3Client({
      region: Region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });

    const ContentType = type || "application/octet-stream";
    const cmd = new PutObjectCommand({ Bucket, Key: key, ContentType });

    // short expiry is fine — client uploads immediately
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // seconds
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({ url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "presign error" });
  }
}
