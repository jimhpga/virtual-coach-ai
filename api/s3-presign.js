export const config = { runtime: "edge" };

import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const region = process.env.S3_REGION || "us-west-1";
const bucket = process.env.S3_BUCKET;

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let payload = {};
  try { payload = await req.json(); } catch {}
  const { name, type = "application/octet-stream" } = payload;
  if (!name) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const key  = `uploads/${Date.now()}-${safe}`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 2 * 1024 * 1024 * 1024],
      ["starts-with", "$Content-Type", ""],
    ],
    Fields: { key, "Content-Type": type },
    Expires: 300,
  });

  return new Response(JSON.stringify({ url, fields, key, bucket, region }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
