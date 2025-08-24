// /api/[[...slug]].js
// ONE serverless function to handle all routes: /api/upload, /api/analyze, /api/intake, /api/qc, /api/ping

import Busboy from "busboy";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = { api: { bodyParser: false } }; // we parse bodies ourselves

// --- env ---
const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET || "";        // set this in Vercel → Settings → Environment Variables
const prefix = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");
const s3 = bucket
  ? new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
      }
    })
  : null;

// --- helpers ---
function cleanName(name = "video.mp4"){
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}
function makeKey(originalFilename = "video.mp4"){
  const ts = Date.now();
  const safe = cleanName(originalFilename);
  const ext = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `${prefix}${ts}-${base}.${ext}`;
}
async function readJson(req){
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  return buf.length ? JSON.parse(buf.toString("utf8")) : {};
}
async function presignPut(Key, ContentType){
  if (!s3 || !bucket) throw new Error("S3 not configured");
  const cmd = new PutObjectCommand({ Bucket: bucket, Key, ContentType });
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 min
}
async function presignGet(Key){
  if (!s3 || !bucket) throw new Error("S3 not configured");
  const cmd = new GetObjectCommand({ Bucket: bucket, Key });
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 60 * 24 }); // 24h
}

// store a small JSON alongside the video (non-fatal if fails)
async function storeJsonNextTo(key, obj){
  if (!s3 || !bucket) return;
  const base = key.replace(/\.[a-z0-9]+$/i, "");
  const Key = `${base}.intake.json`;
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key,
    Body: JSON.stringify(obj || {}, null, 2),
    ContentType: "application/json"
  }));
}

// --- routers ---
async function handlePing(req, res){
  return res.status(200).json({ ok: true, now: Date.now() });
}

async function handleUpload(req, res){
  const ct = req.headers["content-type"] || "";

  // Mode A: JSON init -> return { key, putUrl }
  if (ct.includes("application/json")){
    const { filename = "video.mp4", type = "application/octet-stream", key } = await readJson(req);
    const finalKey = key || makeKey(filename);
    const putUrl = await presignPut(finalKey, type);
    return res.status(200).json({ key: finalKey, putUrl });
  }

  // Mode B: multipart -> stream to S3 and return {status,key,downloadUrl}
  if (!s3 || !bucket) return res.status(500).json({ error: "S3 not configured" });

  const bb = Busboy({ headers: req.headers });
  let fileKey = null, fileUploaded = false, providedKey = null, intakeJson = null;

  const finished = new Promise((resolve, reject)=>{
    bb.on("field", (name, val) => {
      if (name === "key") providedKey = String(val);
      if (name === "intake") intakeJson = String(val);
    });

    bb.on("file", async (name, file, info) => {
      if (name !== "file" && name !== "video"){ file.resume(); return; }
      const { filename = "video.mp4", mimeType } = info || {};
      fileKey = providedKey || makeKey(filename);
      try{
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: fileKey,
          Body: file,
          ContentType: mimeType || "application/octet-stream"
        }));
        fileUploaded = true;
      }catch(e){ reject(e); }
    });

    bb.on("error", reject);
    bb.on("finish", resolve);
  });

  req.pipe(bb);
  try{
    await finished;
    if (!fileUploaded || !fileKey) return res.status(400).json({ error: "No file received (field 'file' or 'video')" });

    if (intakeJson){
      try{ await storeJsonNextTo(fileKey, JSON.parse(intakeJson)); }catch(_){} // best effort
    }

    const downloadUrl = await presignGet(fileKey);
    return res.status(200).json({ status: "stored", key: fileKey, downloadUrl });
  }catch(err){
    console.error("upload error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

async function handleIntake(req, res){
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  try{
    const { key, intake } = await readJson(req);
    if (!key) return res.status(400).json({ ok:false, error: "missing key" });
    try{ await storeJsonNextTo(key, intake || {}); }catch(_){}
    return res.status(200).json({ ok:true });
  }catch(e){
    return res.status(400).json({ ok:false, error: "bad json" });
  }
}

async function handleAnalyze(req, res){
  // Minimal: immediately “ready”. Your real analyzer can replace this.
  const key = (req.query && (req.query.key || (req.query.slug && req.query.slug[1]))) || null;
  if (!key) return res.status(200).json({ status: "pending" });
  return res.status(200).json({
    status: "ready",
    report: {
      key,
      summary: { priorities: ["Grip", "Posture", "P6 shaft"] }
    }
  });
}

async function handleQC(_req, res){
  // Simple placeholder QC
  return res.status(200).json({ status: "ok", checks: { swingPath: "ok", shoulderTurn: "ok" } });
}

// --- main handler ---
export default async function handler(req, res){
  const slugArr = (req.query.slug || []);
  const route = (slugArr[0] || "").toLowerCase();

  try{
    if (route === "ping")    return handlePing(req, res);
    if (route === "upload")  return handleUpload(req, res);
    if (route === "intake")  return handleIntake(req, res);
    if (route === "analyze") return handleAnalyze(req, res);
    if (route === "qc")      return handleQC(req, res);

    // Unknown route → basic help
    return res.status(200).json({
      ok: true,
      routes: ["/api/ping", "/api/upload", "/api/analyze?key=...", "/api/intake (POST)", "/api/qc"]
    });
  }catch(e){
    console.error("api error:", e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
