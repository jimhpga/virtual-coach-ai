// api/mux-direct-upload.cjs
const Mux = require('@mux/mux-node');

module.exports = async (req, res) => {
  try {
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env;
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return res.status(500).json({ error: 'Missing MUX env', need: ['MUX_TOKEN_ID','MUX_TOKEN_SECRET'] });
    }

    const mux = new Mux({
      tokenId: MUX_TOKEN_ID,
      tokenSecret: MUX_TOKEN_SECRET,
    });

    const upload = await mux.video.uploads.create({
      new_asset_settings: { playback_policy: ['public'] },
      cors_origin: '*',
    });

    res.status(200).json(upload);
  } catch (e) {
    console.error('mux-direct-upload failed:', e);
    res.status(500).json({ error: 'mux-direct-upload failed', detail: String(e && e.message || e) });
  }
};
