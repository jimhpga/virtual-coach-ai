export const config = { runtime: "edge" };

import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.AMS_REGION || "us-west-1",
  credentials: {
    accessKeyId: process.env.AMS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AMS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { name, type } = await req.json();
  if (!name) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // sanitize file name and keep everything under uploads/
  const safe = name.replace(/[^\w.\-()+]/g, "_");
  const key  = `uploads/${Date.now()}-${safe}`;

  // Bucket policy requires SSE; include it in both Conditions & Fields
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 200_000_000],      // up to 200 MB
      ["starts-with", "$Content-Type", ""],
      { "x-amz-server-side-encryption": "AES256" },  // <- important
      { acl: "private" },
    ],
    Fields: {
      key,
      "Content-Type": type || "application/octet-stream",
      "x-amz-server-side-encryption": "AES256",
      acl: "private",
    },
    Expires: 60, // seconds
  };

  const { url, fields } = await createPresignedPost(s3, params);

  return new Response(JSON.stringify({ url, fields, key }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
