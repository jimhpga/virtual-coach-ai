// api/upload.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = { runtime: "nodejs18.x" }; // force Node, not Edge

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;
const s3 = new S3Client({ region: REGION });

function cors(res: ResponseInit = {}): ResponseInit {
  return {
    ...res,
    headers: {
      "Access-Control-Allow-Origin": "https://virtualcoachai.net",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      ...(res.headers as any),
    },
  };
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, cors({ status: 204 }));
  if (req.method !== "POST") return new Response("Method Not Allowed", cors({ status: 405 }));

  try {
    // Optional: client can suggest a filename; we’ll place it under uploads/
    const body = await safeJson(req);
    const filename = (body?.filename || `vid-${Date.now()}.mp4`).replace(/[^-\w.]/g, "");
    const key = `uploads/${new Date().toISOString().slice(0,10)}/${filename}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: "video/mp4", // adjust if needed
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 min

    return json({ ok: true, url, key }, 200);
  } catch (e:any) {
    return json({ ok: false, error: e.message ?? "UPLOAD_PRESIGN_ERROR" }, 500);
  }
}

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}
function json(data: any, status=200) {
  return new Response(JSON.stringify(data), cors({
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  }));
}
