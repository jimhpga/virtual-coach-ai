import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { filename, type } = req.body || {};
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-west-1';

  if (!bucket) return res.status(500).json({ error: 'S3_BUCKET not set' });

  const safeName = (filename || 'video.mp4').replace(/[^\w.\-]+/g, '_');
  const key = 'uploads/' + Date.now() + '-' + safeName;

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });

  const post = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ['content-length-range', 0, 200 * 1024 * 1024],
      ['starts-with', '$Content-Type', (type || '').split('/')[0] || '']
    ],
    Expires: 300
  });

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ url: post.url, fields: post.fields, key });
}
