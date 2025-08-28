import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const jobId = body.jobId || "unknown";
    const status = body.status || "pending";
    const data = { status, ...body.data };

    const Bucket = process.env.S3_BUCKET;
    const Key = `status/${jobId}.json`;

    await s3.send(new PutObjectCommand({
      Bucket,
      Key,
      Body: JSON.stringify(data),
      ContentType: "application/json"
    }));

    res.status(200).json({ ok: true, Bucket, Key, wrote: data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "report-write-failed" });
  }
}
