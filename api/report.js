// pages/api/report.js  (CommonJS, Next.js pages API)
// Reads status/<jobId>.json from S3. If status is "ready", also returns the report JSON.

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION; // <- only AWS_REGION; no S3_REGION fallback

if (!BUCKET) {
  // Let the request fail clearly if misconfigured at runtime
  console.warn("Missing env S3_BUCKET");
}
if (!REGION) {
  console.warn("Missing env AWS_REGION");
}

// Always set region explicitly
const s3 = new S3Client({ region: REGION });

// ---- helpers ----
function keyToJobId(k) {
  if (!k) return null;
  // status/<id>.json  ->  <id>
  return String(k).replace(/^status\//, "").replace(/\.json$/, "");
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

async function readS3Json(bucket, key) {
  const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const txt = await streamToString(resp.Body);
  return JSON.parse(txt);
}

// ---- handler ----
module.exports = async function handler(req, res) {
  try {
    if (!BUCKET || !REGION) {
      return res.status(500).json({ ok: false, error: "Missing env S3_BUCKET/AWS_REGION" });
    }

    // Accept either GET ?key=... or POST { key: ... }
    let key =
      req.method === "GET"
        ? (req.query.key || req.query.statusKey)
        : (typeof req.body === "string" ? JSON.parse(req.body).key : req.body?.key);

    if (!key) return res.status(400).json({ ok: false, error: "Provide ?key=... or JSON { key }" });

    // 1) Read status JSON from the status key
    const status = await readS3Json(BUCKET, key);

    // If not ready, just return the status so the client can keep polling
    if (status.status !== "ready") {
      return res.status(200).json({ ok: true, status });
    }

    // 2) Resolve report location (allow status to point elsewhere)
    const reportBucket = status.reportBucket || BUCKET;
    const reportKey = status.reportKey || `reports/${keyToJobId(key)}.json`;

    // 3) Read and return the report
    const report = await readS3Json(reportBucket, reportKey);
    return res.status(200).json({ ok: true, status, report });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};
