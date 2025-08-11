// /api/upload.js
import path from "path";
import fs from "fs/promises";
import formidable from "formidable";

export const config = { api: { bodyParser: false } };

// Use /tmp on Vercel, public/uploads locally
const UPLOAD_DIR = process.env.VERCEL
  ? "/tmp/uploads"
  : path.join(process.cwd(), "public", "uploads");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const form = formidable({
      multiples: false,
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      // Optional: control filename
      filename: (name, ext, part) => {
        const base = (part.originalFilename || "upload").replace(/\s+/g, "_");
        const stamp = Date.now();
        return `${base}.${stamp}${ext}`;
      },
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
    });

    // Accept either 'file' (frontend) or 'video' (your old code)
    let f = files.file || files.video;
    if (Array.isArray(f)) f = f[0];
    if (!f) return res.status(400).json({ error: "No file uploaded" });

    // NOTE: On Vercel, the file now lives in /tmp/uploads and is ephemeral.
    // If you need to keep it, upload to S3 here.

    const filename = path.basename(f.filepath || f.file || "");
    const handedness = fields.handedness || null;
    const eyeDominance = fields.eyeDominance || null;

    return res.status(200).json({
      ok: true,
      filename,
      size: f.size,
      type: f.mimetype,
      handedness,
      eyeDominance,
      // For local dev you can serve from /public/uploads; /tmp is not web-served on Vercel
      localUrl: process.env.VERCEL ? null : `/uploads/${filename}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
