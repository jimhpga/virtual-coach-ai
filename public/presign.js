// /api/presign  (POST { filename, type, key? } -> { key, putUrl })
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

function cleanName(name = "video.mp4"){
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g,"_");
}
function makeKey(original = "video.mp4"){
  const safe = cleanName(original);
  const ext = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `uploads/${Date.now()}-${base}.${ext}`;
}
async function readJson(req){
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return {}; }
}

export default async function handler(req, res){
  try{
    if (req.method !== "POST"){
      res.status(405).json({ error: "POST only" }); return;
    }
    if (!BUCKET){
      res.status(500).json({ error: "Missing S3_UPLOAD_BUCKET" }); return;
    }

    const { filename = "video.mp4", type = "application/octet-stream", key } = await readJson(req);
    const finalKey = key || makeKey(filename);

    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, ContentType: type });
    const putUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15m

    res.status(200).json({ key: finalKey, putUrl });
  }catch(e){
    res.status(500).json({ error: String(e.message || e) });
  }
}



