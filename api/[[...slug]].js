// /api/[[...slug]].js  (ESM, Node runtime)
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Busboy from "busboy";

export const config = { api: { bodyParser: false } };

// ===== ENV =====
const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET || "";           // e.g. "virtualcoachai-prod"
const PREFIX = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://virtualcoachai.net,https://virtualcoachai-homepage.vercel.app")
  .split(",").map(s => s.trim()).filter(Boolean);

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

// ===== UTIL =====
function originOk(req){ const o = req.headers.origin || ""; return ALLOWED_ORIGINS.includes(o) ? o : null; }
function setCORS(req,res){
  const ok = originOk(req);
  if (ok) res.setHeader("Access-Control-Allow-Origin", ok);
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Authorization");
  res.setHeader("Access-Control-Max-Age","300");
}
function json(res, code, obj){ res.status(code).setHeader("Content-Type","application/json"); res.end(JSON.stringify(obj)); }
function cleanName(name="video.mp4"){ return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g,"_"); }
function makeKey(original="video.mp4"){
  const ts = Date.now();
  const safe = cleanName(original);
  const ext  = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i,"");
  return `${PREFIX}${ts}-${base}.${ext}`;
}
async function readJson(req){
  const chunks=[]; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return {}; }
}
function baseKey(key){ return String(key||"").replace(/\.[a-z0-9]+$/i,""); }

// ===== ROUTES =====
async function routePing(req,res){ return json(res,200,{ pong:true, at:Date.now() }); }

async function routeEnv(req,res){
  return json(res,200,{
    ok: !!(BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    region: REGION,
    bucket: BUCKET || "(missing)",
    prefix: PREFIX,
    origins: ALLOWED_ORIGINS
  });
}

// POST /api/presign  { filename, type, key? } -> { key, putUrl }
async function routePresign(req,res){
  if (!BUCKET) return json(res,500,{ error:"S3 bucket not configured" });
  const body = await readJson(req);
  const filename = body.filename || "video.mp4";
  const type     = body.type || "application/octet-stream";
  const finalKey = body.key || makeKey(filename);

  const put = new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, ContentType: type });
  const putUrl = await getSignedUrl(s3, put, { expiresIn: 60*15 }); // 15 min
  return json(res,200,{ key: finalKey, putUrl });
}

// Tiny proxy upload for small files only (< ~4.5 MB on Hobby)
async function routeUpload(req,res){
  const cl = Number(req.headers["content-length"] || 0);
  if (cl > 4_500_000) return json(res,413,{ error:"Too large for proxy. Use /api/presign." });
  if (!BUCKET) return json(res,500,{ error:"S3 bucket not configured" });

  const bb = Busboy({ headers:req.headers });
  let fileKey=null, providedKey=null, intakeJson=null, uploaded=false;

  const done = new Promise((resolve,reject)=>{
    bb.on("field",(name,val)=>{ if(name==="key") providedKey=String(val); if(name==="intake") intakeJson=String(val); });
    bb.on("file", async (name, file, info)=>{
      if (name!=="file" && name!=="video"){ file.resume(); return; }
      const { filename="video.mp4", mimeType } = info || {};
      fileKey = providedKey || makeKey(filename);
      try{
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key:fileKey, Body:file, ContentType: mimeType || "application/octet-stream" }));
        uploaded = true;
      }catch(err){ reject(err); }
    });
    bb.on("error", reject);
    bb.on("finish", resolve);
  });

  req.pipe(bb);
  try{
    await done;
    if (!uploaded || !fileKey) return json(res,400,{ error:"No file received" });

    if (intakeJson){
      const base = baseKey(fileKey);
      try{
        await s3.send(new PutObjectCommand({ Bucket:BUCKET, Key:`${base}.intake.json`, Body:intakeJson, ContentType:"application/json" }));
      }catch{}
    }
    return json(res,200,{ status:"stored", key:fileKey });
  }catch(e){
    return json(res,500,{ error:String(e.message||e) });
  }
}

// GET /api/analyze?key=...  (stub: pending)
async function routeAnalyze(req,res){ return json(res,200,{ status:"pending" }); }
// GET /api/qc?key=...       (stub)
async function routeQC(req,res){ return json(res,200,{ status:"warn", issues:[{level:"warn", msg:"No report yet"}] }); }

// ===== ROUTER =====
export default async function handler(req,res){
  setCORS(req,res);
  if (req.method === "OPTIONS"){ res.status(204).end(); return; }

  const parts = Array.isArray(req.query.slug) ? req.query.slug : [];
  const path  = parts.join("/").toLowerCase();

  try{
    if (req.method==="GET"  && path==="ping")       return routePing(req,res);
    if (req.method==="GET"  && path==="env-check")  return routeEnv(req,res);
    if (req.method==="POST" && path==="presign")    return routePresign(req,res);
    if (req.method==="POST" && path==="upload")     return routeUpload(req,res);
    if (req.method==="GET"  && path==="analyze")    return routeAnalyze(req,res);
    if (req.method==="GET"  && path==="qc")         return routeQC(req,res);
    return json(res,404,{ error:"Not found" });
  }catch(e){
    return json(res,500,{ error:String(e.message||e) });
  }
}
