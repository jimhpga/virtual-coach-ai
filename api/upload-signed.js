const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

module.exports = async (req, res) => {
  try {
    const expected = String(process.env.REPORT_API_KEY||"").trim();
    const incoming = String(
      req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || ""
    ).trim();

    if (!expected) return res.status(500).json({ ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Use POST" });

    const { filename, contentType, clientId="unknown" } = req.body || {};
    if (!filename) return res.status(400).json({ ok:false, error:"Missing filename" });

    const Bucket = process.env.SWINGS_BUCKET || process.env.AWS_S3_BUCKET || "virtualcoachai-swings";
    const Region = process.env.AWS_REGION || "us-west-1";
    const ext = (filename.split(".").pop()||"").toLowerCase();
    const ts = new Date().toISOString().replace(/[:.]/g,"-");
    const safeId = String(clientId||"unknown").replace(/[^a-z0-9\-_.]/gi,"-");
    const key = `uploads/${safeId}/${ts}.${ext}`;

    const s3 = new S3Client({ region: Region });
    const cmd = new PutObjectCommand({ Bucket, Key: key, ContentType: contentType || "application/octet-stream" });
    const putUrl = await getSignedUrl(s3, cmd, { expiresIn: 600 });

    return res.status(200).json({ ok:true, key, putUrl, bucket:Bucket, region:Region });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message ?? e) });
  }
};
