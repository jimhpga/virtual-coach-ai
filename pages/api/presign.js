import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-west-1';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  // CORS (safe for your own site)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST required' });

  try {
    if (!BUCKET) return res.status(500).json({ ok:false, error:'Missing S3_BUCKET' });

    const { filename, type } = (req.body || {});
    const safeName = String(filename || 'video.mp4').replace(/[^a-z0-9.\-_]/gi, '_');
    const key = `uploads/${Date.now()}-${safeName}`;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: BUCKET,
      Key: key,
      Conditions: [
        ['content-length-range', 0, 100 * 1024 * 1024], // up to 100 MB
      ],
      Fields: {
        key,
        'Content-Type': type || 'video/mp4',
      },
      Expires: 300, // 5 minutes
    });

    res.status(200).json({ ok:true, url, fields, key, bucket: BUCKET, region: REGION });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
}
