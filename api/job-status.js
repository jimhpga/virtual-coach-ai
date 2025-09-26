// api/job-status.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const jobId = (req.query.jobId || req.body?.jobId || '').toString();
  if (!jobId) return res.status(400).json({ error: 'jobId required' });

  const job = await kv.hgetall(`job:${jobId}`);
  if (!job) return res.status(404).json({ error: 'job not found' });

  res.status(200).json(job);
}
