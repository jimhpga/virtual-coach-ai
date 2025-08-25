// /api/gateway.js  — single function that handles all API routes
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = { api: { bodyParser: false } };

const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const S3_UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET;             // e.g. "virtualcoachai-prod"
const S3_UPLOAD_PREFIX = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

function cleanName(name = "video.mp4") {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}
function makeKey(filename = "video.mp4") {
  const safe = cleanName(filename);
  const ts = Date.now();
  const ext = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `${S3_UPLOAD_PREFIX}${ts}-${base}.${ext}`;
}
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return {}; }
}

export default async function handler(req, res) {
  // the rewrite sends /api/* here; figure out the subpath
  const u = new URL(req.url, "http://x");
  const path = (u.pathname.replace(/^\/api\/?/, "") || "").split("/").filter(Boolean)[0] || "";

  // sanity
  if (!S3_UPLOAD_BUCKET) {
    return res.status(500).json({ error: "S3 bucket not configured (S3_UPLOAD_BUCKET)" });
  }

  // GET /api/ping
  if (req.method === "GET" && path === "ping") {
    return res.status(200).json({ ok: true, pong: true });
  }

  // GET /api/env
  if (req.method === "GET" && path === "env") {
    return res.status(200).json({
      ok: true,
      region: AWS_REGION,
      bucket_set: !!S3_UPLOAD_BUCKET,
      prefix: S3_UPLOAD_PREFIX
    });
  }

  // POST /api/presign  -> returns { key, putUrl }
  if (req.method === "POST" && path === "presign") {
    try {
      const { filename = "video.mp4", type = "application/octet-stream", key } = await readJson(req);
      const finalKey = key || makeKey(filename);
      const cmd = new PutObjectCommand({
        Bucket: S3_UPLOAD_BUCKET,
        Key: finalKey,
        ContentType: type || "application/octet-stream"
      });
      const putUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 min
      return res.status(200).json({ key: finalKey, putUrl });
    } catch (e) {
      console.error("presign error:", e);
      return res.status(400).json({ error: "Bad request to /api/presign" });
    }
  }

  // anything else
  return res.status(404).json({ error: "Not found" });
}
