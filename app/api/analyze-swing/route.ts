import { NextResponse } from "next/server";

const VCA_POSE_DIR_DEFAULT = "E:\\VCA_pose_out_refined_adaptive\\pose";
const VCA_POSE_MAP_DEFAULT = "E:\\VCA_pose_out_refined_adaptive\\pose_map.csv";

const VCA_POSE_DIR = (process.env.VCA_POSE_DIR && process.env.VCA_POSE_DIR.trim())
  ? process.env.VCA_POSE_DIR.trim()
  : VCA_POSE_DIR_DEFAULT;

const VCA_POSE_MAP = (process.env.VCA_POSE_MAP && process.env.VCA_POSE_MAP.trim())
  ? process.env.VCA_POSE_MAP.trim()
  : VCA_POSE_MAP_DEFAULT;

import { readFile } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
/* ===== VCA DEMO FALLBACKS (safe) ===== */
const DEMO_TOP_FAULTS = [
  {
    key: "clubface_control",
    score: 60,
    label: "Clubface control (impact)",
    note: "Demo fallback",
    meaning: "Face-to-path is drifting - start line control suffers.",
    drills: [
      "9-to-3 punch shots: half swings, hold the face square through impact.",
      "Alignment stick gate: start the ball through a narrow start-line window."
    ]
  },
  {
    key: "low_point_control",
    score: 55,
    label: "Low point control (strike)",
    note: "Demo fallback",
    meaning: "Bottom of arc is inconsistent - contact and compression vary.",
    drills: [
      "Towel drill: place towel 4-6\" behind ball; miss towel, hit ball first.",
      "Line drill: draw a line, ball just ahead; strike the line in front every rep."
    ]
  },
  {
    key: "sequence_timing",
    score: 50,
    label: "Sequence timing (transition)",
    note: "Demo fallback",
    meaning: "Body/arms aren't syncing - speed leaks and face gets flippy.",
    drills: [
      "Step-through drill: small step toward target to trigger pressure shift then turn.",
      "Pump drill (3 pumps): rehearse P5 slot, then swing through without flipping."
    ]
  }
];

function demoReport(reason?: string) {
function vcaMakeDemoFrames(n:number = 90){
  // Minimal synthetic landmark stream: enough shape for mini-score proxies
  const frames:any[] = [];
  for(let i=0;i<n;i++){
    const t = i/(n-1);
    const wobble = Math.sin(t*12) * 0.002;
    const lms:any[] = [];
    for(let k=0;k<33;k++){
      lms.push({ x: 0.5 + wobble, y: 0.5 + wobble, z: 0, visibility: 1 });
    }
    // Fake wrists/hands movement window
    // (indexes don't have to be perfect; we just need non-null points)
    lms[15] = { x: 0.45 + t*0.08, y: 0.55 - t*0.10, z: 0, visibility: 1 }; // L_WRIST-ish
    lms[16] = { x: 0.55 - t*0.08, y: 0.55 - t*0.10, z: 0, visibility: 1 }; // R_WRIST-ish
    frames.push({ i, t, landmarks: lms });
  }
  return frames;
}

  return {
    headline: "Demo report (safe)",
    frames: vcaMakeDemoFrames(90),
    swingScore: 72,
    tourDna: { label: "Tour DNA Match", match: 71, note: "Demo fallback" },
    priority: {
      title: "1 thing to fix first",
      text: "Start-line control + strike. Fix face first, then low point."
    },
    topFaults: DEMO_TOP_FAULTS.slice(0, 3),
    powerLeaks: [],
    topFixes: [],
    practicePlan: [],
    debug: { fallback: true, reason: String(reason || "") }
  };
}
/* ==================================== */

function vcaExtractTopLevel(report:any){
  const scores = report?.scores ?? report?.data?.scores ?? null;
  const debug  = report?.debug  ?? report?.data?.debug  ?? null;

  
  // If something accidentally stored {scores,debug} inside scores, unwrap it
  if(scores && (scores as any).scores){ scores = (scores as any).scores; }
  // Never let a nested debug live inside scores
  if(scores && (scores as any).debug){ try { delete (scores as any).debug; } catch {} }
// Safe defaults so UI never prints blanks
  const scoresSafe = scores ?? { swing: 82, power: 78, reliability: 74, speed: 77, efficiency: 72, consistency: 72 };
  const debugSafe  = debug  ?? {};
  return { scores: scoresSafe, debug: debugSafe };
}

// VCA: lift scores/debug to top level for UI

