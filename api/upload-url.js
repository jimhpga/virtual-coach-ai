// API: POST /api/upload-url
// Body: { filename: "clip.mp4" }
// Returns: { uploadUrl: "https://blob.vercel-storage.com/..." }

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      res.status(500).json({ error: 'Missing BLOB_READ_WRITE_TOKEN' });
      return;
    }

    // (Optional) read filename from body; not required for presign
    // const { filename } = req.body || {};

    // Ask Vercel for a one-time upload URL
    const presign = await fetch('https://api.vercel.com/v2/blob/upload-url', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!presign.ok) {
      const t = await presign.text();
      res.status(502).json({ error: 'upload-url failed', detail: t });
      return;
    }

    const { url } = await presign.json();
    res.status(200).json({ uploadUrl: url });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
