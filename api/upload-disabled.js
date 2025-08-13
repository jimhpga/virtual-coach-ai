// /api/upload.js
import fs from "node:fs";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import formidable from "formidable";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const config = { api: { bodyParser: false } };

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Parse multipart form
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({
        multiples: false,
        maxFileSize: 500 * 1024 * 1024, // 500MB
        keepExtensions: true
      });
      form.parse(req, (err, flds, fls) => (err ? reject(err) : resolve({ fields: flds, files: fls })));
    });

    // Support 'file' (your current front end) or 'video' (older pages)
    let f = files.file || files.video;
    if (Array.isArray(f)) f = f[0];
    if (!f) return res.status(400).json({ error: "No file uploaded" });

    const original = f.originalFilename || "upload.mp4";
    const safeBase = original.replace(/[^\w.\-]+/g, "_");
    const key = `uploads/${new Date().toISOString().slice(0,10)}/${randomUUID()}-${safeBase}`;

    // Stream the temp file to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: fs.createReadStream(f.filepath),
        ContentType: f.mimetype || "application/octet-stream",
        Metadata: {
          handedness: (fields.handedness || "").toString(),
          eyedominance: (fields.eyeDominance || "").toString()
        }
      })
    );

    // Clean up temp file
    try { await promisify(fs.unlink)(f.filepath); } catch {}

    return res.status(200).json({
      ok: true,
      key,
      url: `s3://${process.env.S3_BUCKET}/${key}`
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
