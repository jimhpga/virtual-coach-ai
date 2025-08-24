// /api/intake.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET;
const intakesPrefix = process.env.S3_INTAKES_PREFIX || "intakes/";

if (!bucket) {
  console.warn("[/api/intake] Missing env S3_UPLOAD_BUCKET");
}

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Derive a few helpful flags server-side too (belt + suspenders)
function deriveHints(intake = {}) {
  const hand = String(intake.hand || "").toLowerCase();
  const eye  = String(intake.eye  || "").toLowerCase();
  const cross = hand && eye ? hand[0] !== eye[0] : false;
  let aim = "neutral";
  if (hand === "right" && eye === "left") aim = "left";
  if (hand === "left"  && eye === "right") aim = "right";

  const h = Number(intake.height || 0);
  const scale = h ? +(h / 70).toFixed(2) : "";

  return { cross_dominant: !!cross, aim_bias: aim, scale_factor: scale };
}

function keyToIntakePath(key) {
  // uploads/1692740000-swing.mp4  -> intakes/1692740000-swing.json
  const base = String(key).replace(/^uploads\//, "").replace(/\.[^.]+$/, "");
  return `${intakesPrefix}${base}.json`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { key, intake } = body;

    if (!key || typeof key !== "string" || !/^uploads\//.test(key)) {
      return res.status(400).json({ error: "Invalid or missing key (expected 'uploads/...')" });
    }
    if (!intake || typeof intake !== "object") {
      return res.status(400).json({ error: "Missing intake object" });
    }

    const payload = {
      key,
      intake,
      derived: deriveHints(intake),
      ts: Date.now(),
      ua: req.headers["user-agent"] || ""
    };

    const put = new PutObjectCommand({
      Bucket: bucket,
      Key: keyToIntakePath(key),
      Body: JSON.stringify(payload),
      ContentType: "application/json",
      CacheControl: "no-store"
    });

    await s3.send(put);
    return res.status(201).json({ ok: true, key, intakePath: keyToIntakePath(key) });
  } catch (err) {
    console.error("[/api/intake] Failed:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
