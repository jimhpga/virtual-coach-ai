export default async function handler(req, res) {
  res.status(200).json({
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
    NODE_ENV: process.env.NODE_ENV || null
  });
}
