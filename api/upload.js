const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION });

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { jobId, key, contentType } = body;
    if (!jobId && !key) return res.status(400).json({ error: "Missing jobId or key" });

    const Bucket = process.env.S3_BUCKET;
    const Key = key || `uploads/${jobId}.mp4`;
    const ContentType = contentType || "video/mp4";

    const cmd = new PutObjectCommand({ Bucket, Key, ContentType });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min
    res.status(200).json({ url, bucket: Bucket, key: Key, contentType: ContentType });
  } catch (e) {
    res.status(500).json({ error: e?.message || "upload-signing-failed" });
  }
};
