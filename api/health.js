export default function handler(req, res) {
  const keys = ["S3_BUCKET","AWS_REGION","AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY"];
  const env = Object.fromEntries(keys.map(k => [k, !!process.env[k]]));
  res.status(200).json({
    ok: keys.every(k => !!process.env[k] ),
    env,
    note: "Checks presence of required env vars. Doesn’t validate IAM or CORS."
  });
}
