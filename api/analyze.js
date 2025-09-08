// api/analyze.js
const { S3Client, HeadObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

// --- required env ---
const BUCKET  = process.env.S3_BUCKET;         // e.g. "virtualcoachai-swings"
const REGION  = process.env.AWS_REGION;        // e.g. "us-west-1"
// optional but recommended
const STATUS  = process.env.S3_STATUS_PREFIX  || "status";
const REPORTS = process.env.S3_REPORT_PREFIX  || "reports";
const UPLOADS = process.env.S3_UPLOAD_PREFIX  || "uploads";

// --- STUB controls ---
const STUB_MODE    = (process.env.ANALYZE_STUB || "").toLowerCase() === "true"; // turn on to force stub
const STUB_SCORE   = Number(process.env.STUB_SCORE || 82);
const STUB_FAULTS  = (process.env.STUB_FAULTS || "EarlyExtension,OpenClubface")
  .split(",").map(s => s.trim()).filter(Boolean);
const STUB_PFRAMES = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"];

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
  return String(k)
    .replace(new RegExp(`^${UPLOADS}/`), "")
    .replace(/\.[^.]+$/, "");
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
    if (!uploadsKey) {
      return res.status(400).json({ ok:false, error:"Provide ?key=... (uploads/...) or body { key }" });
    }

    // 1) Confirm the upload exists (same as before)
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: uploadsKey }));

    const jobId      = jobIdFromUploadsKey(uploadsKey);
    const statusKey  = `${STATUS}/${jobId}.json`;
    const reportKey  = `${REPORTS}/${jobId}.json`;

    // Always write "pending" first (nice breadcrumb)
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: statusKey,
      Body: JSON.stringify({ status: "pending" }),
      ContentType: "application/json",
      ServerSideEncryption: "AES256",
    }));

    // 2) STUB fast-path: immediately write a finished report + ready status
    //    Triggered when ANALYZE_STUB=true (or ?stub=1 override below)
    const queryStub = (req.method === "GET" && (req.query.stub === "1" || req.query.stub === "true"));
    if (STUB_MODE || queryStub) {
      const report = {
        swing_id: jobId,
        p_frames: STUB_PFRAMES,
        faults:   STUB_FAULTS,
        score:    STUB_SCORE,
        note:     "stub"
      };

      // write report
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: reportKey,
        Body: JSON.stringify(report),
        ContentType: "application/json",
        ServerSideEncryption: "AES256",
      }));

      // mark ready
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: statusKey,
        Body: JSON.stringify({ status: "ready", report: reportKey, mode: "stub" }),
        ContentType: "application/json",
        ServerSideEncryption: "AES256",
      }));

      return res.status(200).json({
        ok: true,
        bucket: BUCKET,
        jobId,
        status: "ready",
        statusKey,
        reportKey,
        stub: true
      });
    }

    // 3) (Real path) — leave as pending; your queue/worker should pick it up
    return res.status(200).json({
      ok: true,
      bucket: BUCKET,
      jobId,
      status: "pending",
      statusKey,
      reportHint: reportKey
    });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
};
