// api/peek-key.js
module.exports = (req, res) => {
  const rawKey   = req.headers["x-api-key"] ?? req.query?.key ?? req.body?.key;
  const incoming = String(rawKey ?? "");
  const expected = String(process.env.REPORT_API_KEY ?? "");
  res.status(200).json({
    incomingLen: incoming.length,
    expectedLen: expected.length,
    incomingTrimLen: incoming.trim().length,
    expectedTrimLen: expected.trim().length
  });
};
