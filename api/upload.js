// /api/upload.js
// Node runtime route. Supports BOTH:
//  1) JSON init -> returns { key, putUrl } for browser direct-to-S3
//  2) multipart/form-data -> streams to S3 (fields: "file" or "video"), returns {status,key,downloadUrl}

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Busboy from "busboy";

export const config = {
  api: { bodyParser: false } // we handle multipart ourselves
};

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

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    // (optional CORS preflight support if you need it)
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  if (!bucket) {
    res.status(500).json({ error: "S3 bucket not configured (S3_UPLOAD_BUCKET)" });
    return;
  }

  const ct = req.headers["content-type"] || "";

  // ─────────────────────────────────────────────────────────────────────────────
  // MODE 1: JSON init -> return { key, putUrl }
  // Called by getUploadTarget(file, key) in your front-end.
  // Body shape: { filename, type, key? }
  // ─────────────────────────────────────────────────────────────────────────────
  if (ct.includes("application/json")) {
    try {
      const { filename = "video.mp4", type = "application/octet-stream", key } =
        (await readJson(req)) || {};
      const finalKey = key || makeKey(filename);

      // Presign PUT for 15 minutes
      const putUrl = await presignPut(finalKey, type);

      return res.status(200).json({ key: finalKey, putUrl });
    } catch (err) {
      console.error("Init JSON error:", err);
      return res.status(400).json({ error: "Bad JSON request" });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MODE 2: multipart/form-data -> stream to S3
  // Accepts fields:
  //   - file  (preferred) or video (also accepted)
  //   - key   (optional; if present we use it)
  //   - intake (optional JSON string; stored as <key>.intake.json)
  // ─────────────────────────────────────────────────────────────────────────────
  const bb = Busboy({ headers: req.headers });
  let fileKey = null;
  let fileUploaded = false;
  let providedKey = null;
  let intakeJson = null;

  const done = new Promise((resolve, reject) => {
    bb.on("field", (name, val) => {
      if (name === "key" && val) providedKey = String(val);
      if (name === "intake" && val) intakeJson = val;
    });

    bb.on("file", async (name, file, info) => {
      // Accept "file" or "video"
      if (name !== "file" && name !== "video") {
        file.resume();
        return;
      }
      const { filename = "video.mp4", mimeType } = info || {};
      fileKey = providedKey || makeKey(filename);

      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: fileKey,
            Body: file, // stream directly to S3
            ContentType: mimeType || "application/octet-stream"
          })
        );
        fileUploaded = true;
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

    if (!fileUploaded || !fileKey) {
      return res.status(400).json({ error: "No file received (use field 'file' or 'video')" });
    }

    // Save optional intake JSON next to the upload (non-fatal on error)
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
        console.warn("Failed to store intake JSON:", e);
      }
    }

    // 24h presigned download URL (handy for debugging / manual checks)
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: fileKey }),
      { expiresIn: 60 * 60 * 24 }
    );

    return res.status(200).json({
      status: "stored",
      key: fileKey, // e.g., uploads/1724460000-myswing.mov
      downloadUrl
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

/* ------------------------- helpers ------------------------- */

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  return JSON.parse(buf.toString("utf8") || "{}");
}
async function presignPut(Key, ContentType) {
  // We presign a PUT directly to your bucket
  const dummy = new PutObjectCommand({ Bucket: bucket, Key, ContentType });
  return getSignedUrl(s3, dummy, { expiresIn: 60 * 15 }); // 15 minutes
}
