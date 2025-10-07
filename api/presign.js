// npm deps are built into Vercel runtime, no need to install locally
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const { S3_BUCKET, AWS_REGION } = process.env;

const s3 = new S3Client({ region: AWS_REGION });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" }); // <-- kills your 405 confusion
  }

  try {
    const { filename, type = "video/mp4", size = 0 } =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    if (!filename) return res.status(400).json({ error: "filename required" });

    // Create a unique S3 key by date
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const key = `uploads/${y}/${m}/${d}/${Date.now()}-${filename.replace(/\s+/g, "_")}`;

    const maxSize = 1024 * 1024 * 200; // 200 MB — adjust if you need
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: S3_BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 0, maxSize],
        ["starts-with", "$Content-Type", ""]
      ],
      Fields: {
        "Content-Type": type
      },
      Expires: 60 // seconds
    });

    return res.status(200).json({ url, fields, key, maxSize });
  } catch (err) {
    return res.status(500).json({ error: "presign error", detail: String(err) });
  }
}
