// /api/report.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'POST only' });
    if (!BUCKET || !REGION) return res.status(500).json({ ok:false, error:'Missing env S3_BUCKET/AWS_REGION' });

    const { jobId, status = 'ready', data = {}, key } = await readJson(req);
    const id = jobId || keyToJobId(key);
    if (!id) return res.status(400).json({ ok:false, error:'Provide jobId or key' });

    const s3 = new S3Client({ region: REGION });
    const body = JSON.stringify({ status, ...data }, null, 2);
    const statusKey = `status/${id}.json`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: statusKey,
      Body: body,
      ContentType: 'application/json',
    }));

    res.status(200).json({ ok:true, bucket: BUCKET, key: statusKey, wrote: { status, ...data } });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
}

function keyToJobId(k) {
  if (!k) return null;
  return String(k).replace(/^uploads\//, '').replace(/\.[^.]+$/, '');
}
async function readJson(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const txt = Buffer.concat(chunks).toString('utf8') || '{}';
  try { return JSON.parse(txt); } catch { return {}; }
}
