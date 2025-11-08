// api/mux-direct-upload.js
const API = 'https://api.mux.com/video/v1/uploads';

function error(res, code, msg, extra = {}) {
  res.status(code).json({ error: msg, ...extra });
}

module.exports = async (req, res) => {
  try {
    // CORS
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method !== 'POST') {
      return error(res, 405, 'Method Not Allowed');
    }

    const id = process.env.MUX_TOKEN_ID;
    const secret = process.env.MUX_TOKEN_SECRET;

    if (!id || !secret) {
      return error(res, 500, 'Missing MUX credentials', {
        need: ['MUX_TOKEN_ID', 'MUX_TOKEN_SECRET'],
        have_id: Boolean(id),
        have_secret: Boolean(secret),
      });
    }

    const basic = Buffer.from(`${id}:${secret}`).toString('base64');

    const body = {
      cors_origin: origin,
      test: process.env.VERCEL_ENV !== 'production',
      new_asset_settings: {
        playback_policy: ['public'],
      },
    };

    const r = await fetch(API, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      return error(res, 502, 'Mux upload create failed', {
        status: r.status,
        mux: j,
      });
    }

    // success: return the Mux upload object (has .url and .id)
    res.status(200).json({ upload: j.data || j });
  } catch (e) {
    return error(res, 500, 'Unhandled server error', {
      message: e?.message,
      stack: e?.stack,
    });
  }
};
