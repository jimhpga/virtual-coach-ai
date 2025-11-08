// api/ping.js
module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    vercel_env: process.env.VERCEL_ENV || null,
    have_mux_id: !!process.env.MUX_TOKEN_ID,
    have_mux_secret: !!process.env.MUX_TOKEN_SECRET
  });
};
