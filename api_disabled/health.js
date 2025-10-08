module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    skip: String(process.env.SKIP_S3 ?? "").trim(),
    region: process.env.VERCEL_REGION ?? null,
    now: Date.now()
  });
};
