module.exports = async (req, res) => {
  try {
    const u = String(req.query.url || "").trim();
    if (!u) return res.status(400).send("Missing ?url param");

    const r = await fetch(u);
    const text = await r.text();

    res.setHeader("content-type", "text/html; charset=utf-8");

    const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
    const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Report Viewer</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:900px;margin:24px auto;padding:0 16px}
  pre{white-space:pre-wrap;word-break:break-word;background:#f6f8fa;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
  a{word-break:break-all}
</style>
</head><body>
<h1>Report JSON</h1>
<p><a href="${u}" target="_blank" rel="noopener">Open raw JSON</a></p>
<pre>${esc(text)}</pre>
</body></html>`;
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).send(String(e?.message ?? e));
  }
};
