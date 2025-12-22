// api/analyze.js
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Helper: convert S3 stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export default async function handler(req, res) {
  try {
    // Accept ?jobId=... (or ?id=... as a fallback)
    const jobId = (req.query && (req.query.jobId || req.query.id)) || null;
    if (!jobId) {
      return res.status(400).json({ status: "error", error: "missing jobId" });
    }

    const Bucket = process.env.S3_BUCKET;          // e.g. "virtualcoachai-uploads"
    const Key = `status/${jobId}.json`;            // e.g. "status/smoke.json"

    try {
      // Try to read the status file from S3
      const obj = await s3.send(new GetObjectCommand({ Bucket, Key }));
      const bodyStream =
        obj.Body instanceof Readable ? obj.Body : Readable.from(obj.Body);
      const text = await streamToString(bodyStream);

      // Parse safely
      let payload = {};
      try { payload = JSON.parse(text || "{}"); }
      catch { payload = { status: "error", error: "invalid JSON in status file" }; }

      return res.status(200).json(payload);
    } catch (e) {
      // If the file isn’t there yet, we’re still pending
      if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) {
        return res.status(200).json({ status: "pending" });
      }
      // Any other S3 error
      return res.status(500).json({
        status: "error",
        error: e?.message || "analyze-read-failed"
      });
    }
  } catch (e) {
    return res.status(500).json({
      status: "error",
      error: e?.message || "handler-failed"
    });
  }
}
