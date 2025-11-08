// api/mux-direct-upload.js
const https = require('https');

function send(res, code, obj) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  try {
    // CORS
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return send(res, 405, { error: 'Method Not Allowed' });

    const id = process.env.MUX_TOKEN_ID;
    const secret = process.env.MUX_TOKEN_SECRET;
    if (!id || !secret) {
      return send(res, 500, {
        error: 'Missing MUX credentials',
        need: ['MUX_TOKEN_ID', 'MUX_TOKEN_SECRET'],
        have_id: !!id, have_secret: !!secret
      });
    }

    const body = JSON.stringify({
      cors_origin: origin,
      test: process.env.VERCEL_ENV !== 'production',
      new_asset_settings: { playback_policy: ['public'] }
    });

    const auth = Buffer.from(`${id}:${secret}`).toString('base64');

    const options = {
      hostname: 'api.mux.com',
      path: '/video/v1/uploads',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const chunks = [];
    const reqMux = https.request(options, r => {
      r.on('data', d => chunks.push(d));
      r.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8');
        let json = {};
        try { json = JSON.parse(txt); } catch (_) { /* keep as {} */ }

        if (r.statusCode >= 200 && r.statusCode < 300) {
          return send(res, 200, { upload: json.data || json });
        } else {
          return send(res, 502, { error: 'Mux upload create failed', status: r.statusCode, mux: json, raw: txt.slice(0,400) });
        }
      });
    });

    reqMux.on('error', (e) => {
      return send(res, 500, { error: 'HTTPS error to Mux', message: e.message });
    });

    reqMux.write(body);
    reqMux.end();
  } catch (e) {
    return send(res, 500, { error: 'Unhandled server error', message: e.message });
  }
};
