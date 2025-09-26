// /api/upload.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  // Stub: pretend we enqueued work and return a status URL
  const jobId = Date.now().toString(36);
  return res.status(200).json({ jobId, statusUrl: `/api/job-status?id=${jobId}` });
}
