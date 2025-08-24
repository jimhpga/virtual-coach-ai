// api/[[...slug]].js
// Single Serverless function for ALL endpoints:
//   GET  /api/ping
//   POST /api/upload   (JSON init -> { key } OR multipart with field "file"/"video")
//   POST /api/intake   (stores intake JSON in /tmp next to the key)
//   GET  /api/analyze?key=...   (stub: immediately "ready")
//   GET  /api/qc?key=...        (stub: "ok")
// This avoids S3 so your Upload page can run end-to-end on the Hobby plan.

const fs = require("node:fs");
const path = require("node:path");
const Busboy = require("busboy");

// Disable builtin body parser so we can stream multipart
module.exports.config = { api: { bodyParser: false } };

// ---------- tiny helpers ----------
function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}
function bad(res, msg) { return json(res, 400, { error: msg }); }

function clean(name) {
  return String(name || "").trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}
function makeKey(original = "video.mp4") {
  const safe = clean(original);
  const ext  = (safe.split(".").pop() || "mp4").toLowerCase();
  const base = safe.replace(/\.[a-z0-9]+$/i, "");
  return `uploads/${Date.now()}-${base}.${ext}`;
}
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return {}; }
}
function writeTmp(filename, bufOrStr) {
  const p = path.join("/tmp", filename);
  fs.writeFileSync(p, bufOrStr);
  return p;
}

// ---------- route handlers ----------
async function handlePing(_req, res) {
  return json(res, 200, { ok: true, now: Date.now() });
}

async function handleUpload(req, res) {
  const ct = req.headers["content-type"] || "";

  // MODE A: JSON init -> return just { key } (front-end will fallback to multipart)
  if (ct.includes("application/json")) {
    const { filename = "video.mp4", key } = await readJson(req);
    return json(res, 200, { key: key || makeKey(filename) });
  }

  // MODE B: multipart -> accept "file" or "video" field and save to /tmp
  const bb = Busboy({ headers: req.headers });
  let fileKey = null;
  let uploaded = false;
  let providedKey = null;
  let intakeStr = null;
  let bytes = 0;

  const finished = new Promise((resolve, reject) => {
    bb.on("field", (name, val) => {
      if (name === "key" && val) providedKey = String(val);
      if (name === "intake" && val) intakeStr = String(val);
    });

    bb.on("file", (name, file, info = {}) => {
      if (name !== "file" && name !== "video") { file.resume(); return; }
      const { filename = "video.mp4" } = info;
      fileKey = providedKey || makeKey(filename);

      const out = fs.createWriteStream(path.join("/tmp", path.basename(fileKey)));
      file.on("data", (chunk) => { bytes += chunk.length; });
      file.pipe(out);
      out.on("finish", () => { uploaded = true; });
      out.on("error", reject);
    });

    bb.on("error", reject);
    bb.on("finish", resolve);
  });

  req.pipe(bb);

  try {
    await finished;
    if (!uploaded || !fileKey) return bad(res, "No file received (use field 'file' or 'video')");

    if (intakeStr) {
      try {
        const intakeName = path.basename(fileKey).replace(/\.[a-z0-9]+$/i, "") + ".intake.json";
        writeTmp(intakeName, intakeStr);
      } catch {}
    }

    // No S3 here—just confirm storage in /tmp and echo the key
    return json(res, 200, { status: "stored", key: fileKey, bytes });
  } catch (e) {
    console.error("upload error:", e);
    return json(res, 500, { error: String(e.message || e) });
  }
}

async function handleIntake(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method Not Allowed" });
  const { key, intake } = await readJson(req);
  if (!key) return bad(res, "missing key");
  try {
    const fname = path.basename(key).replace(/\.[a-z0-9]+$/i, "") + ".intake.json";
    writeTmp(fname, JSON.stringify(intake || {}, null, 2));
  } catch {}
  return json(res, 200, { ok: true });
}

async function handleAnalyze(req, res, url) {
  const key = url.searchParams.get("key");
  return json(res, 200, {
    status: key ? "ready" : "pending",
    report: key ? {
      key,
      summary: { priorities: ["Grip", "Posture", "P6 shaft plane"] }
    } : undefined
  });
}

async function handleQC(_req, res) {
  return json(res, 200, { status: "ok", checks: { swingPath: "ok", shoulderTurn: "ok" } });
}

// ---------- router ----------
module.exports = async (req, res) => {
  let url;
  try { url = new URL(req.url, `http://${req.headers.host}`); }
  catch { return json(res, 400, { error: "Bad URL" }); }

  // Paths look like /api/ping, /api/upload, /api/analyze
  const segs = url.pathname.split("/").filter(Boolean);
  // segs[0] === "api"; route = segs[1] (or undefined)
  const route = (segs[1] || "").toLowerCase();

  try {
    if (route === "ping")    return handlePing(req, res);
    if (route === "upload")  return handleUpload(req, res);
    if (route === "intake")  return handleIntake(req, res);
    if (route === "analyze") return handleAnalyze(req, res, url);
    if (route === "qc")      return handleQC(req, res);

    // Help text at /api
    return json(res, 200, {
      ok: true,
      routes: ["/api/ping", "/api/upload", "/api/analyze?key=...", "/api/intake (POST)", "/api/qc"]
    });
  } catch (e) {
    console.error("api error:", e);
    return json(res, 500, { error: String(e.message || e) });
  }
};