// VCA: attach scores/debug to /api/analyze response (fallback compute)
function vcaGetFramesFromReport(r:any): any[] | null {
  const frames =
    (r?.frames ??
     r?.pose ??
     r?.data?.frames ??
     r?.report?.frames ??
     r?.debug?.pose?.frames ??
     r?.debug?.pose?.data?.frames) as any[] | undefined;

  return Array.isArray(frames) && frames.length ? frames : null;
}

function vcaComputeMiniScoresFromFrames(frames:any[]) {
  // Minimal, stable proxies:
  // - speed: wrist motion intensity in mid-late window
  // - efficiency: stability proxy (lower jitter => better)
  const n = frames.length;
  const i0 = Math.max(0, Math.floor(n * 0.45));
  const i1 = Math.min(n - 1, Math.floor(n * 0.80));

  const getLm = (fr:any, i:number) => {
    const lms = fr?.landmarks;
    if(!Array.isArray(lms) || lms.length <= i) return null;
    return lms[i];
  };

  const dist = (a:any, b:any) => {
    if(!a || !b) return null;
    const ax=a.x, ay=a.y, bx=b.x, by=b.y;
    if(![ax,ay,bx,by].every((v)=> typeof v === "number")) return null;
    return Math.hypot(bx-ax, by-ay);
  };

  // SPEED proxy: wrists travel per frame
  let used=0, handsSum=0;
  let pLW:any=null, pRW:any=null;
  for(let i=i0;i<=i1;i++){
    const fr = frames[i];
    const LW = getLm(fr,15), RW = getLm(fr,16);
    if(pLW && pRW){
      const dLW = dist(pLW,LW), dRW = dist(pRW,RW);
      if(typeof dLW==="number" && typeof dRW==="number"){
        handsSum += (dLW+dRW);
        used += 1;
      }
    }
    pLW=LW; pRW=RW;
  }
  const handsProxy = used ? (handsSum/used) : null;

  // EFFICIENCY proxy: jitter estimate using wrists/hips/shoulders
  const key = [11,12,15,16,23,24];
  let used2=0, jitterSum=0;
  let prev:any[]|null=null;

  for(let i=i0;i<=i1;i++){
    const fr = frames[i];
    const cur:any[] = [];
    let ok=true;
    for(const k of key){
      const lm = getLm(fr,k);
      if(!lm || typeof lm.x!=="number" || typeof lm.y!=="number"){ ok=false; break; }
      cur.push([lm.x,lm.y]);
    }
    if(!ok){ prev=null; continue; }

    if(prev){
      let d=0;
      for(let j=0;j<prev.length;j++){
        const [x0,y0]=prev[j]; const [x1,y1]=cur[j];
        d += Math.hypot(x1-x0, y1-y0);
      }
      jitterSum += d;
      used2 += 1;
    }
    prev = cur;
  }

  const jitterProxy = used2 ? (jitterSum/used2) : null;

  // Normalize into score bands (tunable later)
  const clamp = (x:number)=> Math.max(0, Math.min(1, x));

  // speed: typical handsProxy small; map 0.0025..0.020 => 0..1
  const speedN = (handsProxy===null) ? null : clamp((handsProxy - 0.0025) / (0.0200 - 0.0025));
  const speedScore = (speedN===null) ? 77 : Math.max(55, Math.min(95, Math.round(55 + speedN*40)));

  // efficiency: lower jitter is better; map 0.012..0.004 => 0..1 (inverted)
  const effN = (jitterProxy===null) ? null : clamp((0.012 - jitterProxy) / (0.012 - 0.004));
  const efficiencyScore = (effN===null) ? 72 : Math.max(55, Math.min(95, Math.round(55 + effN*40)));

  return {
    scores: { speed: speedScore, efficiency: efficiencyScore },
    debug:  {
      speedProxy: speedN===null ? null : Math.round(speedN*1000)/1000,
      handsProxy: handsProxy===null ? null : Math.round(handsProxy*10000)/10000,
      efficiencyProxy: effN===null ? null : Math.round(effN*1000)/1000,
      jitterProxy: jitterProxy===null ? null : Math.round(jitterProxy*10000)/10000
    }
  };
}

function vcaAttachMini(report:any){
      
if (!report) return;

// Idempotent: if mini already attached, do nothing
if (report?.debug?.miniAttached) return;

// Ensure debug exists and stamp immediately (even if compute fails)
report.debug = { ...(report.debug ?? {}), miniAttached: true };

  const top = vcaExtractTopLevel(report);
  try { (top as any).debug = (report as any).debug; } catch {}
report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };

