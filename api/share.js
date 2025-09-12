const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = new S3Client({ region: process.env.AWS_REGION });

module.exports = async (req, res) => {
  try {
    const expected = (process.env.REPORT_API_KEY || "").trim();
    const incoming = String(req.headers["x-api-key"] || req.query.key || "").trim();
    if (!expected) return res.status(500).json({ ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    const BUCKET = (process.env.S3_BUCKET || "").trim();
    const { objKey } = req.query || {};
    if (!objKey) return res.status(400).json({ ok:false, error:"Missing objKey" });

    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: objKey }), { expiresIn: 600 });
    return res.status(200).json({ ok:true, url });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
