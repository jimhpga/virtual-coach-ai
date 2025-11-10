module.exports = async (req, res) => {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  res.status(200).json({
    hasMuxId: Boolean(id),
    hasMuxSecret: Boolean(secret),
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    node: process.version
  });
};
