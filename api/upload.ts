// api/upload.ts
import { NextRequest, NextResponse } from "next/server"; // or your framework's types
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET ?? "virtualcoachai-swings";
const REGION = process.env.AWS_REGION ?? "us-west-1";

// one S3 client
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function ymd(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const { filename } = await req.json().catch(() => ({} as any));
    const base = filename ? slug(filename) : `upload-${Date.now()}.bin`;
    const key = `uploads/${ymd()}/${base}`;

    // IMPORTANT:
    // - Do NOT set Body here.
    // - Do NOT set ChecksumAlgorithm.
    // - Only set ContentType if you ALSO send the exact same header on the PUT.
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      // ContentType: "application/octet-stream", // optional; if you set this, your browser PUT MUST send the same Content-Type
      // ACL: "private" // optional
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });

    return NextResponse.json({ ok: true, url, key });
  } catch (err: any) {
    console.error("presign error:", err);
    return NextResponse.json({ ok: false, error: "PRESIGN_FAILED" }, { status: 500 });
  }
}
