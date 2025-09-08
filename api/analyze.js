// api/analyze.js
const { S3Client, HeadObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

// --- required env ---
const BUCKET  = process.env.S3_BUCKET;          // e.g. "virtualcoachai-swings"
const REGION  = process.env.AWS_REGION;         // e.g. "us-west-1"
// optional but recommended
const STATUS  = process.env.S3_STATUS_PREFIX  || "status";
const REPORTS = process.env.S3_REPORT_PREFIX  || "reports";
const UPLOADS = process.env.S3_UPLOAD_PREFIX  || "uploads";

// shared S3 client — always set region explicitly
const s3 = new S3Client({ region: REGION });

// normalize & validate the uploads key
function normalizeUploadsKey(k) {
  if (!k) return null;
  const key = String(k).trim();
  // allow raw filename; prepend uploads/ if needed
  return key.startsWith(`${UPLOADS}/`) ? key : `${UPLOADS}/${key}`;
}
function jobIdFromUploadsKey(k) {
  // uploads/<jobId>.ext -> <jobId>
  return String(k).replace(new RegExp(`^${UPLOADS}/`), "").replace(/\.[^.]+$/, "");
}

module.exports = async function handler(req, res) {
  try {
    if (!BUCKET || !REGION) {
      return res.status(500).json({ ok:false, error:"Missing env S3_BUCKET/AWS_REGION" });
    }

    // Accept ?key=... (GET) or { key } (POST)
    const key =
      req.method === "GET"
        ? req.query.key
        : (typeof req.body === "string" ? JSON.parse(req.body).key : req.body?.key);

    const uploadsKey = normalizeUploadsKey(key);
    if (!uploadsKey) return res.status(400).json({ ok:false, error:"Provide ?key=... (uploads/...) or body { key }" });

    // 1) Confirm the upload exists
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: uploadsKey }));

    // 2) Create the pending status file
    const jobId     = jobIdFromUploadsKey(uploadsKey);
    const statusKey = `${STATUS}/${jobId}.json`;

    const pending = JSON.stringify({ status: "pending" });
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: statusKey,
      Body: pending,
      ContentType: "application/json",
      ServerSideEncryption: "AES256",
    }));

    // 3) (Optional) you can kick other work here if you have a queue, etc.

    return res.status(200).json({
      ok: true,
      bucket: BUCKET,
      key: statusKey,
      jobId,
      status: "pending",
      reportHint: `${REPORTS}/${jobId}.json`,
    });
  } catch (e) {
    // Common failure: HEAD 404 (upload doesn’t exist) or wrong region
    return res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
};
