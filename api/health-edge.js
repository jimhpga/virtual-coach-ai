// /api/health-edge.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  return new Response(
    JSON.stringify({
      ok: true,
      runtime: 'edge',
      now: Date.now(),
      url: req.url,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    }
  );
}
