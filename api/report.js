// /api/report.js  (Vercel Node.js 20, ESM)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const config = { api: { bodyParser: false } };

// ==== ENV ====
const REGION  = process.env.AWS_REGION || "us-west-2";
const BUCKET  = process.env.S3_UPLOAD_BUCKET;          // e.g. "virtualcoachai-prod"
const PREFIX  = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");
const ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://virtualcoachai.net,https://virtualcoachai-homepage.vercel.app")
  .split(",").map(s => s.trim()).filter(Boolean);

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

// ==== helpers ====
function baseKey(key) {
  return String(key || "").replace(/\.[a-z0-9]+$/i, "");
}
function setCORS(req, res) {
  const o = req.headers.origin || "";
  if (ORIGINS.includes(o)) res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Max-Age", "300");
}
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  try { return JSON.parse(buf.toString("utf8") || "{}"); }
  catch { return {}; }
}
function json(res, code, obj) {
  res.status(code).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

// ==== handler ====
export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method Not Allowed", allow: "POST" });
  }

  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });

  try {
    const body = await readJson(req);
    const key = String(body.key || "");
    if (!key) return json(res, 400, { error: "Missing key" });

    const report = body.report || {};
    const base = baseKey(key);
    const reportKey = `${base}.report.json`;
    const payload = JSON.stringify(report, null, 2);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: reportKey,
      Body: payload,
      ContentType: "application/json"
    }));

    return json(res, 200, { ok: true, reportKey });
  } catch (e) {
    return json(res, 500, { error: String(e.message || e) });
  }
}
