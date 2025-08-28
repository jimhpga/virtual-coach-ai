import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { jobId, key, contentType } = body;
    if (!jobId && !key) return res.status(400).json({ error: "Missing jobId or key" });

    const Bucket = process.env.S3_BUCKET;
    const Key = key || `uploads/${jobId}.mp4`;
    const ContentType = contentType || "video/mp4";

    const cmd = new PutObjectCommand({ Bucket, Key, ContentType });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 });
    res.status(200).json({ url, bucket: Bucket, key: Key, contentType: ContentType });
  } catch (e) {
    res.status(500).json({ error: e?.message || "upload-signing-failed" });
  }
}
