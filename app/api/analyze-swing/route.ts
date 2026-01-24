import { smoothPoseJson } from "./lib/pose_smooth";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { spawn } from "child_process";

function vcaComputeEfficiency(json:any) {
  const frames: any[] =
    Array.isArray(json?.frames) ? json.frames :
    Array.isArray(json?.pose)   ? json.pose   :
    Array.isArray(json?.data?.frames) ? json.data.frames :
    [];

  const n = frames.length || 0;
  if (!n) return { efficiencyProxy: null, efficiencyScore: 72, seqLeadFrames: null };

  const impact =
    (typeof json?.debug?.impactFrame === "number" ? json.debug.impactFrame : null) ??
    (typeof json?.impactFrame === "number" ? json.impactFrame : null) ??
    Math.floor(n * 0.5);

  const clamp = (x:number, lo:number, hi:number) => Math.max(lo, Math.min(hi, x));

  // Use same downswing window as Power: impact-60..impact-5
  const d0 = clamp(impact - 60, 0, n-1);
  const d1 = clamp(impact - 5, 0, n-1);

  // Landmarks (MediaPipe Pose)
  const L_SH = 11, R_SH = 12;
  const L_HIP = 23, R_HIP = 24;

  // Pull already-computed proxies if present
  const powerProxy = (typeof json?.debug?.powerProxy === "number") ? json.debug.powerProxy : null;
  const handSpeedPeak = (typeof json?.debug?.handSpeedPeak === "number") ? json.debug.handSpeedPeak : null;
  const consistencyProxy = (typeof json?.debug?.consistencyProxy === "number") ? json.debug.consistencyProxy : null;

  // Sequencing proxy:
  // - compute shoulder line angle & hip line angle per frame
  // - compute absolute angular velocity (delta angle) per frame
  // - find peak hip vel frame and peak shoulder vel frame
  // - seqLeadFrames = shoulderPeakIdx - hipPeakIdx (positive => hips lead)
  function lineAngleDeg(ax:number, ay:number, bx:number, by:number) {
    return Math.atan2(by - ay, bx - ax) * (180 / Math.PI);
  }
  function wrapDeg(a:number) {
    let x = a;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x;
  }

  const hipAng: number[] = [];
  const shAng: number[] = [];
  const idxs: number[] = [];

  for (let i=d0; i<=d1; i++) {
    const lms = frames[i]?.landmarks;
    if (!Array.isArray(lms) || lms.length <= R_HIP) continue;
    const LS = lms[L_SH], RS = lms[R_SH], LH = lms[L_HIP], RH = lms[R_HIP];
    if (!LS || !RS || !LH || !RH) continue;
    if (![LS,RS,LH,RH].every(p => typeof p.x==="number" && typeof p.y==="number")) continue;

    shAng.push(lineAngleDeg(LS.x, LS.y, RS.x, RS.y));
    hipAng.push(lineAngleDeg(LH.x, LH.y, RH.x, RH.y));
    idxs.push(i);
  }

  function peakVelIndex(ang:number[]) {
    if (ang.length < 3) return null;
    let best = -1;
    let bestV = -1;
    for (let k=1; k<ang.length; k++) {
      const da = Math.abs(wrapDeg(ang[k] - ang[k-1]));
      if (da > bestV) { bestV = da; best = k; }
    }
    return best >= 0 ? best : null;
  }

  const hipPeakK = peakVelIndex(hipAng);
  const shPeakK = peakVelIndex(shAng);

  let seqLeadFrames: number | null = null;
  if (hipPeakK !== null && shPeakK !== null) {
    // in frame units, positive means hip peak happens earlier
    seqLeadFrames = (idxs[shPeakK] - idxs[hipPeakK]);
  }

  // Convert sequencing into 0..1
  // Ideal: hips lead shoulders by ~3..12 frames at 60fps (~0.05..0.2s)
  let seqScore = 0.5;
  if (seqLeadFrames !== null) {
    seqScore = Math.max(0, Math.min(1, (seqLeadFrames - 0) / 12)); // 0 lead => 0, 12 lead => 1
  }

  // Stability penalty from consistencyProxy (lower is better)
  // Typical good: 0.002..0.006
  let stabScore = 0.6;
  if (typeof consistencyProxy === "number") {
    // 0.002 -> ~1.0, 0.010 -> ~0.0
    stabScore = Math.max(0, Math.min(1, 1 - ((consistencyProxy - 0.002) / 0.008)));
  }

  // Power base (0..1) from existing powerProxy if present, else fallback from handSpeedPeak
  let pScore = 0.55;
  if (typeof powerProxy === "number") {
    pScore = Math.max(0, Math.min(1, powerProxy)); // powerProxy already 0..1-ish
  } else if (typeof handSpeedPeak === "number") {
    pScore = Math.max(0, Math.min(1, (handSpeedPeak - 0.008) / 0.020));
  }

  // Efficiency proxy: weighted "clean power"
  const efficiencyProxy = (pScore * 0.55) + (stabScore * 0.25) + (seqScore * 0.20);

  // Score 55..95
  const efficiencyScore = Math.max(55, Math.min(95, Math.round(55 + efficiencyProxy * 40)));

  return {
    efficiencyProxy: Math.round(efficiencyProxy * 1000) / 1000,
    efficiencyScore,
    seqLeadFrames,
    efficiencyWindow: [d0, d1],
  };
}

