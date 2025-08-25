// /api/[[...slug]].js — minimal sanity version
export const config = { api: { bodyParser: false } };

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  try {
    const parts = Array.isArray(req.query.slug) ? req.query.slug : [];
    const path = parts.join("/").toLowerCase();

    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

    if (req.method === "GET" && path === "ping") {
      return json(res, 200, { pong: true, at: Date.now() });
    }

    if (req.method === "GET" && (path === "hello" || path === "")) {
      return json(res, 200, { ok: true, route: path || "(root)" });
    }

    if (req.method === "GET" && path === "env-check") {
      return json(res, 200, { ok: true, node: process.version });
    }

    return json(res, 404, { error: "Not found", path });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
