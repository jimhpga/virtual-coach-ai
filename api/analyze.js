// api/analyze.js
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const s3 = new S3Client({ region: REGION });

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", c => chunks.push(Buffer.from(c)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

function jobIdFromKey(key) {
  // uploads/1756346153644-img_3490_1_.mov -> 1756346153644-img_3490_1_
  const base = key.replace(/^uploads\//, "");
  return base.replace(/\.[^.]+$/, ""); // strip extension
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    let jobId = url.searchParams.get("jobId");
    const key = url.searchParams.get("key");
    if (!jobId && key) jobId = jobIdFromKey(key);
    if (!jobId) return res.status(400).json({ status: "error", error: "missing jobId or key" });

    if (!BUCKET || !REGION) {
      return res.status(500).json({
        status: "error",
        error: "missing env",
        details: { S3_BUCKET_present: !!BUCKET, AWS_REGION_present: !!REGION }
      });
    }

    const Key = `status/${encodeURIComponent(jobId)}.json`;

    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
      const body = obj.Body instanceof Readable ? obj.Body : Readable.from(obj.Body);
      const text = await streamToString(body);
      let payload = {};
      try { payload = JSON.parse(text || "{}"); } catch { payload = { status: "error", error: "invalid JSON" }; }
      return res.status(200).json({ ok: true, bucket: BUCKET, key: Key, jobId, ...payload });
    } catch (e) {
      const code = e?.$metadata?.httpStatusCode;
      if (code === 404 || e?.name === "NoSuchKey") {
        return res.status(200).json({ ok: true, bucket: BUCKET, key: Key, jobId, status: "pending" });
      }
      return res.status(500).json({ status: "error", error: e?.message || "analyze-read-failed", bucket: BUCKET, key: Key, jobId });
    }
  } catch (e) {
    return res.status(500).json({ status: "error", error: e?.message || "handler-failed" });
  }
}
