export const config = { runtime: "nodejs" };

import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const region  = process.env.AWS_REGION || process.env.AMS_REGION || "us-west-1";
const bucket  = process.env.S3_BUCKET;
const accessKeyId     = process.env.AWS_ACCESS_KEY_ID || process.env.AMS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.AMS_SECRET_ACCESS_KEY;

const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return new Response(JSON.stringify({ error: "Missing AWS creds or S3_BUCKET" }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }

  let payload = {};
  try { payload = await req.json(); } catch {}
  const { name, type = "application/octet-stream" } = payload;
  if (!name) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  const safe = name.replace(/[^\w.\-()+]/g, "_").slice(-120);
  const key  = `uploads/${Date.now()}-${safe}`;

  // If your bucket policy enforces SSE, include it in both Conditions & Fields
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 2 * 1024 * 1024 * 1024],
      ["starts-with", "$Content-Type", ""],
      { "x-amz-server-side-encryption": "AES256" },
    ],
    Fields: {
      key,
      "Content-Type": type,
      "x-amz-server-side-encryption": "AES256",
      acl: "private"
    },
    Expires: 300,
  });

  return new Response(JSON.stringify({ url, fields, key, bucket, region }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
