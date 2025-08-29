// /api/health.js
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;

export default async function handler(_req) {
  const out = {
    ok: true,
    env: {
      S3_BUCKET: !!BUCKET,
      AWS_REGION: !!REGION,
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY
    },
    note: "Presence check only. Does not validate permissions."
  };
  try {
    if (BUCKET && REGION) {
      const s3 = new S3Client({ region: REGION });
      // harmless head on bucket root (will likely 403/404 if no perms; that's fine)
      try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: "does-not-exist" })); }
      catch { /* ignore */ }
    }
  } catch (e) {
    out.ok = false;
    out.error = e?.message || String(e);
  }
  return new Response(JSON.stringify(out), {
    headers: { "Content-Type": "application/json" }
  });
}
