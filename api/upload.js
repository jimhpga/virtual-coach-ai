// /api/upload.js  — Vercel Node serverless function (ESM, "type":"module")
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET;            // e.g. "virtualcoachai-prod"
const REGION = process.env.AWS_REGION;           // e.g. "us-west-2"
const AKID   = process.env.AWS_ACCESS_KEY_ID;    // from vca-uploader
const SKEY   = process.env.AWS_SECRET_ACCESS_KEY;

export const config = {
  // Force Node runtime (not Edge) so we can use (req,res) handler
  runtime: "nodejs18.x",
};

// --- tiny helpers ---
function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

// --- handler ---
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return send(res, 405, { ok: false, error: "Use POST" });
    }

    // Read JSON body safely in Node functions (no Next.js auto parser here)
    let body = {};
    try { body = await readBody(req); }
    catch (e) {
      return send(res, 400, { ok: false, error: e.message || "Bad JSON" });
    }

    const key = String(body.key || "").trim();
    const contentType = String(body.contentType || "application/octet-stream").trim();

    if (!BUCKET || !REGION || !AKID || !SKEY) {
      return send(res, 500, {
        ok: false,
        error: "Missing AWS env",
        hint: "Set S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in Vercel → Project → Settings → Environment Variables (Production).",
        present: {
          S3_BUCKET: !!BUCKET,
          AWS_REGION: !!REGION,
          AWS_ACCESS_KEY_ID: !!AKID,
          AWS_SECRET_ACCESS_KEY: !!SKEY,
        },
      });
    }

    if (!key || !/^uploads\//.test(key)) {
      return send(res, 400, { ok: false, error: "Provide key like 'uploads/<timestamp>-name.ext'" });
    }

    // Presigning DOES NOT call AWS; it’s local math using region & credentials.
    // So this should be instantaneous and never 504.
    const s3 = new S3Client({
      region: REGION,
      credentials: { accessKeyId: AKID, secretAccessKey: SKEY },
      // Force correct regional endpoint; avoids cross-region warnings elsewhere
      endpoint: `https://s3.${REGION}.amazonaws.com`,
    });

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 minutes

    return send(res, 200, {
      ok: true,
      url,
      bucket: BUCKET,
      key,
      contentType,
    });
  } catch (e) {
    return send(res, 500, {
      ok: false,
      error: e?.name || e?.message || String(e),
    });
  }
}
