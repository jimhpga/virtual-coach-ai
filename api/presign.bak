// /api/presign.js   (CommonJS, zero framework)
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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
  try { return JSON.parse(buf.toString("utf8") || "{}"); } catch { return {}; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  if (!BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    res.status(500).json({ error: "Missing S3 env vars" });
    return;
  }

  try {
    const { filename = "video.mp4", type = "application/octet-stream", key } = await readJson(req);
    const finalKey = key || makeKey(filename);

    const s3 = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, ContentType: type });
    const putUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 min

    res.status(200).json({ key: finalKey, putUrl });
  } catch (err) {
    console.error("presign error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
};