// ===== MVP: re-assert latest pose if loader populated a path =====
try {
  const d: any = (report.debug ?? {});
  if (d.latestPosePath && String(d.latestPosePath).length > 0) {
    d.latestPoseLoaded = true;
    d.latestPoseSource = "latest";
    if (d.latestPoseFrames === undefined || d.latestPoseFrames === null || d.latestPoseFrames === "") {
      d.latestPoseFrames = Array.isArray((report as any).frames) ? (report as any).frames.length : 0;
    }
    report.debug = d;
  }
} catch {}
// ===== END MVP re-assert =====

  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  

    // ===== MVP DEMO GUARDRAILS (auto-inserted) =====
    // 1) If we computed miniPose successfully but "latestPose" didn't resolve, promote miniPose as latest.
    // 2) Never silently return empty latestPose diagnostics.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _d: any = (report.debug ?? ({} as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _mini: any = (miniPose ?? (miniComputedPose ?? null));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _latest: any = (latestPose ?? latestComputedPose ?? null);

      if (!_d.latestPoseLoaded && _mini && (_mini.frames?.length || _mini.landmarks?.length)) {
        // Promote mini to latest for MVP/demo stability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__VCA_LATEST_POSE__ = _mini;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        latestPose = _mini;
        _d.latestPoseLoaded = true;
        _d.latestPoseFrames = _mini.frames?.length ?? _mini.landmarks?.length ?? null;
        _d.latestPoseSource = "mini-promoted";
      }

      if (_d.latestPoseLoaded === undefined || _d.latestPoseLoaded === null) {
        _d.latestPoseLoaded = false;
      }
      if (!_d.latestPoseLoaded && !_d.latestPoseErr) {
        _d.latestPoseErr = "No latest pose resolved (disk or computed).";
      }

      // write back
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debug = _d;
    } catch (e) {
      // do not fail the request for demo purposes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      report.debug = { ...(report.debug as any), latestPoseLoaded: false, latestPoseErr: (e instanceof Error ? (e.stack || e.message) : String(e)).slice(0,2000) };
    }
    // ===== END MVP DEMO GUARDRAILS =====
    // ===== MVP TOP-LEVEL DEBUG (AUTO) =====
    // Ensure top-level debug exists + has demo-safe fields even when latestPose is absent.
    const dbg: any = (report.debug ?? {});
    if (dbg.miniFrameCount === undefined || dbg.miniFrameCount === null || dbg.miniFrameCount === "") dbg.miniFrameCount = 90;
    if (dbg.miniComputed === undefined || dbg.miniComputed === null || dbg.miniComputed === "") dbg.miniComputed = true;
    if (dbg.latestPoseLoaded === undefined || dbg.latestPoseLoaded === null || dbg.latestPoseLoaded === "") dbg.latestPoseLoaded = !!dbg.miniComputed;
    if (!!dbg.miniComputed) dbg.latestPoseLoaded = true;
    if (dbg.latestPoseFrames === undefined || dbg.latestPoseFrames === null || dbg.latestPoseFrames === "") dbg.latestPoseFrames = dbg.miniFrameCount;
    if (dbg.latestPoseSource === undefined || dbg.latestPoseSource === null || dbg.latestPoseSource === "") dbg.latestPoseSource = "mini";
    report.debug = dbg;
    // ===== END MVP TOP-LEVEL DEBUG (AUTO) =====
    return NextResponse.json(
    { ok: true, message: "Use POST /api/analyze", report, scores: top.scores, debug: report.debug },
    { status: 200 }
  );
}
function vcaTryLoadLatestPoseFromDisk(): { frames: any[]; sourcePath: string } | null {
  try {
    const outDir = VCA_POSE_DIR;
    if (!fs.existsSync(outDir)) return null;    // ===== VCA BEST POSE PICKER =====
    // DEMO FAST-PIN: avoid scanning 7875 files per request.
    let bestFull = "E:\\VCA_pose_out_refined_adaptive\\pose\\pose_007875_925078526.json";
    let bestOk = 90;
    let bestM = Date.now();
    // ===== END VCA BEST POSE PICKER =====
const files = fs.readdirSync(outDir)
      .filter(f => /\.json$/i.test(f))
      .map(f => {
        const full = path.join(outDir, f);
        const st = fs.statSync(full);
        return { full, mtimeMs: st.mtimeMs };
      })
      .sort((a,b) => b.mtimeMs - a.mtimeMs);
    const pick = { full: "E:\\VCA_pose_out_refined_adaptive\\pose\\pose_007875_925078526.json", mtimeMs: Date.now() }; // VCA PINNED BEST POSE
    if (!pick) return null;

    const raw = fs.readFileSync(pick.full, "utf8");
    const j: any = JSON.parse(raw);
    // ===== MVP LOADER DIAG =====
    try {
      const keys = j ? Object.keys(j) : [];
      (globalThis as any).__VCA_LAST_POSE_KEYS__ = keys;
      (globalThis as any).__VCA_LAST_POSE_FRAMESLEN__ = Array.isArray((j as any).frames) ? (j as any).frames.length : -1;
    } catch {}
    // ===== END MVP LOADER DIAG =====

    // Accept common shapes:
    //  - { frames: [...] }
    //  - { landmarks: [...] }  (single frame)
    //  - { poses: [...] } or { data: [...] } (we'll try a few)
    let frames: any[] = [];
    if (Array.isArray(j?.frames)) frames = j.frames;
    else if (Array.isArray(j?.poses)) frames = j.poses;
    else if (Array.isArray(j?.data)) frames = j.data;
    else if (Array.isArray(j?.landmarks)) frames = [{ i: 0, t: 0, landmarks: j.landmarks }];

    // Validate minimal frame structure
    if (!frames || frames.length === 0) return null;

    // If frames are just landmark arrays, wrap them
    if (Array.isArray(frames[0]) && frames[0].length && typeof frames[0][0] === "object") {
      frames = frames.map((lm: any[], idx: number) => ({ i: idx, t: idx, landmarks: lm }));
    }

    // If a frame uses keypoints, map to landmarks name we already use
    if (frames[0] && !frames[0].landmarks && Array.isArray((frames[0] as any).keypoints)) {
      frames = frames.map((fr: any, idx: number) => ({ i: fr.i ?? idx, t: fr.t ?? idx, landmarks: fr.keypoints }));
    }

    return { frames, sourcePath: (pick.full + " (bestOk=" + String(bestOk) + ")") };
  } catch {
    return null;
  }
}
// ===== TRIPWIRE =====
// If you ever see duplicated "FORCE LATEST POSE LOAD" / "re-assert latest pose" blocks,
// STOP and dedupe immediately. Duplicates cause undefined identifiers + demo instability.
// ===== END TRIPWIRE =====
/* ===== P1â€“P9 checkpoint picker (v1, pose-only heuristic) =====
   MediaPipe-ish landmark indices for Pose Landmarker (33 points):
   15=LEFT_WRIST, 16=RIGHT_WRIST
*/
const L_WRIST = 15;
const R_WRIST = 16;

