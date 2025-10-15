// /api/get-url.js
export default async function handler(req, res) {
  try {
    // Read query first
    const q = req.query || {};
    let url  = q.url  || null;
    let key  = q.key  || null;
    let id   = q.id   || null;

    // Then read body (object OR raw string)
    if (!url && !key && !id && req.body) {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      if (body && typeof body === 'object') {
        url = url || body.url || null;
        key = key || body.key || null;
        id  = id  || body.id  || null;
      }
    }

    // As a last resort, parse url param from the raw URL
    if (!url) {
      try {
        const u = new URL(req.url, `http://${req.headers.host}`);
        url = u.searchParams.get('url') || url;
      } catch {}
    }

    // Your public Blob base (set this in Vercel Project → Settings → Environment Variables)
    const BASE = (process.env.BLOB_PUBLIC_BASE || '').replace(/\/$/, '');

    if (!url && !key && !id) {
      return res.status(400).json({
        error: "missing key",
        hint: "Pass ?url= or ?key= or ?id=, or POST JSON { url|key|id }"
      });
    }
    if (!BASE && !url) {
      return res.status(500).json({
        error: "missing BLOB_PUBLIC_BASE",
        hint: "Set BLOB_PUBLIC_BASE in Vercel to your blob store base URL"
      });
    }

    let finalKey = "";
    let finalUrl = "";

    if (url) {
      try {
        const u = new URL(url);
        finalKey = u.pathname.replace(/^\//, '');
        finalUrl = url;
      } catch {
        return res.status(400).json({ error: "bad url" });
      }
    } else if (key) {
      finalKey = key.replace(/^\//, '');
      finalUrl = `${BASE}/${finalKey}`;
    } else if (id) {
      // Canonical convention: reports/<id>.json
      finalKey = `reports/${id}.json`;
      finalUrl = `${BASE}/${finalKey}`;
    }

    return res.status(200).json({ url: finalUrl, key: finalKey });
  } catch (e) {
    return res.status(500).json({ error: "unexpected", details: String(e?.message || e) });
  }
}
