// api/upload.js
// Force Node runtime (NOT Edge)
export const config = { runtime: 'nodejs' };

// Minimal POST handler that returns a stub report URL.
// This unblocks the Upload page and your deploy.
// Later we can parse FormData and store the video (S3/Blob) and create a real report.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    // If you want to confirm it’s being called:
    // const contentType = req.headers['content-type'] || '';
    // console.log('upload content-type:', contentType);

    const jobId = Math.random().toString(36).slice(2);
    // Keep using the existing viewer; this opens the sample for now
    const reportUrl = '/docs/report.html?report=report.json';

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ ok: true, jobId, reportUrl }));
  } catch (err) {
    console.error('upload error', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
}
