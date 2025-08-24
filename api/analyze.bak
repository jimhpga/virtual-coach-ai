// api/analyze.js
// Status check for a completed report in S3.
// - Extension-agnostic: works for .mp4, .mov, .m4v, whatever.
// - Tries JSON first (reports/<base>.json); if not found, also checks for HTML (reports/<base>.html).
// - Returns { status: "ready" | "pending", ... }

import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET; // required
const reportsPrefix = process.env.S3_REPORTS_PREFIX || "reports/";

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function getTextBody(resp) {
  // aws-sdk v3 GetObject Body supports transformToString in Node 18+
  return await resp.Body.transformToString();
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  if (!bucket) {
    res.status(500).json({ error: "S3 bucket not configured (S3_UPLOAD_BUCKET)" });
    return;
  }

  try {
    // key example: uploads/1724460000-myswing.mov (or .mp4, etc.)
    const q = req.query.key;
    const key = Array.isArray(q) ? q[0] : q;
    if (!key) {
      res.status(400).json({ error: "Missing key" });
      return;
    }

    // Normalize and strip any extension; keep only the basename under uploads/
    const normalized = decodeURIComponent(key);
    const base = normalized.replace(/^uploads\//, "").replace(/\.[a-z0-9]+$/i, "");
    const jsonKey = `${reportsPrefix}${base}.json`;
    const htmlKey = `${reportsPrefix}${base}.html`;

    // 1) JSON report?
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: jsonKey }));
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: jsonKey }));
      const txt = await getTextBody(obj);

      // Try to parse JSON (but don't fail readiness if it's valid text)
      try {
        const json = JSON.parse(txt);
        res.status(200).json({ status: "ready", format: "json", report: json, key: jsonKey });
        return;
      } catch {
        res.status(200).json({ status: "ready", format: "json-text", report: null, raw: txt, key: jsonKey });
        return;
      }
    } catch {
      // 2) HTML report fallback?
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: htmlKey }));
        res.status(200).json({ status: "ready", format: "html", key: htmlKey });
        return;
      } catch {
        // Not ready yet
        res.status(200).json({ status: "pending", checkAfter: 5 });
        return;
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