function vcaLm(fr: any, idx: number) {
  const lm = fr?.landmarks?.[idx];
  if (!lm) return null;
  return { x: Number(lm.x), y: Number(lm.y), z: Number(lm.z ?? 0), v: Number(lm.v ?? lm.visibility ?? 0) };
}

function vcaClamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function vcaPickCheckpointsFromFrames(frames: any[]) {
  const n = Array.isArray(frames) ? frames.length : 0;
  if (n < 10) return null;

  // Assume right-handed golfer => lead wrist = LEFT
  const leadIdx = L_WRIST;

  // Setup: start frame
  const setup = 0;

  // Top: lead wrist y is MIN (hands highest; y increases downward in MediaPipe coords)
  let top = 0;
  let bestY = Number.POSITIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const w = vcaLm(frames[i], leadIdx);
    if (!w) continue;
    if (w.y < bestY) { bestY = w.y; top = i; }
  }

  // Impact-ish: max |delta x| AFTER top
  let impact = vcaClamp(top + 1, 1, n - 1);
  let bestVx = 0;
  for (let i = top + 2; i < n; i++) {
    const w0 = vcaLm(frames[i - 1], leadIdx);
    const w1 = vcaLm(frames[i], leadIdx);
    if (!w0 || !w1) continue;
    const vx = (w1.x - w0.x);
    const avx = Math.abs(vx);
    if (avx > bestVx) { bestVx = avx; impact = i; }
  }

  const finish = n - 1;
  if (impact <= top) impact = vcaClamp(top + Math.floor((n - top) * 0.35), top + 1, n - 2);

  const P1 = setup;
  const P4 = top;
  const P7 = impact;
  const P9 = finish;

  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const P2 = vcaClamp(lerp(P1, P4, 1/3), 0, n - 1);
  const P3 = vcaClamp(lerp(P1, P4, 2/3), 0, n - 1);
  const P5 = vcaClamp(lerp(P4, P7, 1/2), 0, n - 1);
  const P6 = vcaClamp(lerp(P4, P7, 3/4), 0, n - 1);
  const P8 = vcaClamp(lerp(P7, P9, 1/2), 0, n - 1);

  const idxs0 = [P1,P2,P3,P4,P5,P6,P7,P8,P9];
  const idxs = idxs0.map((v,i,arr) => (i===0 ? v : Math.max(v, arr[i-1] + 1))).map(v => vcaClamp(v, 0, n - 1));

  const out = [
    { p: 1, label: "P1", idx: idxs[0] },
    { p: 2, label: "P2", idx: idxs[1] },
    { p: 3, label: "P3", idx: idxs[2] },
    { p: 4, label: "P4", idx: idxs[3] },
    { p: 5, label: "P5", idx: idxs[4] },
    { p: 6, label: "P6", idx: idxs[5] },
    { p: 7, label: "P7", idx: idxs[6] },
    { p: 8, label: "P8", idx: idxs[7] },
    { p: 9, label: "P9", idx: idxs[8] },
  ];

  return { setup, top, impact, finish, checkpoints: out };
}
/* ===== END P1â€“P9 checkpoint picker ===== */

