// api/submit-job.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { jobId, blobUrl, filename, contentType } = req.body || {};
  if (!jobId || !blobUrl) return res.status(400).json({ error: 'jobId and blobUrl required' });

  const now = Date.now();
  await kv.hset(`job:${jobId}`, {
    jobId, blobUrl, filename: filename || '', contentType: contentType || '',
    status: 'queued', createdAt: now, updatedAt: now
  });
  await kv.sadd('jobs:queued', jobId);

  res.status(200).json({ ok: true, jobId, status: 'queued' });
}
