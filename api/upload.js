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
const uploadsPrefix = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "").replace(/\/?$/, "/");

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

function setCORS(res) {
  // Adjust origin to your domain if you want to lock this down
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function cleanName(name = "video.mp4") {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}
function normalizeKey(k) {
  const safe = cleanName(k).replace(/^\/+/, "");
  return safe.startsWith(uploadsPrefix) ? safe : `${uploadsPrefix}${safe}`;
}
function makeKey(originalFilename = "video.mp4") {
  const ts = Date.now();
  const safe = cleanName(originalFilename);
  const ext = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `${uploadsPrefix}${ts}-${base}.${ext}`;
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") {
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
  // Body: { filename, type, key? }
  // ─────────────────────────────────────────────────────────────────────────────
  if (ct.includes("application/json")) {
    try {
      const { filename = "video.mp4", type = "application/octet-stream", key } =
        (await readJson(req)) || {};
      const finalKey = key ? normalizeKey(key) : makeKey(filename);
      const putUrl = await presignPut(finalKey, type); // 15 min PUT

      return res.status(200).json({ key: finalKey, putUrl });
    } catch (err) {
      console.error("Init JSON error:", err);
      return res.status(400).json({ error: "Bad JSON request" });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MODE 2: multipart/form-data -> stream to S3
  // fields:
  //  - file (preferred) OR video
  //  - key (optional; if present we use/normalize it)
  //  - intake (optional JSON string; stored as <key>.intake.json)
  // ─────────────────────────────────────────────────────────────────────────────
  const bb = Busboy({ headers: req.headers });
  let providedKey = null;
  let intakeJson = null;
  let lastKey = null;
  const uploads = [];

  const done = new Promise((resolve, reject) => {
    bb.on("field", (name, val) => {
      if (name === "key" && val) providedKey = normalizeKey(val);
      if (name === "intake" && val) intakeJson = val;
    });

    bb.on("file", (name, file, info) => {
      if (name !== "file" && name !== "video") {
        // Drain unknown fields
        file.resume();
        return;
      }
      const { filename = "video.mp4", mimeType } = info || {};
      const s3Key = providedKey || makeKey(filename);
      lastKey = s3Key;

      // Push the S3 upload promise so we can await all after 'finish'
      const p = s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: file, // stream directly to S3
          ContentType: mimeType || "application/octet-stream"
        })
      );
      uploads.push(p);
    });

    bb.on("error", reject);
    bb.on("finish", resolve);
  });

  req.pipe(bb);

  try {
    await done;                 // busboy finished parsing
    await Promise.all(uploads); // ensure S3 uploads actually completed

    if (!lastKey) {
      return res.status(400).json({ error: "No file received (use field 'file' or 'video')" });
    }

    // Save optional intake JSON alongside upload (non-fatal if it fails)
    if (intakeJson) {
      const base = lastKey.replace(/\.[a-z0-9]+$/i, "");
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

    // 24h presigned GET (useful for manual checks)
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: lastKey }),
      { expiresIn: 60 * 60 * 24 }
    );

    return res.status(200).json({
      status: "stored",
      key: lastKey,
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
  const txt = buf.toString("utf8").trim();
  return txt ? JSON.parse(txt) : {};
}

async function presignPut(Key, ContentType) {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key, ContentType });
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 minutes
}
