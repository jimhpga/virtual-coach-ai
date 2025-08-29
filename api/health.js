// /api/health.js  — Edge runtime, zero deps, instant reply
export const config = { runtime: 'edge' };

export default async function handler() {
  return new Response(
    JSON.stringify({ ok: true, service: 'vcai', t: Date.now() }, null, 2),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
