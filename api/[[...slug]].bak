// /api/[[...slug]].js  (ESM, Node runtime)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET;

function cleanName(name = "video.mp4") {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}
function makeKey(originalFilename = "video.mp4") {
  const ts = Date.now();
  const safe = cleanName(originalFilename);
  const ext = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `uploads/${ts}-${base}.${ext}`;
}
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  return JSON.parse(buf.toString("utf8") || "{}");
}

export default async function handler(req, res) {
  try {
    const parts = Array.isArray(req.query.slug) ? req.query.slug : [];
    const path = parts.join("/");

    if (path === "ping") {
      res.status(200).json({ pong: true });
      return;
    }

    if (path === "env-check") {
      res.status(200).json({
        region: REGION,
        bucket: BUCKET,
        haveKeys: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      });
      return;
    }

    if (path === "presign") {
      if (req.method !== "POST") {
        res.status(405).json({ error: "POST only" });
        return;
      }
      if (!BUCKET) {
        res.status(500).json({ error: "Missing S3_UPLOAD_BUCKET env var" });
        return;
      }

      const { filename = "video.mp4", type = "application/octet-stream", key } = await readJson(req);
      const finalKey = key || makeKey(filename);

      const s3 = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });

      const put = new PutObjectCommand({
        Bucket: BUCKET,
        Key: finalKey,
        ContentType: type
      });

      const putUrl = await getSignedUrl(s3, put, { expiresIn: 60 * 15 }); // 15 min
      res.status(200).json({ key: finalKey, putUrl });
      return;
    }

    res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
