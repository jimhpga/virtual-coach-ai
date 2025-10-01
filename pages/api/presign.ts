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
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"POST only" });

  try {
    const { filename = "upload.mp4", type = "video/mp4" } = (req.body || {}) as { filename?: string; type?: string };

    // Store under uploads/ with a timestamp-based key
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
    const key = `uploads/${stamp}-${Math.random().toString(16).slice(2,8)}-${filename.replace(/\s+/g, "_")}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: BUCKET,
      Key: key,
      Expires: 300, // 5 minutes
      Conditions: [
        ["content-length-range", 0, 1024*1024*1024], // up to 1 GB
        ["starts-with", "$Content-Type", ""],
      ],
      Fields: {
        "Content-Type": type || "video/mp4",
      },
    });

    res.status(200).json({ ok:true, url, fields, key });
  } catch (e:any) {
    res.status(500).json({ ok:false, error: e?.message || "presign failed" });
  }
}
