// /api/gateway.js
// One function that handles several API routes.
// IMPORTANT: Requires env vars in Vercel:
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=us-west-2
//   S3_UPLOAD_BUCKET=virtualcoachai-prod
//   S3_UPLOAD_PREFIX=uploads/

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET;
const PREFIX = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");
const HAVE_CREDS = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

const s3 = new S3Client({
  region: REGION,
  credentials: HAVE_CREDS
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return {}; }
}

function cleanName(name = "video.mp4") {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}
function makeKey(originalFilename = "video.mp4") {
  const ts = Date.now();
  const safe = cleanName(originalFilename);
  const ext = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `${PREFIX}${ts}-${base}.${ext}`;
}

async function presignPut(Key, ContentType = "application/octet-stream") {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key, ContentType });
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 minutes
}

export default async function handler(req, res) {
  // Route parsing
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/?/, "").toLowerCase(); // e.g. "upload", "ping", "env-check"

  // Simple CORS for local/dev if needed (same-origin in prod is fine)
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (path === "ping" && req.method === "GET") {
    return json(res, 200, { pong: true, time: Date.now() });
  }

  if (path === "env-check" && req.method === "GET") {
    return json(res, 200, {
      ok: !!(BUCKET && HAVE_CREDS),
      region: REGION,
      bucket: BUCKET || null,
      hasAwsCreds: HAVE_CREDS
    });
  }

  if (path === "upload" && req.method === "POST") {
    if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured (S3_UPLOAD_BUCKET)" });
    if (!HAVE_CREDS) return json(res, 500, { error: "AWS credentials not configured" });

    const ctype = req.headers["content-type"] || "";

    // JSON init mode → return { key, putUrl }
    if (ctype.includes("application/json")) {
      const { filename = "video.mp4", type = "application/octet-stream", key } = await readJson(req);
      const finalKey = key || makeKey(filename);
      try {
        const putUrl = await presignPut(finalKey, type || "application/octet-stream");
        return json(res, 200, { key: finalKey, putUrl });
      } catch (e) {
        console.error("presign error:", e);
        return json(res, 500, { error: "Failed to presign upload URL" });
      }
    }

    // Block multipart proxy uploads on Hobby (prevents 413)
    return json(res, 413, {
      error: "Proxy upload blocked. Use JSON init to get a presigned S3 URL.",
      howTo: "POST application/json to /api/upload with { filename, type }"
    });
  }

  // Unknown /api route
  return json(res, 404, { error: "Not Found", path });
}
