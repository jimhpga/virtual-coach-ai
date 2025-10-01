// pages/api/presign.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-1";
const BUCKET = process.env.S3_BUCKET!;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { filename, type } = req.body || {};
  if (!filename || !type) return res.status(400).json({ error: "filename and type required" });

  // key: uploads/{timestamp}-{rand}-{safe-filename}
  const safe = String(filename).replace(/[^\w.\-]+/g, "_");
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Expires: 3600,
    Fields: { "Content-Type": type },
    Conditions: [
      ["starts-with", "$Content-Type", type.split("/")[0] + "/"],
      ["content-length-range", 0, 500 * 1024 * 1024], // 500 MB
    ],
  });

  res.status(200).json({ url, fields, key });
}
