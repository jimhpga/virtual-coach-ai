const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: process.env.AWS_REGION });

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

module.exports = async function handler(req, res) {
  try {
    const jobId = (req.query && (req.query.jobId || req.query.id)) || null;
    if (!jobId) return res.status(400).json({ status: "error", error: "missing jobId" });

    const Bucket = process.env.S3_BUCKET;
    const Key = `status/${jobId}.json`;

    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket, Key }));
      const text = await streamToString(obj.Body);
      res.status(200).json(JSON.parse(text || "{}"));
    } catch {
      // If the status file isn't there yet, report pending
      res.status(200).json({ status: "pending" });
    }
  } catch (e) {
    res.status(500).json({ status: "error", error: e?.message || "analyze-read-failed" });
  }
};
