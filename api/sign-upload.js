// /api/sign-upload.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const BUCKET = process.env.VCA_BUCKET_UPLOADS;          // e.g. virtualcoachai-uploaods
const REGION = process.env.AWS_REGION || "us-west-2";   // match your bucket region

const s3 = new S3Client({ region: REGION });

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try {
    const { filename, contentType } = JSON.parse(req.body || "{}");
    if (!filename || !contentType) {
      res.status(400).json({ error: "filename and contentType required" });
      return;
    }

    const ext = (filename.split(".").pop() || "mp4").toLowerCase();
    const key = `uploads/${Date.now()}-${crypto.randomBytes(5).toString("hex")}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: "private"
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min
    res.status(200).json({ url, key, bucket: BUCKET, region: REGION });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "sign-upload failed" });
  }
};
