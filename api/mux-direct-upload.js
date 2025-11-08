// api/mux-direct-upload.js  (CommonJS version)
module.exports = async (req, res) => {
  // CORS + preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return res.status(500).json({ error: 'Missing MUX env', need: ['MUX_TOKEN_ID','MUX_TOKEN_SECRET'] });
    }

    // Node 18 on Vercel has global fetch; no node-fetch needed
    const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');

    const r = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        new_asset_settings: { playback_policy: ['public'] },
        cors_origin: '*'
      })
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.data?.id || !j?.data?.url) {
      return res.status(500).json({ error: 'mux-create-upload-failed', status: r.status, details: j });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ upload: { id: j.data.id, url: j.data.url } });
  } catch (err) {
    return res.status(500).json({ error: 'FUNCTION_INVOCATION_FAILED', message: String(err?.message || err) });
  }
};
