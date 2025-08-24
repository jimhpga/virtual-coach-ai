// /api/gateway.js
// Single Serverless Function that handles ALL API routes via rewrites:
//   GET  /api/ping
//   GET  /api/version
//   GET  /api/env-check
//   POST /api/upload        (JSON presign OR multipart stream to S3)
//   POST /api/intake        (store intake JSON next to the video)
//   GET  /api/analyze?key=  (stub: ready)
//   GET  /api/qc?key=       (stub: ok)

import Busboy from "busboy";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = { api: { bodyParser: false } };

// ---- ENV ----
const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET || "";
const uploadsPrefix = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");

// S3 client
const hasS3 =
  !!bucket && !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;

const s3 = hasS3
  ? new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    })
  : null;

// ---- helpers ----
function nowISO() { return new Date().toISOString(); }

function cleanName(name = "video.mp4") {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}
function makeKey(originalFilename = "video.mp4") {
  const ts = Date.now();
  const safe = cleanName(originalFilename);
  const ext = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `${uploadsPrefix}${ts}-${base}.${ext}`;
}
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  const txt = buf.toString("utf8") || "{}";
  return JSON.parse(txt);
}
function send(res, code, body) {
  res.status(code).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
async function presignPut(Key, ContentType) {
  if (!hasS3) throw new Error("S3 not configured");
  const cmd = new PutObjectCommand({ Bucket: bucket, Key, ContentType });
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 min
}
async function signGet(Key) {
  if (!hasS3) throw new Error("S3 not configured");
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key }), {
    expiresIn: 60 * 60 * 24
  });
}

// ---- tiny router (because all requests are rewritten here) ----
function getRoute(req) {
  // Example: /api/upload?x=1 -> "upload"
  try {
    const url = new URL(req.url, "http://local");
    const path = url.pathname.replace(/^\/api\//, ""); // remove leading "/api/"
    const seg = path.split("/")[0] || "";
    return seg.toLowerCase();
  } catch {
    return "";
  }
}

// ---- route handlers ----
async function handlePing(req, res) {
  return send(res, 200, { pong: true, time: nowISO() });
}
async function handleVersion(req, res) {
  return send(res, 200, {
    version: "v1",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    time: nowISO()
  });
}
async function handleEnvCheck(req, res) {
  return send(res, 200, {
    region,
    bucket,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecret: !!process.env.AWS_SECRET_ACCESS_KEY,
    hasS3
  });
}

async function handleUpload(req, res) {
  const ct = req.headers["content-type"] || "";

  // MODE A: JSON -> return {key, putUrl}
  if (ct.includes("application/json")) {
    try {
      const { filename = "video.mp4", type = "application/octet-stream", key } =
        (await readJson(req)) || {};
      const finalKey = key || makeKey(filename);
      if (!hasS3) {
        // No S3? still return a key so frontend can POST multipart fallback (also handled here)
        return send(res, 200, { key: finalKey, putUrl: null, note: "S3 not configured" });
      }
      const putUrl = await presignPut(finalKey, type);
      return send(res, 200, { key: finalKey, putUrl });
    } catch (e) {
      console.error("upload JSON init error:", e);
      return send(res, 400, { error: "Bad JSON request" });
    }
  }

  // MODE B: multipart -> stream to S3 immediately
  if (!hasS3) return send(res, 500, { error: "S3 not configured" });

  const bb = Busboy({ headers: req.headers });
  let providedKey = null;
  let intakeJson = null;
  let fileKey = null;
  let uploaded = false;

  const done = new Promise((resolve, reject) => {
    bb.on("field", (name, val) => {
      if (name === "key" && val) providedKey = String(val);
      if (name === "intake" && val) intakeJson = String(val);
    });

    bb.on("file", async (name, file, info) => {
      if (name !== "file" && name !== "video") { file.resume(); return; }
      const { filename = "video.mp4", mimeType } = info || {};
      fileKey = providedKey || makeKey(filename);
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: fileKey,
            Body: file,
            ContentType: mimeType || "application/octet-stream"
          })
        );
        uploaded = true;
      } catch (err) {
        reject(err);
      }
    });

    bb.on("error", reject);
    bb.on("finish", resolve);
  });

  req.pipe(bb);

  try {
    await done;
    if (!uploaded || !fileKey) return send(res, 400, { error: "No file received" });

    if (intakeJson) {
      const base = fileKey.replace(/\.[a-z0-9]+$/i, "");
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `${base}.intake.json`,
            Body: intakeJson,
            ContentType: "application/json"
          })
        );
      } catch (e) {
        console.warn("intake store failed:", e);
      }
    }

    const downloadUrl = await signGet(fileKey);
    return send(res, 200, { status: "stored", key: fileKey, downloadUrl });
  } catch (e) {
    console.error("upload multipart error:", e);
    return send(res, 500, { error: String(e.message || e) });
  }
}

async function handleIntake(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method Not Allowed" });
  if (!hasS3) return send(res, 500, { error: "S3 not configured" });

  try {
    const { key, intake } = await readJson(req);
    if (!key) return send(res, 400, { error: "Missing key" });
    const base = key.replace(/\.[a-z0-9]+$/i, "");
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${base}.intake.json`,
        Body: JSON.stringify(intake ?? {}, null, 2),
        ContentType: "application/json"
      })
    );
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("intake error:", e);
    return send(res, 500, { error: String(e.message || e) });
  }
}

// Stubs so the UI works now (replace with your real analyzer when ready)
async function handleAnalyze(req, res) {
  const url = new URL(req.url, "http://local");
  const key = url.searchParams.get("key") || "";
  if (!key) return send(res, 400, { error: "Missing key" });
  return send(res, 200, { status: "ready" });
}
async function handleQC(req, res) {
  const url = new URL(req.url, "http://local");
  const key = url.searchParams.get("key") || "";
  if (!key) return send(res, 400, { error: "Missing key" });
  return send(res, 200, { status: "ok", warnings: [] });
}

// ---- main ----
export default async function handler(req, res) {
  const route = getRoute(req);

  try {
    if (req.method === "GET" && route === "ping")       return handlePing(req, res);
    if (req.method === "GET" && route === "version")    return handleVersion(req, res);
    if (req.method === "GET" && route === "env-check")  return handleEnvCheck(req, res);

    if (route === "upload" && req.method === "POST")    return handleUpload(req, res);
    if (route === "intake" && req.method === "POST")    return handleIntake(req, res);
    if (route === "analyze" && req.method === "GET")    return handleAnalyze(req, res);
    if (route === "qc" && req.method === "GET")         return handleQC(req, res);

    return send(res, 404, { error: "Not Found", route });
  } catch (e) {
    console.error("unhandled api error:", e);
    return send(res, 500, { error: String(e.message || e) });
  }
}
