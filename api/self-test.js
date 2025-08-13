// /api/self-test.js
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  const must = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "S3_BUCKET",
    "S3_PUBLIC_URL_BASE"
  ];

  const envReport = {};
  let missing = [];
  for (const k of must) {
    const present = !!process.env[k];
    envReport[k] = present ? "OK" : "MISSING";
    if (!present) missing.push(k);
  }

  // If envs missing, report and bail early
  if (missing.length) {
    return res.status(200).json({
      ok: false,
      step: "env",
      message: "Missing required environment variables",
      envReport,
      missing
    });
  }

  // Try to presign
  const client = new S3Client({ region: process.env.AWS_REGION });
  const filename = "selftest.mov";
  const contentType = "video/quicktime";
  const key = `uploads/selftest-${Date.now()}.mov`;

  try {
    const { url, fields } = await createPresignedPost(client, {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Conditions: [
        ["starts-with", "$key", "uploads/"],
        ["content-length-range", 0, 200000000]
      ],
      // IMPORTANT: no ACL here; bucket policy handles public read
      Fields: { "Content-Type": contentType },
      Expires: 60
    });

    return res.status(200).json({
      ok: true,
      step: "presign",
      message: "Presign successful",
      sample: {
        url,
        fieldsKeys: Object.keys(fields),
        key,
        publicUrl: `${process.env.S3_PUBLIC_URL_BASE}/${key}`
      }
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      step: "presign",
      message: "Presign failed",
      error: err?.message || String(err)
    });
  }
}
