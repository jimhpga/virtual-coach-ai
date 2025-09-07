import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = { runtime: "nodejs", maxDuration: 10, regions: ["pdx1","sfo1"] };

const {
  S3_BUCKET,
  S3_REGION,
  S3_PREFIX = "uploads/",
  S3_MAX_MB = "500",
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} = process.env;

function bad(res, code, msg, extra = {}) {
  res.status(code).json({ error: msg, ...extra });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return bad(res, 405, "method_not_allowed");

  const filename = (req.query.filename || "").toString();
  const contentType = (req.query.contentType || "application/octet-stream").toString();
  if (!filename) return bad(res, 400, "missing_filename");

  const maxBytes = (parseInt(S3_MAX_MB || "500", 10) || 500) * 1024 * 1024;
  const key = `${S3_PREFIX}${filename}`.replace(/^\/+/, "");

  const s3 = new S3Client({
    region: S3_REGION,
    credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
  });

  // ✨ Disable the flexible checksum middleware so URL has NO x-amz-checksum-* or x-amz-sdk-checksum-algorithm
  try { s3.middlewareStack.remove("flexibleChecksumsMiddleware"); } catch (_) {}

  try {
    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      // Don’t set any Checksum* fields
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // short TTL
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify({ ok: true, method: "PUT", url, key, bucket: S3_BUCKET, region: S3_REGION, maxBytes }));
  } catch (e) {
    console.error("presign_error", { name: e?.name, message: e?.message, bucket: S3_BUCKET, region: S3_REGION, key });
    return bad(res, 500, "presign_failed", { name: e?.name, message: e?.message });
  }
}
