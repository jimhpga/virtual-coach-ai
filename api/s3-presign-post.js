import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

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

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: S3_BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 1, maxBytes],
        ["starts-with", "$Content-Type", ""],
        ["starts-with", "$key", S3_PREFIX],
      ],
      Fields: { "Content-Type": contentType },
      Expires: 60,
    });

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify({
      ok: true,
      method: "POST",
      url,
      fields,
      key,
      bucket: S3_BUCKET,
      region: S3_REGION,
      maxBytes
    }));
  } catch (e) {
    console.error("presign_post_error", { name: e?.name, message: e?.message, bucket: S3_BUCKET, region: S3_REGION, key });
    return bad(res, 500, "presign_failed", { name: e?.name, message: e?.message });
  }
}