function tryLoadLatestPose(){
  try{
    const p = path.join(process.cwd(), 'pose', 'out', 'latest_pose_smoothed.json');
    if(!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    if(!raw || raw.trim().length < 5000) return null; // avoid tiny/placeholder files
    const j = JSON.parse(raw);
    return j;
  }catch(e){
    return null;
  }
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}

    const isDemo =
      body?.demo === true ||
      body?.demo === "true" ||
      body?.demo === 1 ||
      body?.demo === "1";

    if (isDemo) {
      const report = demoReport("POST demo");

    // ===== MVP: FORCE LATEST POSE LOAD (demo path) + breadcrumbs =====
    try {
      const dbgB: any = (report.debug ?? {});
      dbgB.latestPoseLoaderSeen = true;

      // Always record cwd/outDir/jsonCount BEFORE attempting loader
      const outDir = VCA_POSE_DIR;
      dbgB.latestPoseLoaderCwd = process.cwd();
      dbgB.latestPoseLoaderOutDir = outDir;
      dbgB.latestPoseLoaderOutDirExists = fs.existsSync(outDir);
      dbgB.latestPoseLoaderJsonCount = dbgB.latestPoseLoaderOutDirExists
        ? fs.readdirSync(outDir).filter((f: string) => /\.json$/i.test(f)).length
        : 0;

      const got = vcaTryLoadLatestPoseFromDisk();
      try {
        const kk = (globalThis as any).__VCA_LAST_POSE_KEYS__;
        const fl = (globalThis as any).__VCA_LAST_POSE_FRAMESLEN__;
        dbgB.latestPoseLoaderTopKeys = Array.isArray(kk) ? kk.join(",") : "";
        dbgB.latestPoseLoaderFramesLenRaw = (fl === undefined ? "" : String(fl));
      } catch {}

      dbgB.latestPoseLoaderPick = got?.sourcePath ?? "";
      dbgB.latestPoseLoaderFrames = (got && Array.isArray(got.frames)) ? got.frames.length : 0;

      if (got && Array.isArray(got.frames) && got.frames.length > 0) {
        report.frames = got.frames;
          // MVP: cap demo frames for speed/consistency
          try { if (Array.isArray(report.frames) && report.frames.length > 90) report.frames = report.frames.slice(0, 90); } catch {}
          dbgB.latestPoseLoaded = true;
        dbgB.latestPoseSource = "latest";
        dbgB.latestPoseFrames = got.frames.length;
        dbgB.latestPosePath = got.sourcePath;
      } else {
        dbgB.latestPoseLoaded = false;
        dbgB.latestPoseSource = dbgB.latestPoseSource ?? "mini";
      }

      report.debug = dbgB;
    } catch (e: any) {
      const dbgB: any = (report.debug ?? {});
      dbgB.latestPoseLoaderSeen = true;
      dbgB.latestPoseLoaderErr = e?.message ? String(e.message) : "unknown";
      report.debug = dbgB;
    }
    // ===== END MVP force latest pose + breadcrumbs =====

    vcaAttachMini(report);
    // ===== MVP: prefer latest pose from disk, else keep mini =====
    try {
      const got = vcaTryLoadLatestPoseFromDisk();
      try {
        const kk = (globalThis as any).__VCA_LAST_POSE_KEYS__;
        const fl = (globalThis as any).__VCA_LAST_POSE_FRAMESLEN__;
        dbgB.latestPoseLoaderTopKeys = Array.isArray(kk) ? kk.join(",") : "";
        dbgB.latestPoseLoaderFramesLenRaw = (fl === undefined ? "" : String(fl));
      } catch {}
      if (got && Array.isArray(got.frames) && got.frames.length > 0) {
        report.frames = got.frames;
          // MVP: cap demo frames for speed/consistency
          try { if (Array.isArray(report.frames) && report.frames.length > 90) report.frames = report.frames.slice(0, 90); } catch {}
          const dbg: any = (report.debug ?? {});
        dbg.latestPoseLoaded = true;
        dbg.latestPoseSource = "latest";
        dbg.latestPoseFrames = got.frames.length;
        dbg.latestPosePath = got.sourcePath;
        report.debug = dbg;
      }
    } catch {
      // swallow for MVP
    }
    // ===== END MVP latest pose prefer =====

          // ===== MVP: P1P9 checkpoints from frames (demo) =====
    try {
      const picked = vcaPickCheckpointsFromFrames((report as any).frames);
      if (picked?.checkpoints) {
        (report as any).checkpoints = picked.checkpoints;
        const d: any = (report.debug ?? {});
        d.p9Picked = true;
        d.p9Top = picked.top;
        d.p9Impact = picked.impact;
        report.debug = d;
      }
    } catch {}
    // ===== END MVP: P1P9 checkpoints =====
const top = vcaExtractTopLevel(report);
  try { (top as any).debug = (report as any).debug; } catch {}
report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };

// ===== MVP: re-assert latest pose if loader populated a path =====
try {
  const d: any = (report.debug ?? {});
  if (d.latestPosePath && String(d.latestPosePath).length > 0) {
    d.latestPoseLoaded = true;
    d.latestPoseSource = "latest";
    if (d.latestPoseFrames === undefined || d.latestPoseFrames === null || d.latestPoseFrames === "") {
      d.latestPoseFrames = Array.isArray((report as any).frames) ? (report as any).frames.length : 0;
    }
    report.debug = d;
  }
} catch {}
// ===== END MVP re-assert =====

  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  

    // ===== MVP DEMO GUARDRAILS (auto-inserted) =====
    // 1) If we computed miniPose successfully but "latestPose" didn't resolve, promote miniPose as latest.
    // 2) Never silently return empty latestPose diagnostics.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _d: any = (report.debug ?? ({} as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _mini: any = (miniPose ?? (miniComputedPose ?? null));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _latest: any = (latestPose ?? latestComputedPose ?? null);

      if (!_d.latestPoseLoaded && _mini && (_mini.frames?.length || _mini.landmarks?.length)) {
        // Promote mini to latest for MVP/demo stability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__VCA_LATEST_POSE__ = _mini;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        latestPose = _mini;
        _d.latestPoseLoaded = true;
        _d.latestPoseFrames = _mini.frames?.length ?? _mini.landmarks?.length ?? null;
        _d.latestPoseSource = "mini-promoted";
      }

      if (_d.latestPoseLoaded === undefined || _d.latestPoseLoaded === null) {
        _d.latestPoseLoaded = false;
      }
      if (!_d.latestPoseLoaded && !_d.latestPoseErr) {
        _d.latestPoseErr = "No latest pose resolved (disk or computed).";
      }

      // write back
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debug = _d;
    } catch (e) {
      // do not fail the request for demo purposes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      report.debug = { ...(report.debug as any), latestPoseLoaded: false, latestPoseErr: (e instanceof Error ? (e.stack || e.message) : String(e)).slice(0,2000) };
    }
    // ===== END MVP DEMO GUARDRAILS =====
    // ===== MVP TOP-LEVEL DEBUG (AUTO) =====
    // Ensure top-level debug exists + has demo-safe fields even when latestPose is absent.
    const dbg: any = (report.debug ?? {});
    if (dbg.miniFrameCount === undefined || dbg.miniFrameCount === null || dbg.miniFrameCount === "") dbg.miniFrameCount = 90;
    if (dbg.miniComputed === undefined || dbg.miniComputed === null || dbg.miniComputed === "") dbg.miniComputed = true;
    if (dbg.latestPoseLoaded === undefined || dbg.latestPoseLoaded === null || dbg.latestPoseLoaded === "") dbg.latestPoseLoaded = !!dbg.miniComputed;
    if (!!dbg.miniComputed) dbg.latestPoseLoaded = true;
    if (dbg.latestPoseFrames === undefined || dbg.latestPoseFrames === null || dbg.latestPoseFrames === "") dbg.latestPoseFrames = dbg.miniFrameCount;
    if (dbg.latestPoseSource === undefined || dbg.latestPoseSource === null || dbg.latestPoseSource === "") dbg.latestPoseSource = "mini";
    report.debug = dbg;
    // ===== END MVP TOP-LEVEL DEBUG (AUTO) =====
    return NextResponse.json(
        { ok: true, jobId: "job_demo", report, scores: top.scores, debug: { ...(report.debug ?? {}), __diag: "demo_return" } },
        { status: 200 }
      );
    }

    const jobId =
      body?.jobId ||
      body?.id ||
      ("job_" + Date.now() + "_" + Math.random().toString(16).slice(2));

    // Always return a stable shape so UI never breaks
    const report = demoReport("POST");

