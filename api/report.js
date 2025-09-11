module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok:false, error:"Method Not Allowed" });
    }

    // --- Auth (trim both sides) ---
    const rawKey   = req.headers["x-api-key"] ?? req.query?.key ?? req.body?.key;
    const incoming = String(rawKey ?? "").trim();
    const expected = String(process.env.REPORT_API_KEY ?? "").trim();

    if (!incoming) {
      return res.status(401).json({ ok:false, error:"Missing API key" });
    }
    if (expected && incoming !== expected) {
      return res.status(401).json({ ok:false, error:"Bad API key" });
    }

    // --- Payload checks ---
    const body   = req.body ?? {};
    const report = body.report ?? body;
    if (!report || typeof report !== "object") {
      return res.status(400).json({ ok:false, error:"Missing report object" });
    }
    if (!report.status) {
      return res.status(400).json({ ok:false, error:"Missing report.status" });
    }
    if (!report.note) {
      return res.status(400).json({ ok:false, error:"Missing report.note" });
    }

    // --- Skip S3 (AFTER auth/validation) ---
    const skip = String(process.env.SKIP_S3 ?? "").trim().toLowerCase() === "true";
    if (skip) {
      return res.status(200).json({ ok:true, skipped:"s3" });
    }

    // --- S3 work goes BELOW this line only ---
    // const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
    // const s3 = new S3Client({ region: process.env.AWS_REGION });
    // await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: "...", Body: Buffer.from("...") }));

    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
