import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION || "us-west-1";
const PREFIX = process.env.S3_PREFIX || "uploads/";
const MAX_MB = parseInt(process.env.S3_MAX_MB || "500", 10);

const s3 = new S3Client({ region: REGION });

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const filename = (req.query.filename || "upload.mp4").toString().replace(/\s+/g,"_");
    const contentType = (req.query.contentType || "application/octet-stream").toString();
    const key = `${PREFIX}${Date.now()}_${filename}`;
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 0, MAX_MB * 1024 * 1024],
        ["starts-with", "$Content-Type", ""]
      ],
      Fields: { "Content-Type": contentType },
      Expires: 3600
    });
    res.status(200).json({ url, fields });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "presign_failed" });
  }
}
