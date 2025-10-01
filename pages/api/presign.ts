import type { NextApiRequest, NextApiResponse } from "next";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
const BUCKET = process.env.S3_BUCKET!; // e.g. virtualcoachai-uploads

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !BUCKET) {
    return res.status(500).json({ ok:false, error:"Missing AWS env vars" });
  }

  const { filename = "video.mp4", type = "video/mp4" } = req.body || {};
  const safe = String(filename).replace(/[^\w.\-]/g, "_");
  const key = `uploads/${Date.now()}-${safe}`;

  const s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const post = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Fields: { "Content-Type": type },
    Conditions: [
      ["starts-with", "$Content-Type", ""],
      ["content-length-range", 0, 104857600]
    ],
    Expires: 600,
  });

  res.status(200).json({ url: post.url, fields: post.fields, key });
}
