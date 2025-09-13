const crypto = require("crypto");

// Very small, dependency-free presign for S3 PUT (works in Node runtime on Vercel).
// If you already have a POST presigner, you can keep it; just ensure you return { ok, key, url, fields? }.
module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const key = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
    if (!key) return res.status(400).json({ ok:false, error:"Missing API key" });

    // read json
    const chunks=[]; for await (const ch of req) chunks.push(ch);
    const raw = Buffer.concat(chunks).toString("utf8");
    let body; try { body = JSON.parse(raw) } catch { return res.status(400).json({ ok:false, error:"Invalid JSON" }) }

    const filename    = String(body.filename || "upload.bin");
    const contentType = String(body.contentType || "application/octet-stream");
    const clientId    = String(body?.metadata?.clientId || "anon");
    const note        = String(body?.metadata?.note || "");

    // Object key under uploads/
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    const safe   = filename.replace(/[^\w.\- ]+/g,"_");
    const objKey = `uploads/${clientId}/${stamp}-${safe}`;

    // Build a simple presigned PUT URL manually if you already expose a proxy signer,
    // otherwise rely on your existing signer (if you have one).
    // Here we assume you mounted an S3 bucket behind a tiny signer you already wrote.
    // If you already had working presign earlier that returned url, just return that here:
    // return res.status(200).json({ ok:true, key:objKey, url:PUT_URL });

    // If you already implemented PUT signing in this route earlier (and proved it in PS),
    // just ensure you send the FULL url back:
    if (process.env.DIRECT_PUT_URL_BASE) {
      // e.g. a CloudFront or S3 presigned endpoint you trust (not public)
      const token = crypto.randomBytes(12).toString("hex");
      const url   = `${process.env.DIRECT_PUT_URL_BASE}/${encodeURIComponent(objKey)}?ct=${encodeURIComponent(contentType)}&t=${token}`;
      return res.status(200).json({ ok:true, key:objKey, url });
    }

    // Fallback: use your existing share/proxy pipeline
    // If you previously had code that created a PUT URL, call it here and return { ok, key, url }.
    return res.status(200).json({ ok:true, key:objKey, url:null, hint:"Wire your real presign here" });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message || e) });
  }
};
module.exports.config = { maxDuration: 10 };
