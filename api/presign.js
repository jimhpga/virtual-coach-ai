// api/presign.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const { filename, type = "application/octet-stream", size = 0 } = req.body || {};
    if (!filename) return res.status(400).json({ ok: false, error: "MISSING_FILENAME" });

    const {
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION,
      S3_BUCKET,
      PUBLIC_BASE_URL,        // e.g. https://virtualcoachai.net  (optional)
      MAX_UPLOAD_MB = "200",  // safety cap
    } = process.env;

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET) {
      return res.status(500).json({ ok: false, error: "SERVER_MISCONFIGURED" });
    }

    // Object key: date/user-safe hash + original name
    const ymd = new Date().toISOString().slice(0, 10).replaceAll("-", "/");
    const safeName = filename.replace(/[^\w.\-]/g, "_");
    const key = `uploads/${ymd}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;

    // ---- Presigned POST per SigV4 ----
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "") + "Z";        // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8);                                       // YYYYMMDD
    const credential = `${AWS_ACCESS_KEY_ID}/${dateStamp}/${AWS_REGION}/s3/aws4_request`;

    const policy = {
      expiration: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),       // +15 min
      conditions: [
        { bucket: S3_BUCKET },
        ["starts-with", "$key", ""],
        { acl: "private" },
        ["content-length-range", 0, parseInt(MAX_UPLOAD_MB, 10) * 1024 * 1024],
        { "Content-Type": type },
        { "x-amz-algorithm": "AWS4-HMAC-SHA256" },
        { "x-amz-credential": credential },
        { "x-amz-date": amzDate },
      ],
    };

    const policyBase64 = Buffer.from(JSON.stringify(policy)).toString("base64");

    // Signing (kSigning = HMAC(HMAC(HMAC(HMAC("AWS4"+Secret, Date), Region), "s3"), "aws4_request"))
    const kDate   = crypto.createHmac("sha256", "AWS4" + AWS_SECRET_ACCESS_KEY).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(AWS_REGION).digest();
    const kService= crypto.createHmac("sha256", kRegion).update("s3").digest();
    const kSign   = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = crypto.createHmac("sha256", kSign).update(policyBase64).digest("hex");

    const fields = {
      key,
      acl: "private",
      "Content-Type": type,
      "x-amz-algorithm": "AWS4-HMAC-SHA256",
      "x-amz-credential": credential,
      "x-amz-date": amzDate,
      policy: policyBase64,
      "x-amz-signature": signature,
    };

    const url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;

    return res.status(200).json({
      ok: true,
      url,
      fields,
      key,
      viewerUrl: PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/report.html?key=${encodeURIComponent(key)}` : null,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "UNEXPECTED", details: String(e && e.message || e) });
  }
}
