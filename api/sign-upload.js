// /api/sign-upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.BUCKET_NAME;

const s3 = new S3Client({ region: REGION });

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { filename = 'swing.mp4', contentType = 'video/mp4' } = req.query;
    const ext = filename.includes('.') ? filename.split('.').pop() : 'mp4';
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'private',
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 });
    const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ uploadUrl, key, publicUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'presign failed' });
  }
}
