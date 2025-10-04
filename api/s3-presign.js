export const config = { runtime: "edge" };

import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const region = process.env.S3_REGION || process.env.AWS_REGION || "us-west-1";
const bucket = process.env.S3_BUCKET;

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,       // <-- fix
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY // <-- fix
  },
});

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { name, type = "application/octet-stream" } = await req.json().catch(() => ({}));
  if (!name) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  // sanitize & keep under uploads/
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160);
  const key  = `uploads/${Date.now()}-${safe}`;

  const params = {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 2 * 1024 * 1024 * 1024], // up to 2GB
      ["starts-with", "$Content-Type", ""],
      // If (and only if) your bucket policy REQUIRES SSE, uncomment the next line
      // { "x-amz-server-side-encryption": "AES256" },
    ],
    Fields: {
      key,
      "Content-Type": type,
      // If using SSE (above), also include the matching field:
      // "x-amz-server-side-encryption": "AES256",
      // DO NOT include `acl` when Bucket Owner Enforced is on
    },
    Expires: 300,
  };

  const { url, fields } = await createPresignedPost(s3, params);

  return new Response(JSON.stringify({ url, fields, key, bucket }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
