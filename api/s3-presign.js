@'
export const config = { runtime: "nodejs" };

import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const region =
  process.env.S3_REGION ||
  process.env.AWS_REGION ||
  process.env.AMS_REGION ||
  "us-west-1";

const bucket = process.env.S3_BUCKET;
const accessKeyId =
  process.env.AWS_ACCESS_KEY_ID || process.env.AMS_ACCESS_KEY_ID;
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY || process.env.AMS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

// Minimal JSON body reader for Node serverless functions
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  if (!bucket) {
    res.status(500).json({ error: "S3_BUCKET missing" });
    return;
  }
  if (!accessKeyId || !secretAccessKey) {
    res.status(500).json({ error: "AWS credentials missing" });
    return;
  }

  const payload = await readJson(req);
  const name = payload?.name;
  const type = payload?.type || "application/octet-stream";

  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }

  const safe = name.replace(/[^\w.\-()+]/g, "_").slice(-120);
  const key  = `uploads/${Date.now()}-${safe}`;

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 2 * 1024 * 1024 * 1024], // up to 2GB
        ["starts-with", "$Content-Type", ""],
        { "x-amz-server-side-encryption": "AES256" },        // <-- required by your policy
      ],
      Fields: {
        key,
        "Content-Type": type,
        "x-amz-server-side-encryption": "AES256",
      },
      Expires: 300, // seconds
    });

    res.setHeader("cache-control", "no-store");
    res.status(200).json({ url, fields, key });
  } catch (err) {
    res.status(500).json({
      error: "presign failed",
      detail: String(err?.message || err),
    });
  }
}
'@ | Out-File -Encoding utf8 -NoNewline .\api\s3-presign.js
