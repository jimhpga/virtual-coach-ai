// /api/presign.ts
import { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED = new Set([
  "video/mp4","video/quicktime","video/quicktime; codecs=hevc",
  "video/quicktime; codecs=hvc1","video/quicktime; codecs=avc1",
  "video/mov","video/avi","video/webm"
]);
const MAX_BYTES = 200 * 1024 * 1024; // 200MB

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;

const s3 = new S3Client({ region: REGION });

export const config = { runtime: "edge" }; // fast, cold-start friendly

function extFromName(name: string) {
  const m = /\.[a-z0-9]+$/i.exec(name || "");
  return m ? m[0].toLowerCase() : ".mp4";
}

function makeId() {
  const r = Math.random().toString(36).slice(2, 8);
  return `vcai_${Date.now()}_${r}`;
}

export default async function handler(req: NextRequest) {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const { filename, size, mime } = await req.json();

    if (!filename || typeof size !== "number" || !mime) {
      return Response.json({ error: "filename, size, mime required" }, { status: 400 });
    }
    if (size <= 0 || size > MAX_BYTES) {
      return Response.json({ error: `Max file size is ${MAX_BYTES} bytes` }, { status: 413 });
    }
    if (!ALLOWED.has(String(mime).toLowerCase())) {
      return Response.json({ error: `Unsupported mime: ${mime}` }, { status: 415 });
    }

    const id = makeId();
    const ext = extFromName(filename);
    const videoKey = `uploads/${id}${ext}`;
    const reportKey = `reports/${id}.json`;

    const put = new PutObjectCommand({
      Bucket: BUCKET,
      Key: videoKey,
      ContentType: mime,
      // No ACL — your bucket is ACL-disabled (“bucket owner enforced”)
    });

    // Presign for 15 minutes
    const uploadUrl = await getSignedUrl(s3, put, { expiresIn: 900 });

    return Response.json({
      id,
      uploadUrl,
      videoKey,
      reportKey,
      // Handy client hints
      reportUrl: `/report?id=${id}`
    });
  } catch (err: any) {
    return Response.json({ error: err?.message || "presign failed" }, { status: 500 });
  }
}
