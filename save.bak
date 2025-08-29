// /api/save.js — save a report JSON to Vercel KV and return a share link
export const config = { runtime: 'edge' };

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

function nanoid() {
  // 8-char id: time + random, URL-safe
  const s = (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).slice(-8);
  return s.replace(/[^a-z0-9]/gi, 'x');
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'Use POST' });

  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return json(500, { error: 'KV not configured' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { report, frames } = body || {};
  if (!report || typeof report !== 'object') {
    return json(400, { error: 'Missing report' });
  }

  // Optional: store up to 3 frames as small thumbnails to keep size down
  const thumbs = Array.isArray(frames) ? frames.slice(0, 3) : [];

  // Create doc
  const id = nanoid();
  const doc = {
    id,
    report,
    thumbs,
    createdAt: Date.now()
  };

  // Store with TTL: 180 days for report (≈ 6 months)
  const key = `vc:report:${id}`;
  const ttl = 60 * 60 * 24 * 180; // seconds

  const putUrl = `${KV_REST_API_URL}/set/${encodeURIComponent(key)}?ex=${ttl}`;
  const r = await fetch(putUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(doc)
  });

  if (!r.ok) {
    const text = await r.text();
    return json(500, { error: 'KV save failed', detail: text });
  }

  // Public share URL (read-only)
  const origin = new URL(req.url).origin;
  const shareUrl = `${origin}/r.html?id=${encodeURIComponent(id)}`;

  return json(200, { ok: true, id, url: shareUrl });
}
