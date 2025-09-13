module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const key = (req.headers["x-api-key"] || url.searchParams.get("key") || "").toString();
    if (!key) return res.status(400).json({ ok:false, error:"Missing API key" });

    // read body JSON
    const chunks=[]; for await (const ch of req) chunks.push(ch);
    const raw = Buffer.concat(chunks).toString("utf8");
    let body; try { body = JSON.parse(raw) } catch { return res.status(400).json({ ok:false, error:"Invalid JSON" }) }

    const filename    = String(body.filename || "upload.bin");
    const contentType = String(body.contentType || "application/octet-stream");
    const clientId    = String(body?.metadata?.clientId || "anon");

    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    const safe  = filename.replace(/[^\w.\- ]+/g,"_");
    const objKey = `uploads/${clientId}/${stamp}-${safe}`;

    // Try an internal presigner module if you already have one
    // (You had "s3-presign*.js" earlier. Adjust the require path/name if needed.)
    try {
      const presigner = require("./s3-presign");
      if (typeof presigner.presignPutUrl === "function") {
        const put = await presigner.presignPutUrl({ key: objKey, contentType });
        if (put?.url) return res.status(200).json({ ok:true, key: objKey, url: put.url });
      }
      if (typeof presigner.presignPost === "function") {
        const post = await presigner.presignPost({ key: objKey, contentType });
        if (post?.url && post?.fields) return res.status(200).json({ ok:true, key: objKey, url: post.url, fields: post.fields });
      }
    } catch {}

    // Last resort: if you wired a direct presign gateway
    if (process.env.DIRECT_PUT_URL_BASE) {
      const crypto = require("crypto");
      const token = crypto.randomBytes(12).toString("hex");
      const putUrl = `${process.env.DIRECT_PUT_URL_BASE}/${encodeURIComponent(objKey)}?ct=${encodeURIComponent(contentType)}&t=${token}`;
      return res.status(200).json({ ok:true, key: objKey, url: putUrl });
    }

    // Fail closed (clear error > silent nulls)
    return res.status(500).json({ ok:false, error:"No presign available: add s3-presign module or DIRECT_PUT_URL_BASE", key: objKey });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message || e) });
  }
};
module.exports.config = { maxDuration: 10 };
