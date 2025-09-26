// api/upload-url.js
import { generateUploadUrl } from '@vercel/blob';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const jobId = crypto.randomUUID();
  const { url } = await generateUploadUrl(); // one-time PUT URL
  res.status(200).json({ uploadUrl: url, jobId });
}
