module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    skip: String(process.env.SKIP_S3 ?? "").trim(),
    now: Date.now()
  });
};
