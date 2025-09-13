const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method Not Allowed" });

    const expected = (process.env.REPORT_API_KEY || "").trim();
    const incoming = String(
      (req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || "")
    ).trim();

    if (!incoming)                     return res.status(401).json({ ok:false, error:"Missing API key" });
    if (expected && incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    const body   = req.body || {};
    const report = body.report || body;

    if (!report || typeof report !== "object") return res.status(400).json({ ok:false, error:"Missing report object" });
    if (!report.status)                        return res.status(400).json({ ok:false, error:"Missing report.status" });
    if (!report.note)                          return res.status(400).json({ ok:false, error:"Missing report.note" });

    const region = process.env.AWS_REGION || "us-west-1";
    const bucket = (process.env.S3_BUCKET || "").trim();
    if (!bucket) return res.status(500).json({ ok:false, error:"S3_BUCKET not set" });

    const s3 = new S3Client({ region });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const clientId = String(report.clientId || "unknown");
    const key = `reports/${clientId}/${ts}.json`;

    const bodyJson = JSON.stringify({ receivedAt: Date.now(), report }, null, 2);

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(bodyJson, "utf8"),
      ContentType: "application/json; charset=utf-8",
    }));

    return res.status(200).json({ ok:true, key });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e?.message ?? e) });
  }
};

