// api/report.js (Vercel serverless function, Node CJS)
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const BUCKET  = process.env.S3_BUCKET;
const REGION  = process.env.AWS_REGION;             // must be set (us-west-1 in your case)
const STATUS  = process.env.S3_STATUS_PREFIX  || "status";
const REPORTS = process.env.S3_REPORT_PREFIX  || "reports";

// Create S3 client with explicit region (don’t rely on defaults)
const s3 = new S3Client({ region: REGION });

// --- helpers ---
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function keyToJobId(k) {
  // "status/<jobId>.json" -> "<jobId>"
  return String(k)
    .replace(new RegExp(`^${escapeRegExp(STATUS)}/`), "")
    .replace(/\.json$/i, "");
}
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}
async function readS3Json(bucket, key) {
  const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const txt  = await streamToString(resp.Body);
  try { return JSON.parse(txt); }
  catch { throw new Error(`Invalid JSON at s3://${bucket}/${key}`); }
}
function coerceKeyFromReq(req) {
  if (req.method === "GET") {
    return (req.query.key || req.query.statusKey || "").toString();
  }
  // Vercel parses JSON body for pages/api, but we keep a fallback for raw text
  if (typeof req.body === "string") {
    try { return (JSON.parse(req.body).key || "").toString(); }
    catch { return ""; }
  }
  return (req.body?.key || "").toString();
}
function isSafeStatusKey(k) {
  // simple guardrails: must start with "<STATUS>/" and end with ".json"
  return k.startsWith(`${STATUS}/`) && k.toLowerCase().endsWith(".json");
}

// --- handler ---
module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    if (!BUCKET || !REGION) {
      return res.status(500).json({ ok:false, error:"Missing env S3_BUCKET/AWS_REGION" });
    }
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ ok:false, error:"Method Not Allowed (use GET or POST)" });
    }

    const statusKey = decodeURIComponent(coerceKeyFromReq(req));

    if (!statusKey) {
      return res.status(400).json({ ok:false, error:"Provide ?key=... or JSON { key }" });
    }
    if (!isSafeStatusKey(statusKey)) {
      return res.status(400).json({ ok:false, error:`Key must look like "${STATUS}/<jobId>.json"` });
    }

    // 1) Read status JSON
    let status;
    try {
      status = await readS3Json(BUCKET, statusKey);
    } catch (e) {
      // prettify common s3 error messages
      const msg = (e?.name === "NoSuchKey" || /NoSuchKey|Not Found/i.test(e?.message || ""))
        ? `Status object not found at s3://${BUCKET}/${statusKey}`
        : e?.message || String(e);
      return res.status(404).json({ ok:false, error: msg });
    }

    // Not ready yet — return status only
    if (status.status !== "ready") {
      return res.status(200).json({ ok:true, status });
    }

    // 2) Resolve report location (allow status to point elsewhere)
    const reportBucket = status.reportBucket || BUCKET;
    const reportKey    = status.reportKey    || `${REPORTS}/${keyToJobId(statusKey)}.json`;

    // 3) Read and return the report
    let report;
    try {
      report = await readS3Json(reportBucket, reportKey);
    } catch (e) {
      const msg = (e?.name === "NoSuchKey" || /NoSuchKey|Not Found/i.test(e?.message || ""))
        ? `Report object not found at s3://${reportBucket}/${reportKey}`
        : e?.message || String(e);
      return res.status(404).json({ ok:false, error: msg, status, reportBucket, reportKey });
    }

    return res.status(200).json({ ok:true, status, report });

  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
};
