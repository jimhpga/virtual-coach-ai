// api/upload-signed.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const apiKey = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
    if (!apiKey) return res.status(400).json({ ok: false, error: "Missing API key" });

    // read JSON body
    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    const raw = Buffer.concat(chunks).toString("utf8");
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch {
      return res.status(400).json({ ok:false, error:"Invalid JSON" });
    }

    // env
    const bucket = process.env.S3_BUCKET;            // e.g. "virtualcoachai-swings"
    const region = process.env.AWS_REGION || "us-west-1";
    if (!bucket) return res.status(500).json({ ok:false, error:"Missing S3_BUCKET env" });

    // inputs
    const filename    = String(body.filename || "upload.bin");
    const contentType = String(body.contentType || "application/octet-stream");
    const clientId    = String(body?.metadata?.clientId || "anon");
    const note        = String(body?.metadata?.note || "");

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safe  = filename.replace(/[^\w.\- ]+/g, "_");
    const key   = `uploads/${clientId}/${stamp}-${safe}`;

    const s3 = new S3Client({ region /* credentials come from env */ });

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Metadata: { clientid: clientId, note }
    });

    // 10 minutes
    const signedUrl = await getSignedUrl(s3, cmd, { expiresIn: 600 });

    return res.status(200).json({ ok: true, key, url: signedUrl });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
};

module.exports.config = { maxDuration: 10 };
