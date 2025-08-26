// /api/[[...slug]].js  (Vercel Node.js 20, ESM)
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Busboy from "busboy";

export const config = { api: { bodyParser: false } };

// ==== ENV ====
const REGION = process.env.AWS_REGION || "us-west-2";
const BUCKET = process.env.S3_UPLOAD_BUCKET; // e.g. virtualcoachai-prod
const PREFIX = (process.env.S3_UPLOAD_PREFIX || "uploads/").replace(/^\/+/, "");
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://virtualcoachai.net,https://virtualcoachai-homepage.vercel.app")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

// ==== UTIL ====
function originOk(req) {
  const o = req.headers.origin || "";
  return ALLOWED_ORIGINS.includes(o) ? o : null;
}
function setCORS(req, res) {
  const ok = originOk(req);
  if (ok) res.setHeader("Access-Control-Allow-Origin", ok);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Max-Age", "300");
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
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  try { return JSON.parse(buf.toString("utf8") || "{}"); }
  catch { return {}; }
}
function json(res, code, obj) {
  res.status(code).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}
function baseKey(key) {
  return String(key || "").replace(/\.[a-z0-9]+$/i, "");
}

// Simple QC over a report object
function qcReport(report = {}) {
  const issues = [];
  const r = report.metrics || report || {};

  const shoulder = Number(r.shoulder_turn_deg ?? r.shoulderTurn ?? NaN);
  if (!Number.isNaN(shoulder)) {
    if (shoulder < 60) issues.push({ field: "shoulder_turn_deg", level: "warn", msg: "Very small shoulder turn" });
    if (shoulder < 80 || shoulder > 120) issues.push({ field: "shoulder_turn_deg", level: "fail", msg: "Outside normal 80–120° range" });
  }

  const upPath = Number(r.swing_path_up_deg ?? r.attackAngle ?? NaN);
  if (!Number.isNaN(upPath)) {
    if (Math.abs(upPath) > 20) issues.push({ field: "swing_path_up_deg", level: "fail", msg: "Attack angle > 20° looks wrong" });
  }

  const club = Number(r.club_speed_mph ?? r.clubHeadSpeed ?? NaN);
  if (!Number.isNaN(club)) {
    if (club > 150) issues.push({ field: "club_speed_mph", level: "warn", msg: "Unusually high club speed" });
    if (club > 180) issues.push({ field: "club_speed_mph", level: "fail", msg: "Club speed not credible" });
  }

  const hasFail = issues.some(i => i.level === "fail");
  const hasWarn = issues.some(i => i.level === "warn");
  const status = hasFail ? "fail" : hasWarn ? "warn" : "ok";
  return { status, issues };
}

// ==== ROUTES ====

// GET /api/ping
async function routePing(req, res) {
  return json(res, 200, { pong: true, at: Date.now() });
}

// GET /api/env-check
async function routeEnv(req, res) {
  return json(res, 200, {
    ok: !!(BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    node: process.version,
    region: REGION,
    bucket: BUCKET || "(missing)",
    prefix: PREFIX,
    origins: ALLOWED_ORIGINS
  });
}

// POST /api/presign  { filename, type, key? } -> { key, putUrl }
async function routePresign(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });
  const body = await readJson(req);
  const filename = body.filename || "video.mp4";
  const type = body.type || "application/octet-stream";
  const finalKey = body.key || makeKey(filename);

  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: finalKey, ContentType: type });
  const putUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 15 });
  return json(res, 200, { key: finalKey, putUrl });
}

// POST /api/upload  (multipart: file|video, key?, intake?)
async function routeUpload(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });

  // Guard: small files only via proxy
  const cl = Number(req.headers["content-length"] || 0);
  if (cl > 4_500_000) {
    return json(res, 413, { error: "File too large for proxy upload. Use /api/presign + PUT to S3." });
  }
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });

  const bb = Busboy({ headers: req.headers });
  let fileKey = null;
  let providedKey = null;
  let intakeJson = null;
  let fileUploaded = false;

  const done = new Promise((resolve, reject) => {
    bb.on("field", (name, val) => {
      if (name === "key") providedKey = String(val);
      if (name === "intake") intakeJson = String(val);
    });
    bb.on("file", async (name, file, info) => {
      if (name !== "file" && name !== "video") { file.resume(); return; }
      const { filename = "video.mp4", mimeType } = info || {};
      fileKey = providedKey || makeKey(filename);
      s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: fileKey, Body: file, ContentType: mimeType || "application/octet-stream"
      })).then(() => {
        fileUploaded = true;
      }).catch(reject);
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
          Bucket: BUCKET, Key: `${base}.intake.json`, Body: intakeJson, ContentType: "application/json"
        }));
      } catch { /* ignore intake save failure */ }
    }

    const getUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: fileKey }), { expiresIn: 60 * 60 * 24 });
    return json(res, 200, { status: "stored", key: fileKey, downloadUrl: getUrl });
  } catch (e) {
    return json(res, 500, { error: String(e.message || e) });
  }
}

// POST /api/intake  { key, intake }
async function routeIntake(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
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

// POST /api/report  { key, report }
async function routeReport(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });

  const body = await readJson(req);
  const key = String(body.key || "");
  if (!key) return json(res, 400, { error: "Missing key" });

  const base = baseKey(key);
  const reportKey = `${base}.report.json`;
  const payload = JSON.stringify(body.report || {}, null, 2);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: reportKey,
    Body: payload,
    ContentType: "application/json"
  }));

  return json(res, 200, { ok: true, reportKey });
}

// GET /api/analyze?key=...
async function routeAnalyze(req, res) {
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });
  const key = String(req.query.key || "");
  if (!key) return json(res, 400, { error: "Missing key" });
  const base = baseKey(key);
  const reportKey = `${base}.report.json`;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: reportKey }));
  } catch {
    return json(res, 200, { status: "pending" });
  }

  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }));
  const txt = await obj.Body.transformToString();
  let report = {};
  try { report = JSON.parse(txt); } catch { report = { raw: txt }; }

  return json(res, 200, { status: "ready", report });
}

// GET /api/qc?key=...
async function routeQC(req, res) {
  if (!BUCKET) return json(res, 500, { error: "S3 bucket not configured" });
  const key = String(req.query.key || "");
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

  const out = qcReport(report);
  return json(res, 200, out);
}

// ==== ROUTER ====
export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const parts = Array.isArray(req.query.slug) ? req.query.slug : [];
  const path = parts.join("/").toLowerCase();

  try {
    if (req.method === "GET"  && path === "ping")       return routePing(req, res);
    if (req.method === "GET"  && path === "env-check")  return routeEnv(req, res);

    if (req.method === "POST" && path === "presign")    return routePresign(req, res);
    if (req.method === "POST" && path === "upload")     return routeUpload(req, res);
    if (req.method === "POST" && path === "intake")     return routeIntake(req, res);
    if (req.method === "POST" && path === "report")     return routeReport(req, res);

    if (req.method === "GET"  && path === "analyze")    return routeAnalyze(req, res);
    if (req.method === "GET"  && path === "qc")         return routeQC(req, res);

    return json(res, 404, { error: "Not found" });
  } catch (e) {
    return json(res, 500, { error: String(e.message || e) });
  }
}
