// /api/sign-upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { contentType = "video/mp4" } = req.body || {};

  const region = process.env.AWS_REGION || "us-west-2";
  const bucket = process.env.S3_UPLOAD_BUCKET;
  const prefix = process.env.S3_UPLOAD_PREFIX || "uploads/";

  if (!bucket) {
    res.status(500).json({ error: "S3_UPLOAD_BUCKET not set" });
    return;
  }

  const id = crypto.randomUUID();
  const key = `${prefix}${id}.mp4`;

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });

  const url = await getSignedUrl(client, command, { expiresIn: 900 });
  res.status(200).json({ url, key });
}
