export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    has_OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    env: process.env.VERCEL_ENV || 'unknown'
  });
}
