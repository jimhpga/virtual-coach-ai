// /api/qc.js
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "us-west-2";
const bucket = process.env.S3_UPLOAD_BUCKET;
const reportsPrefix = process.env.S3_REPORTS_PREFIX || "reports/";

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function getTextBody(resp) {
  return await resp.Body.transformToString();
}

function parseTempo(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;               // e.g., 3.1
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return +s;            // "3.2"
  const m = s.match(/^(\d+(\.\d+)?)\s*:\s*(\d+(\.\d+)?)$/); // "3:1"
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[3]);
    if (b > 0) return a / b;
  }
  return null;
}

function stdev(arr){
  if (!Array.isArray(arr) || arr.length < 2) return 0;
  const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
  const v = arr.reduce((a,b)=>a+(b-mean)*(b-mean),0)/(arr.length-1);
  return Math.sqrt(v);
}

function safeNumber(n, fallback=null){
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

// Heuristic thresholds: tweak as we learn
const LIMITS = {
  tempo: [1.8, 4.5],                 // ratio backswing:downswing
  releasePct: [5, 95],               // %
  clubPathDeg: [-20, 20],            // deg (inside/outside)
  faceDeg: [-15, 15],                // deg
  shoulderP4: [60, 120],             // deg at top
  hipP7: [-10, 80],                  // deg at impact (negative = closed for RH)
  consistencyMin: 20                 // % floor for any 0–100 metric list
};

// Try to read JSON report from S3
async function loadReport(key){
  const reportKey = `${reportsPrefix}${key.replace(/^uploads\//,'').replace(/\.mp4$/i,'')}.json`;
  await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: reportKey }));
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: reportKey }));
  const txt = await getTextBody(obj);
  return JSON.parse(txt);
}

function runQC(report){
  const issues = [];
  const warnings = [];

  // Basic shape checks
  const phases = Array.isArray(report?.phases) ? report.phases : [];
  if (phases.length < 5) issues.push({code:"few_phases", msg:`Only ${phases.length} phases found (expected up to P1–P9).`});

  // Consistency % lists (0–100)
  const lists = [
    ...(Array.isArray(report.position_metrics) ? report.position_metrics : []),
    ...(Array.isArray(report.swing_metrics) ? report.swing_metrics : [])
  ];
  for (const m of lists){
    const val = safeNumber(m?.value);
    if (val==null || val < 0 || val > 100){
      issues.push({code:"metric_oob", msg:`Metric "${m?.label||m?.p||'unknown'}" has out-of-bounds value ${m?.value}.`});
    } else if (val < LIMITS.consistencyMin){
      warnings.push({code:"metric_low", msg:`"${m?.label||m?.p}" looks noisy (${val}%).`});
    }
  }

  // Power block
  const power = report?.power || {};
  const tempo = parseTempo(power?.tempo);
  if (tempo != null && (tempo < LIMITS.tempo[0] || tempo > LIMITS.tempo[1])){
    warnings.push({code:"tempo_out", msg:`Tempo ratio ${tempo.toFixed(2)}:1 looks unusual (expect ~3:1).`});
  }
  const rel = safeNumber(power?.release_timing);
  if (rel != null && (rel < LIMITS.releasePct[0] || rel > LIMITS.releasePct[1])){
    warnings.push({code:"release_out", msg:`Release timing ${rel}% looks off (expected ${LIMITS.releasePct[0]}–${LIMITS.releasePct[1]}%).`});
  }
  const pscore = safeNumber(power?.score);
  if (pscore != null && (pscore < 0 || pscore > 100)){
    issues.push({code:"power_oob", msg:`Power score ${pscore} out of 0–100.`});
  }

  // If raw angles exist, check them too.
  // Supported shapes (any that show up; all optional):
  // report.angles.p4.shoulder_turn, report.angles.p7.hip_turn, report.angles.p7.club_path_deg, report.angles.p7.face_deg
  const A = report?.angles || {};
  const p4 = A?.p4 || {};
  const p7 = A?.p7 || {};

  const shoulderP4 = safeNumber(p4.shoulder_turn);
  if (shoulderP4 != null && (shoulderP4 < LIMITS.shoulderP4[0] || shoulderP4 > LIMITS.shoulderP4[1])){
    warnings.push({code:"shoulder_p4_out", msg:`Shoulder turn @P4 = ${shoulderP4}° (expected ${LIMITS.shoulderP4[0]}–${LIMITS.shoulderP4[1]}°).`});
  }

  const hipP7 = safeNumber(p7.hip_turn);
  if (hipP7 != null && (hipP7 < LIMITS.hipP7[0] || hipP7 > LIMITS.hipP7[1])){
    warnings.push({code:"hip_p7_out", msg:`Hip turn @P7 = ${hipP7}° (expected ${LIMITS.hipP7[0]}–${LIMITS.hipP7[1]}°).`});
  }

  const clubPath = safeNumber(p7.club_path_deg);
  if (clubPath != null && (clubPath < LIMITS.clubPathDeg[0] || clubPath > LIMITS.clubPathDeg[1])){
    warnings.push({code:"club_path_out", msg:`Club path @P7 = ${clubPath}° (flagging beyond ±${Math.max(...LIMITS.clubPathDeg)}°).`});
  }

  const face = safeNumber(p7.face_deg);
  if (face != null && (face < LIMITS.faceDeg[0] || face > LIMITS.faceDeg[1])){
    warnings.push({code:"face_out", msg:`Face angle @P7 = ${face}° (flagging beyond ±${Math.max(...LIMITS.faceDeg)}°).`});
  }

  // Variation test if per-swing arrays exist (optional)
  // e.g., report.series?.club_path_deg = [ ... per swing ... ]
  const S = report?.series || {};
  const varChecks = [
    { key: "club_path_deg", label: "Club path (°)", maxSd: 10 },
    { key: "face_deg",      label: "Face angle (°)", maxSd: 8  },
    { key: "tempo_ratio",   label: "Tempo ratio",    maxSd: 0.5 }
  ];
  for (const vc of varChecks){
    const arr = S[vc.key];
    if (Array.isArray(arr) && arr.length >= 2){
      const sd = stdev(arr.map(Number).filter(Number.isFinite));
      if (Number.isFinite(sd) && sd > vc.maxSd){
        warnings.push({code:`var_${vc.key}`, msg:`High variation in ${vc.label} (SD ${sd.toFixed(2)} > ${vc.maxSd}).`});
      }
    }
  }

  const status = issues.length ? "fail" : (warnings.length ? "warn" : "ok");
  return { status, issues, warnings };
}

export default async function handler(req, res){
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try{
    const key = req.query.key; // uploads/UUID.mp4
    if (!key) return res.status(400).json({ error: "Missing key" });

    // Load report JSON
    let report;
    try{
      report = await loadReport(key);
    }catch(e){
      return res.status(200).json({ status: "pending", message: "Report not ready yet." });
    }

    const qc = runQC(report);
    res.status(200).json({ status: qc.status, ...qc });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
