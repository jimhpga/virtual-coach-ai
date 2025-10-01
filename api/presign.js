// Serverless function: presign an S3 POST so the browser can upload directly
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
const BUCKET = process.env.S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = async (req, res) => {
  // CORS for your site
  res.setHeader("Access-Control-Allow-Origin", "https://virtualcoachai.net");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    // quick health check in the browser
    return res.status(200).json({ ok: true, message: "presign ready", bucket: BUCKET });
  }

  try {
    const { filename, type } = (req.body || {});
    const clean = (filename || "video").replace(/[^a-z0-9.\-_]/gi, "_");
    const key = `uploads/${Date.now()}-${clean}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: BUCKET,
      Key: key,
      Fields: { "Content-Type": type || "video/mp4" },
      Conditions: [["content-length-range", 1, 200 * 1024 * 1024]], // up to 200MB
      Expires: 3600,
    });

    res.status(200).json({ url, fields, key });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
};
