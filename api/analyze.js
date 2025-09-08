// api/analyze.js
const { S3Client, HeadObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

const BUCKET  = process.env.S3_BUCKET;
const REGION  = process.env.AWS_REGION;
const STATUS  = process.env.S3_STATUS_PREFIX  || "status";
const REPORTS = process.env.S3_REPORT_PREFIX  || "reports";
const UPLOADS = process.env.S3_UPLOAD_PREFIX  || "uploads";

// --- STUB controls ---
const STUB_MODE    = (process.env.ANALYZE_STUB || "").toLowerCase() === "true";
const STUB_SCORE   = Number(process.env.STUB_SCORE || 82);
const STUB_FAULTS  = (process.env.STUB_FAULTS || "EarlyExtension,OpenClubface").split(",").map(s=>s.trim()).filter(Boolean);
const STUB_PFRAMES = ["P1","P2","P3","P4","P5","P6","P7","P8","P9"];

const s3 = new S3Client({ region: REGION });

function normalizeUploadsKey(k){
  if (!k) return null;
  const key = String(k).trim();
  return key.startsWith(`${UPLOADS}/`) ? key : `${UPLOADS}/${key}`;
}
function jobIdFromUploadsKey(k){
  return String(k).replace(new RegExp(`^${UPLOADS}/`),"").replace(/\.[^.]+$/, "");
}

module.exports = async function handler(req, res){
  try {
    if (!BUCKET || !REGION) {
      return res.status(500).json({ ok:false, error:"Missing env S3_BUCKET/AWS_REGION" });
    }

    // accept ?key=... (GET) or { key } (POST)
    const key = req.method === "GET"
      ? req.query.key
      : (typeof req.body === "string" ? JSON.parse(req.body).key : req.body?.key);

    const uploadsKey = normalizeUploadsKey(key);
    if (!uploadsKey) return res.status(400).json({ ok:false, error:"Provide ?key=... or body { key }" });

    const forceStub = (req.method === "GET" && (req.query.stub === "1" || req.query.stub === "true")) || STUB_MODE;

    // If forcing stub and you DON'T have a real S3 object handy, skip HEAD:
    if (!forceStub) {
      // normal path: ensure object exists
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: uploadsKey }));
    }

    const jobId     = jobIdFromUploadsKey(uploadsKey);
    const statusKey = `${STATUS}/${jobId}.json`;
    const reportKey = `${REPORTS}/${jobId}.json`;

    // breadcrumb: write pending
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: statusKey,
      Body: JSON.stringify({ status: forceStub ? "preparing-stub" : "pending" }),
      ContentType: "application/json",
      ServerSideEncryption: "AES256",
    }));

    if (forceStub) {
      const report = {
        swing_id: jobId,
        p_frames: STUB_PFRAMES,
        faults:   STUB_FAULTS,
        score:    STUB_SCORE,
        note:     "stub"
      };

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: reportKey,
        Body: JSON.stringify(report),
        ContentType: "application/json",
        ServerSideEncryption: "AES256",
      }));

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: statusKey,
        Body: JSON.stringify({ status: "ready", report: reportKey, mode: "stub" }),
        ContentType: "application/json",
        ServerSideEncryption: "AES256",
      }));

      return res.status(200).json({ ok:true, bucket: BUCKET, jobId, status:"ready", statusKey, reportKey, stub:true });
    }

    // real path leaves it pending for a worker to fill the report later
    return res.status(200).json({ ok:true, bucket: BUCKET, jobId, status:"pending", statusKey, reportHint: reportKey });

  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
};

