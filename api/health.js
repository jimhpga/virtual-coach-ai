export default function handler(req, res) {
  const KEYS = ["S3_BUCKET","AWS_REGION","AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY"];
  const env = Object.fromEntries(KEYS.map(k => [k, !!process.env[k]]));
  res.status(200).json({
    ok: KEYS.every(k => !!process.env[k]),
    env,
    note: "Presence check only. Does not validate IAM or CORS."
  });
}
