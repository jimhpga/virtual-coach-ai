// api/upload-url.js
// Returns a one-time signed URL so the browser can PUT the file directly to Vercel Blob.

const { createUploadURL } = require('@vercel/blob');

module.exports = async (req, res) => {
  // Basic CORS (adjust origin if you want to lock it down)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel parses JSON automatically when content-type: application/json.
    // If it arrives as a string, parse it.
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const rawName = body.filename || body.name || 'upload.bin';
    const contentType = body.type || 'application/octet-stream';

    // Keep names safe & short
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120);

    // Create a one-time upload URL.
    // access: 'public' means the resulting blob URL can be viewed without auth.
    const { url, pathname, token } = await createUploadURL({
      access: 'public',
      contentType,
      tokenPayload: { filename: safeName }
    });

    // Client will PUT the file to `uploadUrl`
    return res.status(200).json({ uploadUrl: url, pathname, token });
  } catch (err) {
    console.error('upload-url error:', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
