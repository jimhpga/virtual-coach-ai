// /api/[[...slug]].js
// Single Serverless function that handles:
//  GET  /api/ping
//  POST /api/upload   (JSON init -> {key} only, OR multipart with field "file")
//  POST /api/intake   (store intake next to key in /tmp just for now)
//  GET  /api/analyze?key=...  (stub: always 'ready')
//  GET  /api/qc?key=...       (stub: 'ok')
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Busboy from "busboy";

export const config = { api: { bodyParser: false } };

const json = (res, code, obj) => res.status(code).json(obj);
const bad  = (res, msg) => json(res, 400, { error: msg });

const clean = s => String(s||"").trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
const makeKey = (name="video.mp4") => {
  const safe = clean(name);
  const ext  = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `uploads/${Date.now()}-${base}.${ext}`;
};

// Read JSON body (when content-type is application/json)
async function readJson(req){
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return {}; }
}

// Save a stream to /tmp (ephemeral)
function saveToTmp(filename){
  const outPath = path.join("/tmp", filename);
  const ws = fs.createWriteStream(outPath);
  return { ws, outPath };
}

/* ---------------------- Handlers ---------------------- */
async function handlePing(_req, res){
  return json(res, 200, { ok: true, now: Date.now() });
}

async function handleUpload(req, res){
  const ct = req.headers["content-type"] || "";

  // MODE A: init via JSON -> return just { key }
  if (ct.includes("application/json")){
    const { filename="video.mp4", key } = await readJson(req);
    const finalKey = key || makeKey(filename);
    // Returning only {key} makes the front-end use the multipart fallback.
    return json(res, 200, { key: finalKey });
  }

  // MODE B: multipart -> save field "file" (or "video") to /tmp and return stored
  const bb = Busboy({ headers: req.headers });
  let fileKey = null;
  let uploaded = false;
  let providedKey = null;
  let intakeStr = null;
  let bytes = 0;

  const finished = new Promise((resolve, reject)=>{
    bb.on("field", (name, val) => {
      if (name === "key" && val) providedKey = String(val);
      if (name === "intake" && val) intakeStr = String(val);
    });
    bb.on("file", (name, file, info) => {
      if (name !== "file" && name !== "video"){ file.resume(); return; }
      const { filename = "video.mp4" } = info || {};
      fileKey = providedKey || makeKey(filename);

      const { ws } = saveToTmp(path.basename(fileKey));
      file.on("data", (chunk)=>{ bytes += chunk.length; });
      file.pipe(ws);
      ws.on("finish", ()=>{ uploaded = true; });
      ws.on("error", reject);
    });
    bb.on("error", reject);
    bb.on("finish", resolve);
  });

  req.pipe(bb);
  try{
    await finished;
    if (!uploaded || !fileKey) return bad(res, "No file received (use field 'file' or 'video')");

    // If we got intake alongside, drop a JSON file next to it in /tmp (for now)
    if (intakeStr){
      try{
        const intakePath = path.join("/tmp", path.basename(fileKey).replace(/\.[a-z0-9]+$/i, "") + ".intake.json");
        fs.writeFileSync(intakePath, intakeStr);
      }catch(_e){}
    }

    // Simulate a 24h download URL (we don't have S3 here; just echo the key)
    return json(res, 200, {
      status: "stored",
      key: fileKey,
      bytes
    });
  }catch(e){
    console.error("upload error:", e);
    return json(res, 500, { error: String(e.message || e) });
  }
}

async function handleIntake(req, res){
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });
  const { key, intake } = await readJson(req);
  if (!key) return bad(res, "missing key");
  try{
    const file = path.basename(key).replace(/\.[a-z0-9]+$/i, "") + ".intake.json";
    fs.writeFileSync(path.join("/tmp", file), JSON.stringify(intake||{}, null, 2));
  }catch(_e){}
  return json(res, 200, { ok: true });
}

async function handleAnalyze(req, res){
  const key = req.query.key || null;
  // Stub "ready" so the UI can open the report.
  return json(res, 200, {
    status: key ? "ready" : "pending",
    report: key ? {
      key,
      summary: {
        priorities: ["Grip", "Posture", "P6 shaft plane"]
      }
    } : undefined
  });
}

async function handleQC(_req, res){
  return json(res, 200, { status: "ok", checks: { swingPath: "ok", shoulderTurn: "ok" } });
}

/* ---------------------- Router ---------------------- */
export default async function handler(req, res){
  const slug = (req.query.slug || []);
  const route = String(slug[0] || "").toLowerCase();

  try{
    if (route === "ping")    return handlePing(req, res);
    if (route === "upload")  return handleUpload(req, res);
    if (route === "intake")  return handleIntake(req, res);
    if (route === "analyze") return handleAnalyze(req, res);
    if (route === "qc")      return handleQC(req, res);
    // Help text for /api
    return json(res, 200, {
      ok: true,
      routes: ["/api/ping", "/api/upload", "/api/analyze?key=...", "/api/intake (POST)", "/api/qc"]
    });
  }catch(e){
    console.error("api error:", e);
    return json(res, 500, { error: String(e.message || e) });
  }
}
