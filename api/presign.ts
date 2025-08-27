import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { key, type = 'application/octet-stream' } = req.body || {};
    if (!key) return res.status(400).send('Missing key');

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: type,
      ACL: 'private',
    });
    const putUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    res.json({ key, putUrl });
  } catch (e: any) {
    res.status(500).send(e?.message || 'Internal error');
  }
}
