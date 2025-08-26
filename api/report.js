// api/report.js  (Vercel Node.js 20, ESM)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const config = { api: { bodyParser: false } };

// ==== ENV ====
const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET; // e.g. virtualcoachai-prod

if (!BUCKET) {
  console.warn("[/api/report] Missing S3_UPLOAD_BUCKET env var");
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

function baseKey(key) {
  return String(key || "").replace(/\.[a-z0-9]+$/i, "");
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  try { return JSON.parse(buf.toString("utf8") || "{}"); }
  catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  try {
    const body = await readJson(req);
    const key = String(body.key || "");
    if (!key) {
      res.status(400).json({ error: "Missing key" });
      return;
    }
    const payload = JSON.stringify(body.report || {}, null, 2);
    const reportKey = `${baseKey(key)}.report.json`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: reportKey,
      Body: payload,
      ContentType: "application/json"
    }));

    res.status(200).json({ ok: true, reportKey });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
