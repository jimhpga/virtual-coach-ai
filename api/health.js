
// api/health.js - Edge Function (fast, zero deps)
export const runtime = 'edge';

export default function handler() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'virtualcoachai-homepage',
      region: process.env.AWS_REGION || null,
      t: Date.now()
    }),
    { headers: { 'content-type': 'application/json' }, status: 200 }
  );
}
