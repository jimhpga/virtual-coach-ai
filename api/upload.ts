// api/upload.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const config = { runtime: 'nodejs' };

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;
const s3 = new S3Client({ region: REGION });

function allowCORS(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://virtualcoachai.net');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (allowCORS(req, res)) return;
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const filenameIn = (req.body?.filename ?? `vid-${Date.now()}.mp4`) as string;
    const filename = filenameIn.replace(/[^-\w.]/g, '');
    const day = new Date().toISOString().slice(0,10);
    const key = `uploads/${day}/${filename}`;

    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: 'video/mp4' });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, url, key });
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: e.message ?? 'UPLOAD_PRESIGN_ERROR' });
  }
}
