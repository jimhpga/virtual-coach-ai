// api/env-check.js
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET only' });
    return;
  }
  res.status(200).json({
    ok: Boolean(
      process.env.S3_UPLOAD_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    ),
    region: process.env.AWS_REGION || 'us-west-2',
    bucket: process.env.S3_UPLOAD_BUCKET || '(missing)'
  });
}
