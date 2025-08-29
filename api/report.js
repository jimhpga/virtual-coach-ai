// api/report.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const s3 = new S3Client({ region: REGION });

function jobIdFromKey(key) {
  const base = key.replace(/^uploads\//, "");
  return base.replace(/\.[^.]+$/, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    let { jobId, key, status, data } = body;

    if (!jobId && key) jobId = jobIdFromKey(key);
    if (!jobId) return res.status(400).json({ ok: false, error: "missing jobId or key" });

    status = status || "pending";
    const payload = { status, ...(data || {}) };

    if (!BUCKET || !REGION) {
      return res.status(500).json({
        ok: false,
        error: "missing env",
        details: { S3_BUCKET_present: !!BUCKET, AWS_REGION_present: !!REGION }
      });
    }

    const Key = `status/${encodeURIComponent(jobId)}.json`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key,
      Body: JSON.stringify(payload),
      ContentType: "application/json"
    }));

    return res.status(200).json({ ok: true, bucket: BUCKET, key: Key, wrote: payload });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "report-write-failed" });
  }
}
