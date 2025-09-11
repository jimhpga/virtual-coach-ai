// api/echo.js (Vercel Serverless Function)
module.exports = async (req, res) => {
  try {
    const method = req.method;
    const headers = req.headers;
    const url = new URL(req.url, `https://${req.headers.host || "virtualcoachai.net"}`);

    let body = null;
    if (method === "POST") {
      try {
        body = req.body ?? null; // Vercel parses JSON when content-type=application/json
      } catch (_) {
        body = null;
      }
    }

    res.status(200).json({
      ok: true,
      router: "vercel-fn",
      method,
      headers,
      query: Object.fromEntries(url.searchParams.entries()),
      body,
    });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e?.message ?? e) });
  }
};
