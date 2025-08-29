// /api/report.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function jobIdFromKey(key) {
  const base = String(key).replace(/^uploads\//, "");
  return base.replace(/\.[^.]+$/, "");
}

export default async function handler(request) {
  try {
    if (request.method !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }
    if (!BUCKET || !REGION) {
      return json(500, { ok: false, error: "Missing S3 env (S3_BUCKET, AWS_REGION)" });
    }
    const body = await request.json().catch(() => ({}));
    let { jobId, status = "ready", data = {}, key } = body;

    if (!jobId && key) jobId = jobIdFromKey(key);
    if (!jobId) return json(400, { ok: false, error: "Missing jobId or key" });

    const s3 = new S3Client({ region: REGION });
    const statusKey = `status/${jobId}.json`;
    const payload = {
      status,
      ...("size" in data ? { size: data.size } : {}),
      ...("type" in data ? { type: data.type } : {}),
      ...("etag" in data ? { etag: data.etag } : {}),
      t: Date.now()
    };

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: statusKey,
      Body: JSON.stringify(payload),
      ContentType: "application/json"
    }));

    return json(200, { ok: true, bucket: BUCKET, key: statusKey, wrote: payload });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
