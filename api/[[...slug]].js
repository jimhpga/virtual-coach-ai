// /api/[[...slug]].js  (ESM)
// ONE function for all /api/* routes. Works on Vercel Hobby.

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Busboy from "busboy";

export const config = { api: { bodyParser: false } };

// ===== ENV =====
const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET || "";
const PREFIX = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");

// ===== S3 =====
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

// ===== utils =====
function json(res, code, obj) {
  res.status(code).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return {}; }
}
function cleanName(name = "video.mp4") {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}
function makeKey(originalFilename = "video.mp4") {
  const ts = Date.now();
  const safe = cleanName(originalFilename);
  const ext = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `${PREFIX}${ts}-${base}.${ext}`;
}
function baseKey(key) {
  return String(key || "").replace(/\.[a-z0-9]+$/i, "");
}
function getRoute(req) {
  const segs = Array.isArray(req.query.slug) ? req.query.slug : [];
  // e.g. /api/ping -> ["ping"], /api/analyze -> ["analyze"]
  return (segs.join("/") || "").toLowerCase();
}

// ===== routes =====
async function routePing(_req, res) {
  return json(res, 200, { pong: true, at: Date.now() });
}
async function routeEnv(_req, res) {
  return json(res, 200, {
    ok: !!(BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    region: REGION, bucket: BUCKET || "(missing)", prefix: PREFIX
  });
}
// POST /api/presign  { filename, type, key? } -> { key, putUrl }
async function routePresign(req, res) {
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });
  const body = await readJson(req);
  const filename = body.filename || "video.mp4";
  const type = body.type || "application/octet-stream";
  const finalKey = body.key || makeKey(filename);
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, ContentType: type });
  const putUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 15 }); // 15 min
  return json(res, 200, { key: finalKey, putUrl });
}
// POST /api/upload (multipart small files only; big files should use /api/presign)
async function routeUpload(req, res) {
  const cl = Number(req.headers["content-length"] || 0);
  if (cl > 4_500_000) return json(res, 413, { error: "Too large for proxy; use presign + PUT." });
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });

  const bb = Busboy({ headers: req.headers });
  let fileKey = null, providedKey = null, intakeJson = null, fileUploaded = false;

  const done = new Promise((resolve, reject) => {
    bb.on("field", (name, val) => {
      if (name === "key") providedKey = String(val);
      if (name === "intake") intakeJson = String(val);
    });
    bb.on("file", async (name, file, info) => {
      if (name !== "file" && name !== "video") { file.resume(); return; }
      const { filename = "video.mp4", mimeType } = info || {};
      fileKey = providedKey || makeKey(filename);
      try {
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET, Key: fileKey, Body: file,
          ContentType: mimeType || "application/octet-stream"
        }));
        fileUploaded = true;
      } catch (err) { reject(err); }
    });
    bb.on("error", reject);
    bb.on("finish", resolve);
  });

  req.pipe(bb);
  try {
    await done;
    if (!fileUploaded || !fileKey) return json(res, 400, { error: "No file received" });

    if (intakeJson) {
      const base = baseKey(fileKey);
      try {
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET, Key: `${base}.intake.json`,
          Body: intakeJson, ContentType: "application/json"
        }));
      } catch {}
    }

    const getUrl = await getSignedUrl(
      s3, new GetObjectCommand({ Bucket: BUCKET, Key: fileKey }), { expiresIn: 86400 }
    );
    return json(res, 200, { status: "stored", key: fileKey, downloadUrl: getUrl });
  } catch (e) {
    return json(res, 500, { error: String(e.message || e) });
  }
}
// POST /api/intake { key, intake }
async function routeIntake(req, res) {
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });
  const body = await readJson(req);
  const key = String(body.key || "");
  if (!key) return json(res, 400, { error: "Missing key" });
  const base = baseKey(key);
  const payload = JSON.stringify(body.intake || {}, null, 2);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: `${base}.intake.json`, Body: payload, ContentType: "application/json"
  }));
  return json(res, 200, { ok: true });
}
// GET /api/analyze?key=...
async function routeAnalyze(req, res) {
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });
  const url = new URL(req.url, "http://localhost");
  const key = url.searchParams.get("key") || "";
  if (!key) return json(res, 400, { error: "Missing key" });
  const base = baseKey(key);
  const reportKey = `${base}.report.json`;

  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: reportKey })); }
  catch { return json(res, 200, { status: "pending" }); }

  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }));
  const txt = await obj.Body.transformToString();
  let report = {};
  try { report = JSON.parse(txt); } catch { report = { raw: txt }; }
  return json(res, 200, { status: "ready", report });
}
// GET /api/qc?key=...
function qcReport(report = {}) {
  const r = report.metrics || report || {};
  const issues = [];
  const n = v => (v == null ? NaN : Number(v));
  const shoulder = n(r.shoulder_turn_deg ?? r.shoulderTurn);
  if (!Number.isNaN(shoulder)) {
    if (shoulder < 60) issues.push({ field: "shoulder_turn_deg", level: "warn", msg: "Very small shoulder turn" });
    if (shoulder < 80 || shoulder > 120) issues.push({ field: "shoulder_turn_deg", level: "fail", msg: "Outside normal 80–120° range" });
  }
  const upPath = n(r.swing_path_up_deg ?? r.attackAngle);
  if (!Number.isNaN(upPath) && Math.abs(upPath) > 20)
    issues.push({ field: "swing_path_up_deg", level: "fail", msg: "Attack angle > 20° looks wrong" });
  const club = n(r.club_speed_mph ?? r.clubHeadSpeed);
  if (!Number.isNaN(club)) {
    if (club > 150) issues.push({ field: "club_speed_mph", level: "warn", msg: "Unusually high club speed" });
    if (club > 180) issues.push({ field: "club_speed_mph", level: "fail", msg: "Club speed not credible" });
  }
  const hasFail = issues.some(i => i.level === "fail");
  const hasWarn = issues.some(i => i.level === "warn");
  return { status: hasFail ? "fail" : hasWarn ? "warn" : "ok", issues };
}
async function routeQC(req, res) {
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });
  const url = new URL(req.url, "http://localhost");
  const key = url.searchParams.get("key") || "";
  if (!key) return json(res, 400, { error: "Missing key" });

  const base = baseKey(key);
  const reportKey = `${base}.report.json`;
  let report = null;
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }));
    const txt = await obj.Body.transformToString();
    report = JSON.parse(txt);
  } catch {}
  if (!report) return json(res, 200, { status: "warn", issues: [{ level: "warn", msg: "No report yet" }] });
  return json(res, 200, qcReport(report));
}

// ===== main =====
export default async function handler(req, res) {
  // CORS (safe; same-origin calls don’t need it, but harmless)
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.headers.origin) res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const route = getRoute(req);
  try {
    if (req.method === "GET"  && route === "ping")      return routePing(req, res);
    if (req.method === "GET"  && route === "env-check") return routeEnv(req, res);
    if (req.method === "POST" && route === "presign")   return routePresign(req, res);
    if (req.method === "POST" && route === "upload")    return routeUpload(req, res);
    if (req.method === "POST" && route === "intake")    return routeIntake(req, res);
    if (req.method === "GET"  && route === "analyze")   return routeAnalyze(req, res);
    if (req.method === "GET"  && route === "qc")        return routeQC(req, res);
    return json(res, 404, { error: "Not found" });
  } catch (e) {
    return json(res, 500, { error: String(e.message || e) });
  }
}
