// /api/intake  (POST { key, intake } -> { ok:true })
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

async function readJson(req){
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return {}; }
}
function baseKey(key){ return String(key||"").replace(/\.[a-z0-9]+$/i, ""); }

export default async function handler(req, res){
  try{
    if (req.method !== "POST"){ res.status(405).json({ error:"POST only" }); return; }
    if (!BUCKET){ res.status(500).json({ error:"Missing S3_UPLOAD_BUCKET" }); return; }

    const body = await readJson(req);
    const key = String(body.key || "");
    if (!key){ res.status(400).json({ error:"Missing key" }); return; }

    const payload = JSON.stringify(body.intake || {}, null, 2);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: `${baseKey(key)}.intake.json`,
      Body: payload, ContentType: "application/json"
    }));
    res.status(200).json({ ok:true });
  }catch(e){
    res.status(500).json({ error: String(e.message || e) });
  }
}
