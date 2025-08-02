export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    has_OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    has_open_ai_key: Boolean(process.env.open_ai_key),
    env: process.env.VERCEL_ENV || 'unknown'
  });
}
