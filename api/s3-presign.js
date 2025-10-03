// api/s3-presign.js
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function sanitize(name = "") {
  return name.replace(/[^\w.\-]/g, "_").slice(0, 120);
}

export default async function handler(req, res) {
  // Simple CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { filename, contentType } = req.body ?? {};
  if (!filename || !contentType) {
    return res.status(400).json({ error: "filename and contentType are required" });
  }

  const key = `uploads/${Date.now()}-${randomUUID()}-${sanitize(filename)}`;

  // Pre-signed PUT so the browser can upload the raw file body to S3
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    // ACL: 'private' // default; keep uploads private
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 }); // 60s is plenty

  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json({ url, key, bucket: process.env.S3_BUCKET });
}
