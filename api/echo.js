// api/echo.js
module.exports = async (req, res) => {
  const method = req.method;
  const headers = req.headers;
  const url = new URL(req.url, `https://${req.headers.host || "virtualcoachai.net"}`);
  const body = req.body ?? null;
  res.status(200).json({ ok:true, router:"vercel-fn", method, headers, query:Object.fromEntries(url.searchParams.entries()), body });
};
