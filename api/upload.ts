// api/upload.ts
import { NextRequest } from "next/server";
import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs"; // DO NOT use edge

const REGION = process.env.AWS_REGION || process.env.S3_REGION || "us-west-1";
const BUCKET = process.env.S3_BUCKET || "virtualcoachai-swings";
const AKID = process.env.AWS_ACCESS_KEY_ID || "";
const ASEC = process.env.AWS_SECRET_ACCESS_KEY || "";
const HAS_SESSION = !!process.env.AWS_SESSION_TOKEN;

function missingEnv() {
  const miss: string[] = [];
  if (!AKID) miss.push("AWS_ACCESS_KEY_ID");
  if (!ASEC) miss.push("AWS_SECRET_ACCESS_KEY");
  if (!REGION) miss.push("AWS_REGION (or S3_REGION)");
  if (!BUCKET) miss.push("S3_BUCKET");
  return miss;
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: AKID,
    secretAccessKey: ASEC,
    sessionToken: process.env.AWS_SESSION_TOKEN, // ok if undefined
  },
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function safeName(x: string) {
  return String(x).replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "").replace(/-+/g, "-").toLowerCase();
}

export async function POST(req: NextRequest) {
  const build = "diag-nochecksum-2025-10-13T21:30Z";
  try {
    const miss = missingEnv();
    if (miss.length) {
      return json(500, { ok:false, error:"MISSING_ENV", missing:miss, REGION, BUCKET, HAS_SESSION, build });
    }

    // Quick IAM sanity: HeadBucket (fast; shows if creds/bucket/region are wrong)
    try {
      await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    } catch (hbErr: any) {
      return json(500, {
        ok:false, error:"HEAD_BUCKET_FAILED",
        code: hbErr?.name || hbErr?.Code,
        message: hbErr?.message || hbErr?.Message,
        REGION, BUCKET, HAS_SESSION, build
      });
    }

    const { filename = "upload.mov" } = await req.json().catch(() => ({}));
    const key = `uploads/${today()}/${safeName(filename)}`;

    // CRITICAL: only Bucket + Key. No ContentType, ACL, Metadata, Checksum*, etc.
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key });

    let url = "";
    try {
      url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    } catch (signErr: any) {
      return json(500, {
        ok:false, error:"PRESIGN_THROW",
        code: signErr?.name || signErr?.Code,
        message: signErr?.message || signErr?.Message,
        REGION, BUCKET, HAS_SESSION, build
      });
    }

    if (/\bx-amz-checksum-/i.test(url)) {
      return json(500, { ok:false, error:"CHECKSUM_IN_URL", sample:url.slice(0,220), build });
    }

    return json(200, { ok:true, url, key, REGION, BUCKET, build });
  } catch (err: any) {
    return json(500, { ok:false, error:"PRESIGN_FAILED", detail:String(err?.message || err), build });
  }
}

function json(status: number, obj: any) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
