// api/report.js
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const BUCKET  = process.env.S3_BUCKET;
const REGION  = process.env.AWS_REGION;
const STATUS  = process.env.S3_STATUS_PREFIX  || "status";
const REPORTS = process.env.S3_REPORT_PREFIX  || "reports";

const s3 = new S3Client({ region: REGION });

function keyToJobId(k) {
  // status/<jobId>.json -> <jobId>
  return String(k).replace(new RegExp(`^${STATUS}/`), "").replace(/\.json$/, "");
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
  return JSON.parse(txt);
}

module.exports = async function handler(req, res) {
  try {
    if (!BUCKET || !REGION) {
      return res.status(500).json({ ok:false, error:"Missing env S3_BUCKET/AWS_REGION" });
    }

    // Allow GET ?key=... or POST { key }
    const statusKey =
      req.method === "GET"
        ? (req.query.key || req.query.statusKey)
        : (typeof req.body === "string" ? JSON.parse(req.body).key : req.body?.key);

    if (!statusKey) return res.status(400).json({ ok:false, error:"Provide ?key=... or JSON { key }" });

    const status = await readS3Json(BUCKET, statusKey);

    if (status.status !== "ready") {
      // Still pending (or anything else) — just return status
      return res.status(200).json({ ok:true, status });
    }

    // Resolve the report’s location
    const reportBucket = status.reportBucket || BUCKET;
    const reportKey    = status.reportKey    || `${REPORTS}/${keyToJobId(statusKey)}.json`;

    const report = await readS3Json(reportBucket, reportKey);
    return res.status(200).json({ ok:true, status, report });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
};
