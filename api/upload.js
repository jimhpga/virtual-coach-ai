<<<<<<< HEAD
// /api/upload.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  // Stub: pretend we enqueued work and return a status URL
=======
﻿export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
>>>>>>> 7c251c6 (Wire Upload → Status → Report (stubbed backend); route /docs with vercel.json)
  const jobId = Date.now().toString(36);
  return res.status(200).json({ jobId, statusUrl: `/api/job-status?id=${jobId}` });
}
