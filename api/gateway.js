// /api/gateway.js
// One serverless function to stay under the Hobby 12-function limit.
// Handles: upload (JSON init + multipart), intake, analyze (stub), qc (basic).
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Busboy from "busboy";

export const config = { api: { bodyParser: false } };

const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET;
const uploadsPrefix = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

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
  const raw = buf.toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}
async function presignPut(Key, ContentType) {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key, ContentType });
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 min
}

export default async function handler(req, res) {
  if (!bucket) return res.status(500).json({ error: "S3 bucket not configured (S3_UPLOAD_BUCKET)" });
  if (req.method === "OPTIONS") return res.status(204).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  // op comes from rewrites (e.g. /api/upload -> /api/gateway?op=upload) or direct query
  const op = url.searchParams.get("op") || "upload";
  const ct = req.headers["content-type"] || "";

  try {
    switch (op) {
      // ───────────────────────────────────────── upload ─────────────────────────────────────────
      case "upload": {
        if (ct.includes("application/json")) {
          // JSON init -> give browser a presigned PUT
          const { filename = "video.mp4", type = "application/octet-stream", key } = await readJson(req);
          const finalKey = key || makeKey(filename);
          const putUrl = await presignPut(finalKey, type);
          return res.status(200).json({ key: finalKey, putUrl });
        }

        // multipart -> stream to S3 (accepts field name "file" or "video"; optional "key", "intake")
        const bb = Busboy({ headers: req.headers });
        let fileKey = null, fileUploaded = false, providedKey = null, intakeJson = null, fileInfo = null;

        const done = new Promise((resolve, reject) => {
          bb.on("field", (name, val) => {
            if (name === "key" && val) providedKey = String(val);
            if (name === "intake" && val) intakeJson = val;
          });
          bb.on("file", async (name, file, info) => {
            if (name !== "file" && name !== "video") { file.resume(); return; }
            const { filename = "video.mp4", mimeType } = info || {};
            fileInfo = info;
            fileKey = providedKey || makeKey(filename);
            try {
              await s3.send(new PutObjectCommand({
                Bucket: bucket, Key: fileKey, Body: file, ContentType: mimeType || "application/octet-stream"
              }));
              fileUploaded = true;
            } catch (err) { reject(err); }
          });
          bb.on("error", reject);
          bb.on("finish", resolve);
        });

        req.pipe(bb);
        await done;

        if (!fileUploaded || !fileKey) return res.status(400).json({ error: "No file received (use field 'file' or 'video')" });

        // optional intake JSON beside the video
        if (intakeJson) {
          const base = fileKey.replace(/\.[a-z0-9]+$/i, "");
          try {
            await s3.send(new PutObjectCommand({
              Bucket: bucket, Key: `${base}.intake.json`, Body: intakeJson, ContentType: "application/json"
            }));
          } catch (e) { console.warn("Failed to store intake JSON:", e); }
        }

        const downloadUrl = await getSignedUrl(
          s3, new GetObjectCommand({ Bucket: bucket, Key: fileKey }), { expiresIn: 60 * 60 * 24 }
        );
        return res.status(200).json({ status: "stored", key: fileKey, downloadUrl, fileInfo });
      }

      // ───────────────────────────────────────── intake ─────────────────────────────────────────
      case "intake": {
        const body = await readJson(req);
        const { key, intake } = body || {};
        if (!key || !intake) return res.status(400).json({ error: "Missing key or intake" });
        const base = key.replace(/\.[a-z0-9]+$/i, "");
        await s3.send(new PutObjectCommand({
          Bucket: bucket, Key: `${base}.intake.json`, Body: JSON.stringify(intake), ContentType: "application/json"
        }));
        return res.status(200).json({ ok: true });
      }

      // ───────────────────────────────────────── analyze (stub so UI works) ─────────────────────
      case "analyze": {
        // If you have a real analyzer, paste that logic here and return {status:"pending"} or {status:"ready", report:{...}}
        // For now: pretend it's ready so you can test the UI end-to-end.
        const key = url.searchParams.get("key") || (await readJson(req)).key;
        if (!key) return res.status(400).json({ error: "Missing key" });

        // Optional: treat presence of <key>.report.json as "ready"
        const base = key.replace(/\.[a-z0-9]+$/i, "");
        try {
          await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: `${base}.report.json` }));
          const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: `${base}.report.json` }), { expiresIn: 3600 });
          return res.status(200).json({ status: "ready", reportUrl: downloadUrl });
        } catch {
          // No stored report; return ready with a tiny stub so the page continues
          return res.status(200).json({ status: "ready", report: { stub: true } });
        }
      }

      // ───────────────────────────────────────── qc (simple sanity checks) ──────────────────────
      case "qc": {
        const key = url.searchParams.get("key");
        if (!key) return res.status(400).json({ error: "Missing key" });

        const base = key.replace(/\.[a-z0-9]+$/i, "");
        let intake = null;
        try {
          const get = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `${base}.intake.json` }));
          const text = await streamToString(get.Body);
          intake = JSON.parse(text);
        } catch {}

        // Very light guardrails: height range + required eye
        const height = Number(intake?.height || 0);
        const eye = String(intake?.eye || "").toLowerCase();
        if (!eye || !(height >= 40 && height <= 90)) {
          return res.status(200).json({ status: "warn", issues: ["Missing/invalid eye or height"] });
        }
        return res.status(200).json({ status: "ok" });
      }

      default:
        return res.status(404).json({ error: "Unknown op" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
