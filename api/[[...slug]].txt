// api/[[...slug]].js
export default async function handler(req, res) {
  const parts = Array.isArray(req.query.slug) ? req.query.slug : [];
  const path = parts.join('/').toLowerCase();

  if (req.method === 'GET' && path === 'ping') {
    res.status(200).json({ pong: true, at: Date.now() });
    return;
  }

  if (req.method === 'GET' && path === 'env-check') {
    res.status(200).json({
      ok: Boolean(process.env.S3_UPLOAD_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      region: process.env.AWS_REGION || 'us-west-2',
      bucket: process.env.S3_UPLOAD_BUCKET || '(missing)'
    });
    return;
  }

  res.status(404).json({ error: 'Not found' });
}
