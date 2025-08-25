// /api/analyze?key=...
// Stub: returns {status:"ready", report} if <key>.report.json exists; else {status:"pending"}
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});
function baseKey(key){ return String(key||"").replace(/\.[a-z0-9]+$/i, ""); }

export default async function handler(req, res){
  try{
    if (req.method !== "GET"){ res.status(405).json({ error: "GET only" }); return; }
    if (!BUCKET){ res.status(500).json({ error:"Missing S3_UPLOAD_BUCKET" }); return; }

    const key = String(req.query.key || "");
    if (!key){ res.status(400).json({ error:"Missing key" }); return; }

    const reportKey = `${baseKey(key)}.report.json`;

    try{
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: reportKey }));
    }catch{
      res.status(200).json({ status: "pending" }); return;
    }

    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }));
    const txt = await obj.Body.transformToString();
    let report = {};
    try{ report = JSON.parse(txt); } catch { report = { raw: txt }; }
    res.status(200).json({ status: "ready", report });
  }catch(e){
    res.status(500).json({ error: String(e.message || e) });
  }
}
