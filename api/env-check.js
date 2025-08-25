export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    node: process.version,
    region: process.env.AWS_REGION || "us-west-2",
    bucket: process.env.S3_UPLOAD_BUCKET || "(missing)",
    haveKeys: Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  });
}
