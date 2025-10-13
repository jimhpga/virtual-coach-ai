// api/upload.ts
import { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs"; // must NOT be edge

const REGION = process.env.AWS_REGION || "us-west-1";
const BUCKET = process.env.S3_BUCKET || "virtualcoachai-swings";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function safeName(x: string) {
  return x.replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "").replace(/-+/g, "-").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const { filename = "upload.mov" } = await req.json().catch(() => ({}));
    const key = `uploads/${today()}/${safeName(String(filename))}`;

    // IMPORTANT: no ContentType, no Checksum*, no ACL here.
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key });

    // short expiry; keeps things safe
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });

    // Sanity: url MUST NOT contain x-amz-checksum-*
    return new Response(JSON.stringify({ ok: true, url, key }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("presign error:", err);
    return new Response(JSON.stringify({ ok: false, error: "PRESIGN_FAILED" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