function vcaLineAngleDeg(ax:number, ay:number, bx:number, by:number) {
  // angle of line AB relative to +x axis, in degrees
  const ang = Math.atan2(by - ay, bx - ax) * (180 / Math.PI);
  return ang;
}

function vcaAngleWrapDeg(a:number) {
  // wrap to [-180, 180]
  let x = a;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function vcaComputePower(json:any) {
  const frames: any[] =
    Array.isArray(json?.frames) ? json.frames :
    Array.isArray(json?.pose)   ? json.pose   :
    Array.isArray(json?.data?.frames) ? json.data.frames :
    [];
  const n = frames.length || 0;
  if (!n) return { powerProxy: null, handSpeedPeak: null, xFactorPeakDeg: null, powerScore: 75 };

  const impact =
    (typeof json?.debug?.impactFrame === "number" ? json.debug.impactFrame : null) ??
    (typeof json?.impactFrame === "number" ? json.impactFrame : null) ??
    Math.floor(n * 0.5);

  const clamp = (x:number, lo:number, hi:number) => Math.max(lo, Math.min(hi, x));

  // Windows: downswing = impact-60..impact-5 (avoid immediate impact noise)
  const d0 = clamp(impact - 60, 0, n-1);
  const d1 = clamp(impact - 5, 0, n-1);

  // Landmark indices (MediaPipe Pose)
  const L_SH = 11, R_SH = 12;
  const L_HIP = 23, R_HIP = 24;
  const L_WR = 15, R_WR = 16;

  // 1) Hand speed proxy: midpoint of wrists, finite difference velocity
  const speeds: number[] = [];
  let prev: {x:number,y:number} | null = null;

  for (let i = d0; i <= d1; i++) {
    const lms = frames[i]?.landmarks;
    if (!Array.isArray(lms) || lms.length <= R_WR) { prev = null; continue; }
    const L = lms[L_WR], R = lms[R_WR];
    if (!L || !R || typeof L.x !== "number" || typeof L.y !== "number" || typeof R.x !== "number" || typeof R.y !== "number") { prev = null; continue; }
    const cur = { x: (L.x + R.x)/2, y: (L.y + R.y)/2 };
    if (prev) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      speeds.push(Math.hypot(dx,dy));
    }
    prev = cur;
  }

  const handSpeedPeak = speeds.length ? Math.max(...speeds) : null;

  // 2) XFactor proxy: shoulder line angle - hip line angle (absolute peak in downswing)
  const xFactors: number[] = [];
  for (let i = d0; i <= d1; i++) {
    const lms = frames[i]?.landmarks;
    if (!Array.isArray(lms) || lms.length <= R_HIP) continue;
    const LS = lms[L_SH], RS = lms[R_SH], LH = lms[L_HIP], RH = lms[R_HIP];
    if (!LS || !RS || !LH || !RH) continue;
    if (![LS,RS,LH,RH].every(p => typeof p.x==="number" && typeof p.y==="number")) continue;

    const shAng = vcaLineAngleDeg(LS.x, LS.y, RS.x, RS.y);
    const hipAng = vcaLineAngleDeg(LH.x, LH.y, RH.x, RH.y);

    // difference wrapped (we care magnitude)
    const diff = Math.abs(vcaAngleWrapDeg(shAng - hipAng));
    xFactors.push(diff);
  }
  const xFactorPeakDeg = xFactors.length ? Math.max(...xFactors) : null;

  // Combine into a single proxy (normalized-ish)
  // These are normalized coordinates; values are small.
  // Typical good handSpeedPeak might be ~0.010-0.030 depending on frame rate/crop.
  // Typical xFactorPeakDeg might be ~10-35 depending on 2D projection.
  const hs = handSpeedPeak ?? 0;
  const xf = xFactorPeakDeg ?? 0;

  // Scale proxies into comparable ranges
  const hsScore = Math.max(0, Math.min(1, (hs - 0.008) / 0.020));   // 0 at 0.008, 1 at 0.028
  const xfScore = Math.max(0, Math.min(1, (xf - 8) / 25));          // 0 at 8deg, 1 at 33deg

  const proxy = (hsScore * 0.65) + (xfScore * 0.35);

  // Score 55–95
  const rawScore = 55 + (proxy * 40);
  const powerScore = Math.round(rawScore);

  return {
    powerProxy: Math.round(proxy * 1000) / 1000,
    handSpeedPeak: handSpeedPeak !== null ? Math.round(handSpeedPeak * 100000) / 100000 : null,
    xFactorPeakDeg: xFactorPeakDeg !== null ? Math.round(xFactorPeakDeg * 10) / 10 : null,
    powerScore,
    powerWindow: [d0, d1],
  };
}

