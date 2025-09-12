const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = (process.env.S3_BUCKET || "").trim();

function respond(res, code, obj){ return res.status(code).json(obj); }
async function streamToString(stream){ const chunks=[]; for await (const c of stream) chunks.push(c); return Buffer.concat(chunks).toString("utf8"); }

module.exports = async (req, res) => {
  try {
    const expected = (process.env.REPORT_API_KEY || "").trim();
    const incoming = String((req.headers["x-api-key"] || req.query.key || (req.body && req.body.key) || "")).trim();
    if (!expected) return respond(res, 500, { ok:false, error:"Server REPORT_API_KEY not set" });
    if (!incoming || incoming !== expected) return respond(res, 401, { ok:false, error:"Bad API key" });
    if (!BUCKET) return respond(res, 500, { ok:false, error:"S3 bucket not configured" });
    if (req.method !== "GET") return respond(res, 405, { ok:false, error:"Use GET" });

    const { clientId, limit, objKey, signed } = req.query || {};

    if (objKey) {
      const Key = String(objKey);
      if (!Key.startsWith("reports/")) return respond(res, 400, { ok:false, error:"objKey must start with 'reports/'" });

      if (String(signed || "").trim() === "1") {
        const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key }), { expiresIn: 600 });
        return respond(res, 200, { ok:true, url });
      }

      const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
      const text = await streamToString(r.Body);
      let data; try { data = JSON.parse(text); } catch {}
      return respond(res, 200, {
        ok:true,
        key: Key,
        size: r.ContentLength ?? null,
        lastModified: r.LastModified ?? null,
        data,
        raw: data ? undefined : text
      });
    }

    const prefix = clientId ? `reports/${clientId}/` : "reports/";
    let max = Math.min(Math.max(parseInt(limit || "50", 10) || 50, 1), 200);

    const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, MaxKeys: max }));
    const items = (out.Contents || [])
      .filter(o => o.Key && o.Key.endsWith(".json"))
      .sort((a,b) => new Date(b.LastModified) - new Date(a.LastModified))
      .slice(0, max)
      .map(o => ({ key:o.Key, size:o.Size, lastModified:o.LastModified }));

    return respond(res, 200, { ok:true, items, prefix });
  } catch (e) {
    return respond(res, 500, { ok:false, error:String(e?.message ?? e) });
  }
};
