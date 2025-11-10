// api/mux-env-check.cjs
module.exports = (req, res) => {
  const id     = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;

  res.status(200).json({
    hasId: Boolean(id),
    hasSecret: Boolean(secret),
    node: process.versions && process.versions.node,
    env: process.env.VERCEL_ENV || 'unknown',
  });
};
