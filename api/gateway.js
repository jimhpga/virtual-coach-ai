// /api/gateway.js
import Busboy from "busboy";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = { api: { bodyParser: false } };

const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET || "";
const uploadsPrefix = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");

const hasS3 = !!bucket && !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
const s3 = hasS3 ? new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}) : null;

function send(res, code, body){ res.status(code).setHeader("Content-Type","application/json"); res.end(JSON.stringify(body)); }
function cleanName(n="video.mp4"){ return String(n).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g,"_"); }
function makeKey(fn="video.mp4"){ const ts=Date.now(); const safe=cleanName(fn); const ext=(safe.split(".").pop()||"mp4").toLowerCase(); const base=safe.replace(/\.[a-z0-9]+$/i,""); return `${uploadsPrefix}${ts}-${base}.${ext}`; }
async function readJson(req){ const chunks=[]; for await (const c of req) chunks.push(c); return JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}"); }
async function signPut(Key, ContentType){ const cmd=new PutObjectCommand({Bucket:bucket,Key,ContentType}); return getSignedUrl(s3, cmd, {expiresIn:60*15}); }
async function signGet(Key){ return getSignedUrl(s3, new GetObjectCommand({Bucket:bucket, Key}), {expiresIn:60*60*24}); }
function route(req){ try{ const u=new URL(req.url,"http://x"); const p=u.pathname.replace(/^\/api\//,""); return (p.split("/")[0]||"").toLowerCase(); }catch{ return ""; }}

// ---- handlers ----
async function ping(_req,res){ return send(res,200,{pong:true,time:new Date().toISOString()}); }
async function version(_req,res){ return send(res,200,{version:"v1",commit:process.env.VERCEL_GIT_COMMIT_SHA||null}); }
async function envCheck(_req,res){ return send(res,200,{region,bucket,hasS3,hasAccessKey:!!process.env.AWS_ACCESS_KEY_ID}); }

async function upload(req,res){
  const ct=req.headers["content-type"]||"";

  // JSON init -> { key, putUrl }
  if (ct.includes("application/json")){
    try{
      const { filename="video.mp4", type="application/octet-stream", key } = await readJson(req);
      const finalKey = key || makeKey(filename);
      if (!hasS3) return send(res,200,{ key:finalKey, putUrl:null, note:"S3 not configured" });
      const putUrl = await signPut(finalKey,type);
      return send(res,200,{ key:finalKey, putUrl });
    }catch(e){ return send(res,400,{error:"Bad JSON request"}); }
  }

  if (!hasS3) return send(res,500,{error:"S3 not configured"});

  // multipart stream -> store file
  const bb = Busboy({ headers:req.headers });
  let providedKey=null, intakeJson=null, fileKey=null, uploaded=false;

  const done = new Promise((resolve,reject)=>{
    bb.on("field",(name,val)=>{ if(name==="key") providedKey=String(val); if(name==="intake") intakeJson=String(val); });
    bb.on("file", async (name,file,info)=>{
      if (name!=="file" && name!=="video"){ file.resume(); return; }
      const { filename="video.mp4", mimeType } = info||{};
      fileKey = providedKey || makeKey(filename);
      try{
        await s3.send(new PutObjectCommand({Bucket:bucket, Key:fileKey, Body:file, ContentType:mimeType||"application/octet-stream"}));
        uploaded = true;
      }catch(err){ reject(err); }
    });
    bb.on("error",reject);
    bb.on("finish",resolve);
  });

  req.pipe(bb);
  try{
    await done;
    if (!uploaded || !fileKey) return send(res,400,{error:"No file received"});

    if (intakeJson){
      const base=fileKey.replace(/\.[a-z0-9]+$/i,"");
      try{
        await s3.send(new PutObjectCommand({Bucket:bucket, Key:`${base}.intake.json`, Body:intakeJson, ContentType:"application/json"}));
      }catch(e){ console.warn("intake store failed:",e); }
    }

    const downloadUrl = await signGet(fileKey);
    return send(res,200,{status:"stored", key:fileKey, downloadUrl});
  }catch(e){ return send(res,500,{error:String(e.message||e)}); }
}

async function intake(req,res){
  if (req.method!=="POST") return send(res,405,{error:"Method Not Allowed"});
  if (!hasS3) return send(res,500,{error:"S3 not configured"});
  try{
    const { key, intake } = await readJson(req);
    if (!key) return send(res,400,{error:"Missing key"});
    const base=key.replace(/\.[a-z0-9]+$/i,"");
    await s3.send(new PutObjectCommand({Bucket:bucket, Key:`${base}.intake.json`, Body:JSON.stringify(intake||{},null,2), ContentType:"application/json"}));
    return send(res,200,{ok:true});
  }catch(e){ return send(res,500,{error:String(e.message||e)}); }
}

async function analyze(req,res){
  const u=new URL(req.url,"http://x");
  const key=u.searchParams.get("key")||"";
  if (!key) return send(res,400,{error:"Missing key"});
  return send(res,200,{status:"ready"});
}
async function qc(req,res){
  const u=new URL(req.url,"http://x");
  const key=u.searchParams.get("key")||"";
  if (!key) return send(res,400,{error:"Missing key"});
  return send(res,200,{status:"ok",warnings:[]});
}

export default async function handler(req,res){
  const r = route(req);
  try{
    if (req.method==="GET"  && r==="ping")      return ping(req,res);
    if (req.method==="GET"  && r==="version")   return version(req,res);
    if (req.method==="GET"  && r==="env-check") return envCheck(req,res);

    if (req.method==="POST" && r==="upload")    return upload(req,res);
    if (req.method==="POST" && r==="intake")    return intake(req,res);
    if (req.method==="GET"  && r==="analyze")   return analyze(req,res);
    if (req.method==="GET"  && r==="qc")        return qc(req,res);

    return send(res,404,{error:"Not Found", route:r});
  }catch(e){
    console.error(e);
    return send(res,500,{error:String(e.message||e)});
  }
}
