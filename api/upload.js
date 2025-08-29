// /api/upload.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST only' });
    if (!BUCKET || !REGION) return res.status(500).json({ ok:false, error:'Missing env S3_BUCKET/AWS_REGION' });

    const { key, contentType = 'application/octet-stream' } = await readJson(req);
    if (!key || !/^uploads\//.test(key)) {
      return res.status(400).json({ ok:false, error:'Provide key starting with "uploads/"' });
    }

    const s3 = new S3Client({ region: REGION });
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 });

    res.status(200).json({ ok:true, url, bucket: BUCKET, key, contentType });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const txt = Buffer.concat(chunks).toString('utf8') || '{}';
  try { return JSON.parse(txt); } catch { return {}; }
}