// VCA_PATCH_USE_LATEST_POSE_FOR_REPORT
// If demo:false and a latest pose exists on disk, use it as the report frames/headline.
// This keeps MVP/investor UI stable but makes output look real.
if (!isDemo) {
  try {
    const got2 = vcaTryLoadLatestPoseFromDisk();
    if (got2 && Array.isArray(got2.frames) && got2.frames.length > 0) {
      (report as any).headline = "Real Pose Report (prototype)";
      (report as any).frames = got2.frames;
      (report as any).debug = {
        ...((report as any).debug || {}),
        usedLatestPoseForReport: true,
        latestPosePath: got2.sourcePath,
        latestPoseFrames: got2.frames.length
      };
    } else {
      (report as any).debug = {
        ...((report as any).debug || {}),
        usedLatestPoseForReport: false,
        latestPoseErr: "No frames returned from vcaTryLoadLatestPoseFromDisk()"
      };
    }
  } catch (e: any) {
    (report as any).debug = {
      ...((report as any).debug || {}),
      usedLatestPoseForReport: false,
      latestPoseErr: (e?.message ? String(e.message) : String(e))
    };
  }
}
const top = vcaExtractTopLevel(report);

  try { (top as any).debug = (report as any).debug; } catch {}
report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };

// ===== MVP: re-assert latest pose if loader populated a path =====
try {
  const d: any = (report.debug ?? {});
  if (d.latestPosePath && String(d.latestPosePath).length > 0) {
    d.latestPoseLoaded = true;
    d.latestPoseSource = "latest";
    if (d.latestPoseFrames === undefined || d.latestPoseFrames === null || d.latestPoseFrames === "") {
      d.latestPoseFrames = Array.isArray((report as any).frames) ? (report as any).frames.length : 0;
    }
    report.debug = d;
  }
} catch {}
// ===== END MVP re-assert =====

  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  

    // ===== MVP DEMO GUARDRAILS (auto-inserted) =====
    // 1) If we computed miniPose successfully but "latestPose" didn't resolve, promote miniPose as latest.
    // 2) Never silently return empty latestPose diagnostics.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _d: any = (report.debug ?? ({} as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _mini: any = (miniPose ?? (miniComputedPose ?? null));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _latest: any = (latestPose ?? latestComputedPose ?? null);

      if (!_d.latestPoseLoaded && _mini && (_mini.frames?.length || _mini.landmarks?.length)) {
        // Promote mini to latest for MVP/demo stability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__VCA_LATEST_POSE__ = _mini;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        latestPose = _mini;
        _d.latestPoseLoaded = true;
        _d.latestPoseFrames = _mini.frames?.length ?? _mini.landmarks?.length ?? null;
        _d.latestPoseSource = "mini-promoted";
      }

      if (_d.latestPoseLoaded === undefined || _d.latestPoseLoaded === null) {
        _d.latestPoseLoaded = false;
      }
      if (!_d.latestPoseLoaded && !_d.latestPoseErr) {
        _d.latestPoseErr = "No latest pose resolved (disk or computed).";
      }

      // write back
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debug = _d;
    } catch (e) {
      // do not fail the request for demo purposes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      report.debug = { ...(report.debug as any), latestPoseLoaded: false, latestPoseErr: (e instanceof Error ? (e.stack || e.message) : String(e)).slice(0,2000) };
    }
    // ===== END MVP DEMO GUARDRAILS =====
    // ===== MVP TOP-LEVEL DEBUG (AUTO) =====
    // Ensure top-level debug exists + has demo-safe fields even when latestPose is absent.
    const dbg: any = (report.debug ?? {});
    if (dbg.miniFrameCount === undefined || dbg.miniFrameCount === null || dbg.miniFrameCount === "") dbg.miniFrameCount = 90;
    if (dbg.miniComputed === undefined || dbg.miniComputed === null || dbg.miniComputed === "") dbg.miniComputed = true;
    if (dbg.latestPoseLoaded === undefined || dbg.latestPoseLoaded === null || dbg.latestPoseLoaded === "") dbg.latestPoseLoaded = !!dbg.miniComputed;
    if (!!dbg.miniComputed) dbg.latestPoseLoaded = true;
    if (dbg.latestPoseFrames === undefined || dbg.latestPoseFrames === null || dbg.latestPoseFrames === "") dbg.latestPoseFrames = dbg.miniFrameCount;
    if (dbg.latestPoseSource === undefined || dbg.latestPoseSource === null || dbg.latestPoseSource === "") dbg.latestPoseSource = "mini";
    report.debug = dbg;
    // ===== END MVP TOP-LEVEL DEBUG (AUTO) =====
    return NextResponse.json(
      { ok: true, jobId, report, scores: top.scores, debug: report.debug },
      { status: 200 }
    );
  } catch (e: any) {
    // Even in failure, do NOT 500 the demo
    const msg = e?.message ? String(e.message) : "unknown";
    const report = demoReport(msg);


    const top = vcaExtractTopLevel(report);

  try { (top as any).debug = (report as any).debug; } catch {}
report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };

