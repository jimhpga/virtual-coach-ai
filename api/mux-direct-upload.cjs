// Creates a Mux Direct Upload URL (temporary) via Mux REST API
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Use POST' });
    }

    const id = process.env.MUX_TOKEN_ID;
    const secret = process.env.MUX_TOKEN_SECRET;
    if (!id || !secret) {
      return res.status(500).json({ error: 'MUX env missing' });
    }

    const auth = Buffer.from(`${id}:${secret}`).toString('base64');

    const resp = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        new_asset_settings: { playback_policy: ['public'] },
        cors_origin: '*',                 // adjust to your domain later
        test: false
      })
    });

    const json = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'mux_error', detail: json });
    }

    // Mux returns { data: { id, url, ... } }
    res.status(200).json(json.data);
  } catch (e) {
    res.status(500).json({ error: 'server_error', message: String(e) });
  }
};
