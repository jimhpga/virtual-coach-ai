// /api/get.js — fetch a saved report from Vercel KV by id
export const config = { runtime: 'edge' };

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return json(400, { error: 'Missing id' });

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return json(500, { error: 'KV not configured' });
  }

  const key = `vc:report:${id}`;
  const getUrl = `${KV_REST_API_URL}/get/${encodeURIComponent(key)}`;

  const r = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
  });

  if (!r.ok) {
    const text = await r.text();
    return json(404, { error: 'Not found', detail: text });
  }

  // KV REST returns { result: "stringified-json" }
  const { result } = await r.json();
  if (!result) return json(404, { error: 'Not found' });

  let doc;
  try { doc = JSON.parse(result); } catch { return json(500, { error: 'Corrupt data' }); }

  return json(200, { ok: true, doc });
}