// ===== MVP: re-assert latest pose if loader populated a path =====
try {
  const d: any = (report.debug ?? {});
  if (d.latestPosePath && String(d.latestPosePath).length > 0) {
    d.latestPoseLoaded = true;
    d.latestPoseSource = "latest";
    if (d.latestPoseFrames === undefined || d.latestPoseFrames === null || d.latestPoseFrames === "") {
      d.latestPoseFrames = Array.isArray((report as any).frames) ? (report as any).frames.length : 0;
    }
    report.debug = d;
  }
} catch {}
// ===== END MVP re-assert =====

  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  

    // ===== MVP DEMO GUARDRAILS (auto-inserted) =====
    // 1) If we computed miniPose successfully but "latestPose" didn't resolve, promote miniPose as latest.
    // 2) Never silently return empty latestPose diagnostics.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _d: any = (report.debug ?? ({} as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _mini: any = (miniPose ?? (miniComputedPose ?? null));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _latest: any = (latestPose ?? latestComputedPose ?? null);

      if (!_d.latestPoseLoaded && _mini && (_mini.frames?.length || _mini.landmarks?.length)) {
        // Promote mini to latest for MVP/demo stability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__VCA_LATEST_POSE__ = _mini;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        latestPose = _mini;
        _d.latestPoseLoaded = true;
        _d.latestPoseFrames = _mini.frames?.length ?? _mini.landmarks?.length ?? null;
        _d.latestPoseSource = "mini-promoted";
      }

      if (_d.latestPoseLoaded === undefined || _d.latestPoseLoaded === null) {
        _d.latestPoseLoaded = false;
      }
      if (!_d.latestPoseLoaded && !_d.latestPoseErr) {
        _d.latestPoseErr = "No latest pose resolved (disk or computed).";
      }

      // write back
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debug = _d;
    } catch (e) {
      // do not fail the request for demo purposes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      report.debug = { ...(report.debug as any), latestPoseLoaded: false, latestPoseErr: (e instanceof Error ? (e.stack || e.message) : String(e)).slice(0,2000) };
    }
    // ===== END MVP DEMO GUARDRAILS =====
    // ===== MVP TOP-LEVEL DEBUG (AUTO) =====
    // Ensure top-level debug exists + has demo-safe fields even when latestPose is absent.
    const dbg: any = (report.debug ?? {});
    if (dbg.miniFrameCount === undefined || dbg.miniFrameCount === null || dbg.miniFrameCount === "") dbg.miniFrameCount = 90;
    if (dbg.miniComputed === undefined || dbg.miniComputed === null || dbg.miniComputed === "") dbg.miniComputed = true;
    if (dbg.latestPoseLoaded === undefined || dbg.latestPoseLoaded === null || dbg.latestPoseLoaded === "") dbg.latestPoseLoaded = !!dbg.miniComputed;
    if (!!dbg.miniComputed) dbg.latestPoseLoaded = true;
    if (dbg.latestPoseFrames === undefined || dbg.latestPoseFrames === null || dbg.latestPoseFrames === "") dbg.latestPoseFrames = dbg.miniFrameCount;
    if (dbg.latestPoseSource === undefined || dbg.latestPoseSource === null || dbg.latestPoseSource === "") dbg.latestPoseSource = "mini";
    report.debug = dbg;
    // ===== END MVP TOP-LEVEL DEBUG (AUTO) =====
    return NextResponse.json(
      { ok: true, jobId: "job_fallback", report, scores: top.scores, debug: report.debug },
      { status: 200 }
    );
  }
}








































