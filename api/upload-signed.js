const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method Not Allowed" });

    const expected = String(process.env.REPORT_API_KEY || "").trim();
    const incoming = String(
      req.headers["x-api-key"] || (req.body && req.body.key) || ""
    ).trim();
    if (!expected) return res.status(500).json({ ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return res.status(401).json({ ok:false, error:"Bad API key" });

    const { filename, contentType, metadata } = req.body || {};
    if (!filename)    return res.status(400).json({ ok:false, error:"Missing filename" });
    if (!contentType) return res.status(400).json({ ok:false, error:"Missing contentType" });

    const region = process.env.AWS_REGION || "us-west-1";
    const bucket = process.env.S3_BUCKET || "virtualcoachai-swings";
    const clientId = String(metadata?.clientId || process.env.CLIENT_ID || "misc").trim();
    const safeName = String(filename).replace(/[^\w.\- ]+/g, "_");
    const stamp = new Date().toISOString().replace(/[:.]/g,"-");
    const key = `uploads/${clientId}/${stamp}-${safeName}`;

    const s3 = new S3Client({ region });
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        clientId,
        note: String(metadata?.note || "")
      }
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 600 }); // 10 min

    return res.status(200).json({ ok:true, key, url });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e && e.message ? e.message : e) });
  }
};
