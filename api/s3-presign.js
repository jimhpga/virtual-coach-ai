export const config = { runtime: "edge" };

import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const bucket =
  process.env.S3_BUCKET ||
  process.env.AWS_S3_BUCKET || // optional alias
  "";

const region =
  process.env.AWS_REGION ||
  process.env.S3_REGION ||
  process.env.AMS_REGION ||
  "us-west-1";

const accessKeyId =
  process.env.AWS_ACCESS_KEY_ID || process.env.AMS_ACCESS_KEY_ID || "";
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY || process.env.AMS_SECRET_ACCESS_KEY || "";

// Hard-fail early with a clear message (shows in Vercel logs; returns 500 to client)
function missing(msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  if (!bucket) return missing("S3_BUCKET missing");
  if (!accessKeyId || !secretAccessKey) return missing("AWS/AMS credentials missing");

  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  let payload = {};
  try { payload = await req.json(); } catch {}
  const { name, type = "application/octet-stream" } = payload;
  if (!name) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const safe = name.replace(/[^\w.\-()+]/g, "_").slice(-120);
  const key  = `uploads/${Date.now()}-${safe}`;

  // include SSE so it matches your bucket policy
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
      acl: "private",
    },
    Expires: 300,
  });

  return new Response(JSON.stringify({ url, fields, key, bucket, region }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