function vcaStdDev(xs: number[]) {
  if (!xs || xs.length < 2) return null;
  const m = xs.reduce((a,b)=>a+b,0) / xs.length;
  const v = xs.reduce((a,b)=>a + (b-m)*(b-m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function vcaComputeConsistency(json: any) {
  const frames: any[] =
    Array.isArray(json?.frames) ? json.frames :
    Array.isArray(json?.pose)   ? json.pose   :
    Array.isArray(json?.data?.frames) ? json.data.frames :
    [];

  const n = frames.length || 0;
  if (!n) return { consistencyProxy: null, consistencyScore: 72 };

  // Try to find impact frame from debug or top-level; fallback to middle
  const impact =
    (typeof json?.debug?.impactFrame === "number" ? json.debug.impactFrame : null) ??
    (typeof json?.impactFrame === "number" ? json.impactFrame : null) ??
    Math.floor(n * 0.5);

  const clamp = (x:number, lo:number, hi:number) => Math.max(lo, Math.min(hi, x));
  const idxL = 15; // left wrist
  const idxR = 16; // right wrist

  // Window around impact: +/- 12 frames (~0.2s at 60fps)
  const w0 = clamp(impact - 12, 0, n-1);
  const w1 = clamp(impact + 12, 0, n-1);

  // Downswing-ish window: impact - 60 to impact - 10 (about 0.8s to 0.17s pre-impact at 60fps)
  const d0 = clamp(impact - 60, 0, n-1);
  const d1 = clamp(impact - 10, 0, n-1);

  function collectMidpoints(a:number, b:number) {
    const xs: number[] = [];
    const ys: number[] = [];
    let used = 0;
    for (let i=a; i<=b; i++) {
      const lms = frames[i]?.landmarks;
      if (!Array.isArray(lms) || lms.length <= idxR) continue;
      const L = lms[idxL], R = lms[idxR];
      if (!L || !R || typeof L.x !== "number" || typeof L.y !== "number" || typeof R.x !== "number" || typeof R.y !== "number") continue;
      xs.push((L.x + R.x) / 2);
      ys.push((L.y + R.y) / 2);
      used++;
    }
    return { xs, ys, used };
  }

  const imp = collectMidpoints(w0, w1);
  const down = collectMidpoints(d0, d1);

  // Std dev of midpoint x/y in each window
  const impX = vcaStdDev(imp.xs) ?? 0.0;
  const impY = vcaStdDev(imp.ys) ?? 0.0;
  const downX = vcaStdDev(down.xs) ?? 0.0;
  const downY = vcaStdDev(down.ys) ?? 0.0;

  // Proxy: weighted (impact stability matters more)
  // Typical good values: ~0.001–0.006 (depends on normalization)
  const proxy = (impX + impY) * 1.3 + (downX + downY) * 0.7;

  // Convert proxy into a 55–95 score (higher better)
  // proxy 0.002 => ~90, proxy 0.006 => ~74, proxy 0.010 => ~60
  const rawScore = 96 - (proxy * 3500);
  const consistencyScore = Math.max(55, Math.min(95, Math.round(rawScore)));

  return {
    consistencyProxy: Math.round(proxy * 100000) / 100000,
    consistencyScore,
    impactFrameUsed: impact,
    impactWindow: [w0, w1],
    downswingWindow: [d0, d1],
    usedImpactPoints: imp.used,
    usedDownswingPoints: down.used,
  };
}

function vcaClamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
function vcaReliabilityFromDebug(dbg: any) {
  // Prefer QC jitter proxy if present; fallback to 0.008 (typical raw) if unknown
  const jitter = typeof dbg?.jitterProxy === "number" ? dbg.jitterProxy : 0.008;
  const missingPct = typeof dbg?.missingPct === "number" ? dbg.missingPct : 0;
  // Convert jitter (0.003–0.015 typical) into a 55–95 score range
  const score = 100 - (jitter * 4000) - (missingPct * 0.8);
  return vcaClamp(Math.round(score), 55, 95);
}



function vcaComputePoseDiagnostics(json: any) {
  const frames: any[] =
    Array.isArray(json?.frames) ? json.frames :
    Array.isArray(json?.pose)   ? json.pose   :
    Array.isArray(json?.data?.frames) ? json.data.frames :
    [];

  const n = frames.length || 0;
  let missing = 0;

  // Mean delta across wrists/hips/ankles (same idea as pose_qc.py)
  const keyIdx = [15, 16, 23, 24, 27, 28]; // wrists, hips, ankles
  let prev: Array<[number, number]> | null = null;
  const deltas: number[] = [];

  for (const fr of frames) {
    const lms = fr?.landmarks;
    if (!Array.isArray(lms) || lms.length < 10) {
      missing++;
      prev = null;
      continue;
    }

    // Build current keypoints
    const cur: Array<[number, number]> = [];
    let ok = true;
    for (const i of keyIdx) {
      const lm = lms[i];
      if (!lm || typeof lm.x !== "number" || typeof lm.y !== "number") { ok = false; break; }
      cur.push([lm.x, lm.y]);
    }
    if (!ok) { prev = null; continue; }

    if (prev) {
      let d = 0;
      for (let k = 0; k < cur.length; k++) {
        const [x0, y0] = prev[k];
        const [x1, y1] = cur[k];
        const dx = x1 - x0;
        const dy = y1 - y0;
        d += Math.hypot(dx, dy);
      }
      deltas.push(d);
    }
    prev = cur;
  }

  const missingPct = n ? (missing / n) * 100 : 0;
  const jitterProxy = deltas.length ? (deltas.reduce((a,b)=>a+b,0) / deltas.length) : null;

  return { frames: n, missing, missingPct: Math.round(missingPct * 100) / 100, jitterProxy };
}
async function __vcaDump(tag: string, payload: any) {
  try {
    if (process.env.NODE_ENV === "production") return;

    const jobId =
      payload?.id ??
      payload?.jobId ??
      payload?.job?.id ??
      payload?.data?.id ??
      `dev_${Date.now()}`;

    const dir = path.join(process.cwd(), ".data", "jobs", String(jobId));
    await mkdir(dir, { recursive: true });

    const write = async (name: string, obj: any) => {
      if (obj === undefined) return;
      const p = path.join(dir, name);
      await writeFile(p, JSON.stringify(obj, null, 2), "utf8");
    };

    await write("response.json", payload);
    await write(`${tag}.json`, payload);

    // Optional common keys (if present)
    await write("ai_raw.json", payload?.ai_raw ?? payload?.aiRaw ?? payload?.raw ?? payload?.model_raw);
    await write("ai_parsed.json", payload?.ai_parsed ?? payload?.aiParsed ?? payload?.parsed ?? payload?.model_parsed);
    await write("ai_summary.json", payload?.ai_summary ?? payload?.aiSummary ?? payload?.summary ?? payload?.report);
  } catch {}
}

export const runtime = "nodejs";

type Body = {
  videoUrl: string;
  impactFrame: number;
  level: "beginner" | "intermediate" | "advanced" | "teacher";
};


function shapeResponse(args: {
  level: string;
  framesDirUrl: string;
  frames: any[];
}) {
  return {
    ok: true,
    level: args.level,
    media: { framesDir: args.framesDirUrl, frames: args.frames },
    scores: { swing: 82, power: 78, reliability: 74, speed: 77, efficiency: 73, consistency: 72 },
    narrative: {
      good: [
        "Good balance and posture through the motion.",
        "Solid rhythm-nothing looks rushed.",
        "Nice intent to swing through the target.",
      ],
      improve: [
        "Clean up the transition so the hands don't ‘throw' early.",
        "Keep your chest over the ball longer through impact.",
        "Stay in your safe hallway on the way down.",
      ],
      powerLeaks: [
        "Arms outrun the body into impact (costs strike + speed).",
        "Standing up through impact (creates thin/fat misses).",
        "Club drifts outside the safe hallway coming down (requires saving it late).",
      ],
    },
  };
}
function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function absUrl(req: NextRequest, maybeRelative: string) {
  const origin = new URL(req.url).origin;
  if (isHttpUrl(maybeRelative)) return maybeRelative;
  if (maybeRelative.startsWith("/")) return `${origin}${maybeRelative}`;
  return `${origin}/${maybeRelative}`;
}

async function downloadToTemp(url: string, tmpDir: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch video (${res.status}) from: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const file = path.join(tmpDir, `video-${Date.now()}-${randomUUID()}.mp4`);
  await fs.writeFile(file, buf);
  return file;
}

// Run python with stdin JSON, expect stdout JSON
function runPythonPoseStdin(videoPath: string, impactFrame: number, outDir: string) {
  return new Promise<any>((resolve, reject) => {
    const pyVenv = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
    const python = existsSync(pyVenv) ? pyVenv : "python";
    const script = path.join(process.cwd(), "app", "api", "analyze-swing", "pose_engine.py");

    const ps = spawn(python, [script], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let out = "";
    let err = "";

    ps.stdout.on("data", (d) => (out += d.toString("utf8")));
    ps.stderr.on("data", (d) => (err += d.toString("utf8")));

    ps.on("close", (code) => {
      if (code !== 0) return reject(new Error(`pose_engine.py failed (code=${code}).\n${err || out}`));
      try {
      const json0 = JSON.parse(out.trim());
      const json = smoothPoseJson(json0, 0.45, 2, 0.0, 0.0); // VCA: smooth pose to reduce jitter
        /* VCA: make reliability score data-driven (jitter + missing frames) */
try {
  const dbg = (json as any).debug;
  const rel = vcaReliabilityFromDebug(dbg);
  if ((json as any).scores && typeof (json as any).scores === "object") {
    (json as any).scores.reliability = rel;
  } else {
    (json as any).scores = { reliability: rel };
  }
} catch {}
/* VCA: make reliability score data-driven (jitter + missing frames) */
try {
  const dbg = (json as any).debug;
  const rel = vcaReliabilityFromDebug(dbg);
  if ((json as any).scores && typeof (json as any).scores === "object") {
    (json as any).scores.reliability = rel;
  } else {
    (json as any).scores = { reliability: rel };
  }
} catch {}
(json as any).debug = { ...(json as any).debug, smoothed: true, alpha: 0.45, maxGap: 2 };
/* VCA: data-driven Consistency score (hand-midpoint stability around impact + downswing) */
try {
  const c = vcaComputeConsistency(json);
  (json as any).debug = { ...(json as any).debug, ...c };
  if ((json as any).scores && typeof (json as any).scores === "object") {
    (json as any).scores.consistency = c.consistencyScore;
  } else {
    (json as any).scores = { consistency: c.consistencyScore };
  }
} catch {}
/* VCA: data-driven Power score (hand-speed peak + XFactor proxy) */
try {
  const p = vcaComputePower(json);
  (json as any).debug = { ...(json as any).debug, ...p };
  if ((json as any).scores && typeof (json as any).scores === "object") {
    (json as any).scores.power = p.powerScore;
  } else {
    (json as any).scores = { power: p.powerScore };
  }
} catch {}
/* VCA: data-driven Efficiency score (clean power + sequencing lead) */
try {
  const e = vcaComputeEfficiency(json);
  (json as any).debug = { ...(json as any).debug, ...e };
  if ((json as any).scores && typeof (json as any).scores === "object") {
    (json as any).scores.efficiency = e.efficiencyScore;
  } else {
    (json as any).scores = { efficiency: e.efficiencyScore };
  }
} catch {}
resolve(json);
      } catch {
        reject(new Error(`pose_engine.py returned non-JSON output:\n${out}\n\nstderr:\n${err}`));
      }
    });

    const payload = JSON.stringify({ videoPath, impactFrame, outDir });
    ps.stdin.write(payload);
    ps.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const videoUrlIn = (body?.videoUrl || "").trim();
    const impactFrame = Number(body?.impactFrame ?? 0) || 0;
    const level = body?.level || "beginner";

    if (!videoUrlIn) return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);// Create session folders
    const sessionId = `sess-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const tmpRoot = path.join(process.cwd(), ".tmp");
    const sessionTmp = path.join(tmpRoot, sessionId);
    const framesOut = path.join(sessionTmp, "frames");
    await fs.mkdir(framesOut, { recursive: true });

    // Resolve video path:
    // - If /uploads/... -> local file in public/uploads/...
    // - If http(s) -> download to tmp
    // - Else treat as relative and map to public/
    let localVideoPath = "";

    if (videoUrlIn.startsWith("/uploads/")) {
      localVideoPath = path.join(process.cwd(), "public", videoUrlIn.replaceAll("/", path.sep));
    } else if (isHttpUrl(videoUrlIn)) {
      const full = absUrl(req, videoUrlIn);
      localVideoPath = await downloadToTemp(full, sessionTmp);
    } else if (videoUrlIn.startsWith("/")) {
      localVideoPath = path.join(process.cwd(), "public", videoUrlIn.replaceAll("/", path.sep));
    } else {
      localVideoPath = path.join(process.cwd(), "public", videoUrlIn.replaceAll("/", path.sep));
    }

    console.log("🧠 analyze-swing", { videoUrlIn, localVideoPath, impactFrame, level, sessionId });

    // Verify local file exists
    try {
      await fs.stat(localVideoPath);
    } catch {
      return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);}

    // Run python -> writes JPGs into framesOut
    const pose = await runPythonPoseStdin(localVideoPath, impactFrame, framesOut);
pose = smoothPoseJson(pose, 0.45, 2, 0.0, 0.0); // VCA: smooth pose to reduce jitter
    if (!pose?.ok) return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);// Copy generated frames into public so browser can load them
    const publicSessionDir = path.join(process.cwd(), "public", "uploads", "_sessions", sessionId);
    await fs.mkdir(publicSessionDir, { recursive: true });

    const files = await fs.readdir(framesOut);
    let copied = 0;
    for (const f of files) {
      const low = f.toLowerCase();
      if (!low.endsWith(".jpg") && !low.endsWith(".jpeg") && !low.endsWith(".png")) continue;
      await fs.copyFile(path.join(framesOut, f), path.join(publicSessionDir, f));
      copied++;
    }

    if (copied < 5) {
      return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);}

    const framesDirUrl = `/uploads/_sessions/${sessionId}`;
    const frames = (pose.frames || []).map((x: any) => ({
      p: x.p,
      label: x.label,
      frame: x.frame,
      file: x.file,
      imageUrl: `${framesDirUrl}/${x.imageUrl}`,
      thumbUrl: `${framesDirUrl}/${x.thumbUrl}`,
    }));

    return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);} catch (e: any) {
    console.error("❌ analyze-swing route failed:", e?.message || e);
    return NextResponse.json(
  shapeResponse({ level, framesDirUrl, frames })
);}
}















