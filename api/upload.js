// /api/upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export default async function handler(request) {
  try {
    if (request.method !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }
    if (!BUCKET || !REGION) {
      return json(500, { ok: false, error: "Missing S3 env (S3_BUCKET, AWS_REGION)" });
    }

    const { key, contentType = "application/octet-stream" } = await request.json().catch(() => ({}));
    if (!key || typeof key !== "string") {
      return json(400, { ok: false, error: "Missing key" });
    }

    const s3 = new S3Client({ region: REGION });
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min
    return json(200, { ok: true, url, bucket: BUCKET, key, contentType });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
