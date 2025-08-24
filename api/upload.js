// api/upload.js
// Node runtime route (NOT edge). Streams video to S3 and returns a presigned download URL.

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Busboy from "busboy";

export const config = {
  api: { bodyParser: false } // important: we handle multipart ourselves
};

const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET;
const uploadsPrefix = process.env.S3_UPLOAD_PREFIX || "uploads/";

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

function makeKey(originalFilename = "video.mp4") {
  const ts = Date.now();
  const clean = String(originalFilename).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  // keep whatever extension was provided; we'll also handle non-mp4 in analyze.js below
  const ext = (clean.split(".").pop() || "mp4").toLowerCase();
  const base = clean.replace(/\.[a-z0-9]+$/i, "");
  return `${uploadsPrefix}${ts}-${base}.${ext}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  if (!bucket) {
    res.status(500).json({ error: "S3 bucket not configured (S3_UPLOAD_BUCKET)" });
    return;
  }

  const bb = Busboy({ headers: req.headers });
  let fileKey = null;
  let fileUploaded = false;
  let intakeJson = null;

  const done = new Promise((resolve, reject) => {
    bb.on("field", (name, val) => {
      if (name === "intake") intakeJson = val;
    });

    bb.on("file", async (name, file, info) => {
      if (name !== "video") { file.resume(); return; }
      const { filename, mimeType } = info || {};
      fileKey = makeKey(filename || "video.mp4");

      try {
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: fileKey,
          Body: file,           // stream directly to S3
          ContentType: mimeType || "application/octet-stream"
        }));
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
      return res.status(400).json({ error: "No video file received" });
    }

    // Optionally store intake JSON alongside the upload
    if (intakeJson) {
      const base = fileKey.replace(/\.[a-z0-9]+$/i, "");
      try {
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: `${base}.intake.json`,
          Body: intakeJson,
          ContentType: "application/json"
        }));
      } catch (e) {
        // non-fatal — keep going
        console.warn("Failed to store intake JSON:", e);
      }
    }

    // 24h presigned download URL
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: fileKey }),
      { expiresIn: 60 * 60 * 24 }
    );

    return res.status(200).json({
      status: "stored",
      key: fileKey,         // e.g., uploads/1724460000-myswing.mov
      downloadUrl: url
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
