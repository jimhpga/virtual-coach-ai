// api/s3-presign.js
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export const config = { runtime: "edge" };

const REGION = process.env.AWS_REGION || "us-west-1";
const BUCKET = process.env.S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  const { name, type } = await req.json();
  if (!name) return new Response(JSON.stringify({ error: "name required" }), { status: 400 });

  const key = `uploads/${Date.now()}-${name}`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 1500000000],                    // up to ~1.5GB
      ["starts-with", "$Content-Type", ""],                       // let browser send a type
      { acl: "private" },
      { "x-amz-server-side-encryption": "AES256" },               // << match IAM policy
    ],
    Fields: {
      "Content-Type": type || "application/octet-stream",
      acl: "private",
      "x-amz-server-side-encryption": "AES256",                   // << match IAM policy
    },
    Expires: 60, // seconds
  });

  return new Response(JSON.stringify({ url, fields, key, bucket: BUCKET }), {
    headers: { "content-type": "application/json" },
  });
}
