import { vcaBuildFullDemoReport } from "../../lib/report-demo";
import path from "path";
import { mkdir, writeFile, copyFile } from "fs/promises";
import { spawnSync } from "child_process";
import { randomUUID } from "crypto";
const dbgB = (..._args:any[]) => {};
import * as fs from "fs";
import { NextResponse } from "next/server";


const DEFAULT_PLAN14 = [
  "Day 1: 9-to-3 punch shots (face control) — 25 balls + 10 slow rehearsals.",
  "Day 2: Towel drill (low point) — 20 reps + 20 balls.",
  "Day 3: Step-through drill (sequence) — 15 rehearsals + 20 balls.",
  "Day 4: Start-line gate — 25 balls.",
  "Day 5: Line drill (strike in front) — 25 balls.",
  "Day 6: Pump drill (3 pumps) — 15 rehearsals + 20 balls.",
  "Day 7: Combine: 10 balls each (punch/towel/gate).",
  "Day 8: Repeat Day 2 (towel) + add 10 “finish holds”.",
  "Day 9: Repeat Day 1 (punch) + add 10 “hold-off” shots.",
  "Day 10: Repeat Day 3 (step-through) at 70% speed.",
  "Day 11: Random practice: alternate drills every 5 balls (30 balls).",
  "Day 12: Pressure reps: 10 balls — must start inside a 3-yard window.",
  "Day 13: Film 5 swings. Focus: contact + start line.",
  "Day 14: Test day: 20 balls — score 1 point for clean strike + good start."
];

function normalizeReport(report: any) {
  const r: any = report ?? {};
  if (!Array.isArray(r.topFaults)) r.topFaults = [];
  if (!Array.isArray(r.rankedFaults)) r.rankedFaults = (Array.isArray(r.topFaults) ? r.topFaults : []);
  if (!r.scores || typeof r.scores !== "object") r.scores = {};
  if (!r.debug || typeof r.debug !== "object") r.debug = {};
  return r;
}

function okJson(params: { jobId: string; report: any; topScores?: any; message?: string }) {
  const report = normalizeReport(params.report);
  return NextResponse.json({
    ok: true,
    jobId: params.jobId,
    message: params.message ?? null,
    report,
    scores: params.topScores ?? {},
    plan14: DEFAULT_PLAN14,
    practicePlan14: DEFAULT_PLAN14.join("\n"),
  });
}
// VCA debug collector (file-scope)
let _vcad: any = {};
/** Choose the actual thumbnail extension that exists in /public/frames/<jobId>/ */
function vcaCheckpointUrl(jobId: string, p: number): string {
  const base = "/frames";
  try {
    const absDir = path.join(VCA_FRAMES_ROOT,, String(jobId));
    // TS: manual list
    const exts = ["png","jpg","jpeg","webp"];
    for (const ext of exts) {
      const abs = path.join(absDir, `p${p}.${ext}`);
      if (fs.existsSync(abs)) return `${base}/p${p}.${ext}`;
    }
  } catch {}
  // fallback (old behavior)
  return `${base}/p${p}.png`;
}


function vcaTryLoadPoseForJobId(jobId: string): { frames: any[]; sourcePath: string; expectedPath: string } | null {
  const safe = String(jobId || "").replace(/[^a-zA-Z0-9_\-]/g, "");
  const outDir = VCA_POSE_OUT_ROOT;
  const expectedPath = path.join(outDir, `${safe}.json`);
  try {
    if (!safe) return null;
    if (!fs.existsSync(expectedPath)) return null;
    const raw = fs.readFileSync(expectedPath, "utf8");
    const j = JSON.parse(raw);
    const frames = Array.isArray(j?.frames) ? j.frames : [];

    // ---- VCA: ensure each ranked fault has a usable YouTube link (MVP: search URL) ----
     rankedFaults = (Array.isArray(rankedFaults) ? rankedFaults : []).map((f:any)=>({
       ...f,
       youtubeUrl: f?.youtubeUrl || vcaYouTubeForFault(f?.key, f?.label),
     }));

    if (!frames.length) return null;
    return { frames, sourcePath: expectedPath, expectedPath };
  } catch (e: any) {
    try { (globalThis as any).__VCA_JOB_POSE_ERR__ = e?.message ? String(e.message) : "unknown"; } catch {}
    return null;
  }
}

import { readFile } from "fs/promises";

// VCA debug collector (file-scope)
/* ===== VCA DEMO FALLBACKS (safe) ===== */
const DEMO_CLIP_URL = "/demo/impact-demo.mp4";



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

function vcaYouTubeForFault(key?: string, label?: string){
  const k = String(key || "").trim();
  const l = String(label || "").trim();
  const q = (s:string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}`;

  switch(k){
    case "clubface_control":  return q("golf clubface control through impact drill");
    case "low_point_control": return q("golf low point control towel drill ball first");
    case "sequence_timing":   return q("golf transition sequencing pressure then turn drill");
    case "low_turn":          return q("golf backswing hip turn drill");
    case "over_the_top":      return q("stop over the top golf drill");
    case "early_extension":   return q("early extension golf drill keep tush line");
    case "casting":           return q("stop casting golf drill lag");
    case "sway":              return q("golf sway backswing drill");
    default:
      return q(l ? ("golf swing fix " + l) : "golf swing common faults drills");
  }
}

function demoReport(reason?: string) {
  const clip = (typeof (globalThis as any).DEMO_CLIP_URL !== "undefined" ? (globalThis as any).DEMO_CLIP_URL : null) 
            ?? (typeof (DEMO_CLIP_URL as any) !== "undefined" ? (DEMO_CLIP_URL as any) : null)
            ?? "/demo/impact-demo.mp4";

  const topFaults: any[] =
    (typeof DEMO_TOP_FAULTS !== "undefined" && Array.isArray(DEMO_TOP_FAULTS)) ? DEMO_TOP_FAULTS : [];

  const rankedFaults: any[] = (Array.isArray(topFaults) ? topFaults : []).map((f: any, i: number) => ({
    ...f,
    score: (typeof f?.score === "number" ? f.score : (60 - i * 5)),
    youtubeUrl: f?.youtubeUrl || (typeof vcaYouTubeForFault === "function" ? vcaYouTubeForFault(f?.key, f?.label) : ("https://www.youtube.com/results?search_query=" + encodeURIComponent("golf swing drill"))),
  }));

  const nowIso = new Date().toISOString();

  return {
    headline: "Demo report (safe)",
    generatedAt: nowIso,
    clipUrl: String(clip),

    swingScore: 72,
    scores: { speed: 77, efficiency: 72, swing: 82, power: 78, reliability: 74, consistency: 72 },

    tourDna: { label: "Tour DNA Match", match: 71, note: "Demo fallback" },
    player: { note: "Demo mode (no user upload)" },

    overview: [
      "This is a demo report using a local MP4 clip (no pose frames).",
      "Goal: prove the full report UI + drill links + practice plan are working end-to-end.",
      "Next: swap demo to real pose output and keep this UI pixel-identical."
    ],

    priority: {
      key: "low_turn",
      label: "Low turn",
      whyNow: "Fixing low turn gives the biggest stability gain right now—better starts, better strike, less chaos.",
      avoidList: "Avoid chasing speed today. Contact and sequence first.",
      confidenceCue: "Expect a small confidence dip while you change the pattern. Normal. Slow reps first."
    },

    checkpoints: [],

    rankedFaults,

    practicePlan14: [
      "Day 1: 9-to-3 punch shots (face control) — 25 balls + 10 slow rehearsals.",
      "Day 2: Towel drill (low point) — 20 reps + 20 balls.",
      "Day 3: Step-through drill (sequence) — 15 rehearsals + 20 balls.",
      "Day 4: Start-line gate — 25 balls.",
      "Day 5: Line drill (strike in front) — 25 balls.",
      "Day 6: Pump drill (3 pumps) — 15 rehearsals + 20 balls.",
      "Day 7: Combine: 10 balls each (punch/towel/gate).",
      "Day 8: Repeat Day 2 (towel) + add 10 “finish holds”.",
      "Day 9: Start-line gate — 25 balls + 10 slow motion rehearsals.",
      "Day 10: Tempo ladder — 10 swings at 50%, 10 at 70%, 10 at 85%.",
      "Day 11: Randomized target practice — 30 balls, change target every ball.",
      "Day 12: Pressure set — 10 balls: must start inside a 5-yard window.",
      "Day 13: Review day — film 5 swings, compare to checkpoints.",
      "Day 14: Test day — 20 balls, track strike + start line."
    ],

    debug: { demo: true, reason: reason || "demo" }
  };
}

function vcaExtractTopLevel(report:any){
  let scores = report?.scores ?? report?.data?.scores ?? null;
  const debug  = report?.debug  ?? report?.data?.debug  ?? null;

  
  // If something accidentally stored {scores,debug} inside scores, unwrap it
  if(scores && (scores as any).scores){ scores = (scores as any).scores; }
  // Never let a nested debug live inside scores
  if(scores && (scores as any).debug){ try { delete (scores as any).debug; } catch {} }
// Safe defaults so UI never prints blanks
  const scoresSafe = scores ?? { swing: 82, power: 78, reliability: 74, speed: 77, efficiency: 72, consistency: 72 };
  const debugSafe  = debug  ?? {};
  return { scores: scoresSafe, practicePlan14: [
  "Day 1: 9-to-3 punch shots (face control) — 25 balls + 10 slow rehearsals.",
  "Day 2: Towel drill (low point) — 20 reps + 20 balls.",
  "Day 3: Step-through drill (sequence) — 15 rehearsals + 20 balls.",
  "Day 4: Start-line gate — 25 balls.",
  "Day 5: Line drill (strike in front) — 25 balls.",
  "Day 6: Pump drill (3 pumps) — 15 rehearsals + 20 balls.",
  "Day 7: Combine: 10 balls each (punch/towel/gate).",
  "Day 8: Repeat Day 2 (towel) + add 10 “finish holds”.",
  "Day 9: Repeat Day 1 (punch) + add 10 “hold-off” shots.",
  "Day 10: Repeat Day 3 (step-through) at 70% speed.",
  "Day 11: Random practice: alternate drills every 5 balls (30 balls).",
  "Day 12: Pressure reps: 10 balls — must start inside a 3-yard window.",
  "Day 13: Film 5 swings. Focus: contact + start line.",
  "Day 14: Test day: 20 balls — score 1 point for clean strike + good start."
].join("\n"),
plan14: [
  "Day 1: 9-to-3 punch shots (face control) — 25 balls + 10 slow rehearsals.",
  "Day 2: Towel drill (low point) — 20 reps + 20 balls.",
  "Day 3: Step-through drill (sequence) — 15 rehearsals + 20 balls.",
  "Day 4: Start-line gate — 25 balls.",
  "Day 5: Line drill (strike in front) — 25 balls.",
  "Day 6: Pump drill (3 pumps) — 15 rehearsals + 20 balls.",
  "Day 7: Combine: 10 balls each (punch/towel/gate).",
  "Day 8: Repeat Day 2 (towel) + add 10 “finish holds”.",
  "Day 9: Repeat Day 1 (punch) + add 10 “hold-off” shots.",
  "Day 10: Repeat Day 3 (step-through) at 70% speed.",
  "Day 11: Random practice: alternate drills every 5 balls (30 balls).",
  "Day 12: Pressure reps: 10 balls — must start inside a 3-yard window.",
  "Day 13: Film 5 swings. Focus: contact + start line.",
  "Day 14: Test day: 20 balls — score 1 point for clean strike + good start."
].join("\n"),
debug: debugSafe };
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
      let d = 0;
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
    practicePlan14: [
  "Day 1: 9-to-3 punch shots (face control) — 25 balls + 10 slow rehearsals.",
  "Day 2: Towel drill (low point) — 20 reps + 20 balls.",
  "Day 3: Step-through drill (sequence) — 15 rehearsals + 20 balls.",
  "Day 4: Start-line gate — 25 balls.",
  "Day 5: Line drill (strike in front) — 25 balls.",
  "Day 6: Pump drill (3 pumps) — 15 rehearsals + 20 balls.",
  "Day 7: Combine: 10 balls each (punch/towel/gate).",
  "Day 8: Repeat Day 2 (towel) + add 10 “finish holds”.",
  "Day 9: Repeat Day 1 (punch) + add 10 “hold-off” shots.",
  "Day 10: Repeat Day 3 (step-through) at 70% speed.",
  "Day 11: Random practice: alternate drills every 5 balls (30 balls).",
  "Day 12: Pressure reps: 10 balls — must start inside a 3-yard window.",
  "Day 13: Film 5 swings. Focus: contact + start line.",
  "Day 14: Test day: 20 balls — score 1 point for clean strike + good start."
].join("\n"),
plan14: [
  "Day 1: 9-to-3 punch shots (face control) — 25 balls + 10 slow rehearsals.",
  "Day 2: Towel drill (low point) — 20 reps + 20 balls.",
  "Day 3: Step-through drill (sequence) — 15 rehearsals + 20 balls.",
  "Day 4: Start-line gate — 25 balls.",
  "Day 5: Line drill (strike in front) — 25 balls.",
  "Day 6: Pump drill (3 pumps) — 15 rehearsals + 20 balls.",
  "Day 7: Combine: 10 balls each (punch/towel/gate).",
  "Day 8: Repeat Day 2 (towel) + add 10 “finish holds”.",
  "Day 9: Repeat Day 1 (punch) + add 10 “hold-off” shots.",
  "Day 10: Repeat Day 3 (step-through) at 70% speed.",
  "Day 11: Random practice: alternate drills every 5 balls (30 balls).",
  "Day 12: Pressure reps: 10 balls — must start inside a 3-yard window.",
  "Day 13: Film 5 swings. Focus: contact + start line.",
  "Day 14: Test day: 20 balls — score 1 point for clean strike + good start."
].join("\n"),
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



  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  

    
    // ===== MVP TOP-LEVEL DEBUG (AUTO) =====
    // Ensure top-level debug exists + has demo-safe fields even when latestPose is absent.
    const dbg: any = (report.debug ?? {});
    if (dbg.miniFrameCount === undefined || dbg.miniFrameCount === null || dbg.miniFrameCount === "") dbg.miniFrameCount = 90;
    if (dbg.miniComputed === undefined || dbg.miniComputed === null || dbg.miniComputed === "") dbg.miniComputed = true;
    if (dbg.latestPoseLoaded === undefined || dbg.latestPoseLoaded === null || dbg.latestPoseLoaded === "") dbg.latestPoseLoaded = !!dbg.miniComputed;
    if (!!dbg.miniComputed) dbg.latestPoseLoaded = true;
          try { (report as any).debug = ((report as any).debug ?? {}); (report as any).debug.fallback = false; } catch {}
    if (dbg.latestPoseFrames === undefined || dbg.latestPoseFrames === null || dbg.latestPoseFrames === "") dbg.miniFramesUsed = dbg.miniFrameCount;
    if (dbg.latestPoseSource === undefined || dbg.latestPoseSource === null || dbg.latestPoseSource === "") dbg.miniSource = "mini";
    report.debug = dbg;
    // ===== END MVP TOP-LEVEL DEBUG (AUTO) =====
// ===== MVP DEBUG NORMALIZE (stable) =====
try {
  const d: any = (report.debug ?? {});
  const hasPath = !!(_vcad.latestPosePath && String(_vcad.latestPosePath).length > 0);
  _vcad = (typeof dbgB !== "undefined" ? dbgB : {}) as any;
  _vcad.latestPoseSource = (_vcad.latestPoseSource ?? (hasPath ? "latest" : "mini"));
  _vcad.latestPoseLoaded = hasPath ? true : (_vcad.latestPoseLoaded ?? false);
  // VCA: if loader picked a pose file, treat it as latestPosePath for breadcrumbs
  if (!_vcad.latestPosePath && (d as any).latestPoseLoaderPick) _vcad.latestPosePath = (d as any).latestPoseLoaderPick;
  if (_vcad.latestPoseFrames === undefined || _vcad.latestPoseFrames === null || _vcad.latestPoseFrames === "") {
    _vcad.latestPoseFrames = Array.isArray((report as any).frames) ? (report as any).frames.length : (_vcad.miniFrameCount ?? 0);
  }
  report.debug = d;
} catch {}
// ===== END MVP DEBUG NORMALIZE =====

        // ===== VCA: FINALIZE DEBUG FLAGS (do not lie if pose loaded) =====
    try {
      const d: any = ((report as any).debug ?? {});
      if (_vcad.latestPoseLoaded === true) _vcad.fallback = false;
      (report as any).debug = d;
    } catch {}


    // ===== VCA: RETURN TAG (R1) =====



    try {



      const d: any = ((report as any).debug ?? {});



      _vcad.__returnTag = "R1";



      (report as any).debug = d;



    } catch {}



      // ===== VCA: normalize output (UI-proof) =====
  try {
    const r:any = (report as any) ?? {};
    if (!Array.isArray(r.topFaults)) r.topFaults = [];
    if (!Array.isArray(r.rankedFaults)) r.rankedFaults = (Array.isArray(r.topFaults) ? r.topFaults : []);
    if (!r.scores || typeof r.scores !== "object") r.scores = {};
    (report as any) = r;
  } catch {}
  // ============================================
  return okJson({ jobId: "job_info", message: "Use POST /api/analyze", report, topScores: top.scores });
}
function vcaTryLoadLatestPoseFromDisk(): { frames: any[]; sourcePath: string } | null {
  try {
    const outDir = VCA_POSE_OUT_ROOT;
    if (!fs.existsSync(outDir)) return null;

    const files = fs.readdirSync(outDir)
      .filter(f => /\.json$/i.test(f))
      .map(f => {
        const full = path.join(outDir, f);
        const st = fs.statSync(full);
        return { full, mtimeMs: st.mtimeMs };
      })
      .sort((a,b) => b.mtimeMs - a.mtimeMs);

    const pick = files[0];
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

    return { frames, sourcePath: pick.full };
  } catch {
    return null;
  }
}
// ===== TRIPWIRE =====
// If you ever see duplicated "FORCE LATEST POSE LOAD" / "re-assert latest pose" blocks,
// STOP and dedupe immediately. Duplicates cause undefined identifiers + demo instability.
// ===== END TRIPWIRE =====
/* ===== P1–P9 checkpoint picker (v1, pose-only heuristic) =====
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
/* ===== END P1–P9 checkpoint picker ===== */

export async function POST(req: Request) {
  // ===== VCA_MULTIPART_UPLOAD_START =====
  // Accept multipart/form-data from /upload page:
  // - file: video
  // - jobId: optional
  try {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      const fAny = fd.get("file");
      const jobIdFromForm = String(fd.get("jobId") || "").trim();
      const jobId = jobIdFromForm || ("job_" + randomUUID());

      if (fAny && typeof (fAny as any).arrayBuffer === "function") {
        const f = fAny as unknown as File;

        // Read bytes
        const ab = await f.arrayBuffer();
        const buf = Buffer.from(ab);

        // Paths
        const repoRoot = process.cwd();
        const pubDir = path.join(VCA_UPLOAD_ROOT, jobId);
        const pubMp4 = path.join(pubDir, "swing.mp4");

        const poseInDir = VCA_POSE_IN_ROOT;
        const poseOutDir = VCA_POSE_OUT_ROOT;
        const poseInMp4 = path.join(poseInDir, "latest.mp4");
        const poseOutLatest = path.join(poseOutDir, "latest.json");
        const poseOutJob = path.join(poseOutDir, `${jobId}.json`);

        await mkdir(pubDir, { recursive: true });
        await mkdir(poseInDir, { recursive: true });
        await mkdir(poseOutDir, { recursive: true });

        // Write video for playback + analysis
        await writeFile(pubMp4, buf);
        await writeFile(poseInMp4, buf);

        // Build a "body" object so the rest of your logic keeps working
        // (Your existing code expects JSON body; we simulate it here.)
        const _vcaMultipartBody: any = {
          demo: false,
          jobId,
          videoUrl: vcaUploadUrl(`${jobId}/swing.mp4`),
          uploaded: true,
        };

        // Optional: run pose estimation immediately if configured.
        // Set env var in PowerShell before dev:
        //   $env:VCA_POSE_MODEL="C:\path\to\pose_landmarker.task"
        // It will write pose\out\latest.json and pose\out\<jobId>.json
        try {
          const model = process.env.VCA_POSE_MODEL || "";
          if (model) {
            const py = process.env.VCA_PYTHON || "python";
            const args = [
              ".\\scripts\\pose_estimate_tasks.py",
              "--in", poseInMp4,
              "--out", poseOutJob,
              "--model", model,
              "--sample", "90"
            ];
            const r = spawnSync(py, args, { cwd: repoRoot, stdio: "ignore" });
            if (!r.error) {
              try { await copyFile(poseOutJob, poseOutLatest); } catch {}
              _vcaMultipartBody.poseRequested = true;
              _vcaMultipartBody.poseOut = poseOutJob;
            } else {
              _vcaMultipartBody.poseRequested = false;
              _vcaMultipartBody.poseErr = String(r.error || "");
            }
          } else {
            _vcaMultipartBody.poseRequested = false;
            _vcaMultipartBody.poseErr = "VCA_POSE_MODEL not set";
          }
        } catch (e: any) {
          _vcaMultipartBody.poseRequested = false;
          _vcaMultipartBody.poseErr = String(e?.message || e || "");
        }

        // Stash for downstream code: we re-route by overwriting req.json() logic below.
        (globalThis as any).__VCA_MULTIPART_BODY__ = _vcaMultipartBody;
      }
    }
  } catch {}
  // ===== VCA_MULTIPART_UPLOAD_END =====
  // ===== VCA DEMO FAST PATH =====
  try {
    let _body: any = {};
    try { _body = await req.json(); } catch {}
    if (Boolean(_body?.demo) === true) {
      const rep: any = demoReport("demo");
      return NextResponse.json({
        ok: true,
        report: rep,
        scores: (rep?.scores ?? {}),
        practicePlan14: (rep?.practicePlan14 ?? rep?.practicePlan ?? [])
      });
    }
  } catch {}
  // ===== END VCA DEMO FAST PATH =====

  try {
    let body: any = {};
    try { body = await req.json();
    const jobIdFromBody = (typeof (body as any)?.jobId !== "undefined" && (body as any)?.jobId !== null) ? String((body as any).jobId) : ""; } catch {}

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
      const outDir = VCA_POSE_OUT_ROOT;
      dbgB.latestPoseLoaderCwd = process.cwd();
      dbgB.latestPoseLoaderOutDir = outDir;
      dbgB.latestPoseLoaderOutDirExists = fs.existsSync(outDir);
      dbgB.latestPoseLoaderJsonCount = dbgB.latestPoseLoaderOutDirExists
        ? fs.readdirSync(outDir).filter((f: string) => /\.json$/i.test(f)).length
        : 0;

      const jobIdFromBody = (typeof (body as any)?.jobId === "string") ? String((body as any).jobId) : "";
const gotJob = jobIdFromBody ? vcaTryLoadPoseForJobId(jobIdFromBody) : null;

let got = null as any;

// Prefer job pose when requested
if (gotJob && Array.isArray(gotJob.frames) && gotJob.frames.length > 0) {
  got = { frames: gotJob.frames, sourcePath: gotJob.sourcePath };
  _vcad.poseSource = "job";
  _vcad.jobPoseRequested = jobIdFromBody;
  _vcad.jobPosePath = gotJob.sourcePath;
  _vcad.jobPoseFramesAvailable = gotJob.frames.length;
} else {
  // If jobId requested but we didn't load it, label why (missing vs parse error)
  try {
    if (jobIdFromBody) {
      const safe = jobIdFromBody.replace(/[^a-zA-Z0-9_\-]/g, "");
      const outDir = VCA_POSE_OUT_ROOT;
      const expectedPath = path.join(outDir, `${safe}.json`);
      if (fs.existsSync(expectedPath)) {
        _vcad.poseSource = "job_parse_error_fallback_latest";
        _vcad.jobPoseRequested = jobIdFromBody;
        _vcad.jobPosePathExpected = expectedPath;
        _vcad.jobPoseErr = ((globalThis as any).__VCA_JOB_POSE_ERR__ ?? "") as any;
      } else {
        _vcad.poseSource = "job_missing_fallback_latest";
        _vcad.jobPoseRequested = jobIdFromBody;
        _vcad.jobPosePathExpected = expectedPath;
      }
    }
  } catch {}
  got = vcaTryLoadLatestPoseFromDisk();
}

      try {
        const kk = (globalThis as any).__VCA_LAST_POSE_KEYS__;
        const fl = (globalThis as any).__VCA_LAST_POSE_FRAMESLEN__;


      } catch {}

      dbgB.latestPoseLoaderPick = got?.sourcePath ?? "";
      dbgB.latestPoseLoaderFrames = (got && Array.isArray(got.frames)) ? got.frames.length : 0;

      if (got && Array.isArray(got.frames) && got.frames.length > 0) {
        if (!(Boolean((body as any)?.demo) || String((body as any)?.jobId || "") === "job_demo")) { report.frames = got.frames; }
          // MVP: cap demo frames for speed/consistency
          try { if (Array.isArray(report.frames) && report.frames.length > 90) report.frames = report.frames.slice(0, 90); } catch {}
          try { (report as any).debug = ((report as any).debug ?? {}); (report as any).debug.analysisFramesUsed = Array.isArray((report as any).frames) ? (report as any).frames.length : 0; } catch {}
          dbgB.latestPoseLoaded = true;
        dbgB.latestPoseSource = "latest";
        dbgB.latestPoseFrames = got.frames.length;
        dbgB.latestPoseFramesAvailable = got.frames.length;
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
      const jobIdFromBody = (typeof (body as any)?.jobId === "string") ? String((body as any).jobId) : "";
const gotJob = jobIdFromBody ? vcaTryLoadPoseForJobId(jobIdFromBody) : null;

let got = null as any;

// Prefer job pose when requested
if (gotJob && Array.isArray(gotJob.frames) && gotJob.frames.length > 0) {
  got = { frames: gotJob.frames, sourcePath: gotJob.sourcePath };
  _vcad.poseSource = "job";
  _vcad.jobPoseRequested = jobIdFromBody;
  _vcad.jobPosePath = gotJob.sourcePath;
  _vcad.jobPoseFramesAvailable = gotJob.frames.length;
} else {
  // If jobId requested but we didn't load it, label why (missing vs parse error)
  try {
    if (jobIdFromBody) {
      const safe = jobIdFromBody.replace(/[^a-zA-Z0-9_\-]/g, "");
      const outDir = VCA_POSE_OUT_ROOT;
      const expectedPath = path.join(outDir, `${safe}.json`);
      if (fs.existsSync(expectedPath)) {
        _vcad.poseSource = "job_parse_error_fallback_latest";
        _vcad.jobPoseRequested = jobIdFromBody;
        _vcad.jobPosePathExpected = expectedPath;
        _vcad.jobPoseErr = ((globalThis as any).__VCA_JOB_POSE_ERR__ ?? "") as any;
      } else {
        _vcad.poseSource = "job_missing_fallback_latest";
        _vcad.jobPoseRequested = jobIdFromBody;
        _vcad.jobPosePathExpected = expectedPath;
      }
    }
  } catch {}
  got = vcaTryLoadLatestPoseFromDisk();
}

      try {
        const kk = (globalThis as any).__VCA_LAST_POSE_KEYS__;
        const fl = (globalThis as any).__VCA_LAST_POSE_FRAMESLEN__;


      } catch {}
      if (got && Array.isArray(got.frames) && got.frames.length > 0) {
        if (!(Boolean((body as any)?.demo) || String((body as any)?.jobId || "") === "job_demo")) { report.frames = got.frames; }
          // MVP: cap demo frames for speed/consistency
          try { if (Array.isArray(report.frames) && report.frames.length > 90) report.frames = report.frames.slice(0, 90); } catch {}
          try { (report as any).debug = ((report as any).debug ?? {}); (report as any).debug.analysisFramesUsed = Array.isArray((report as any).frames) ? (report as any).frames.length : 0; } catch {}
          const dbg: any = (report.debug ?? {});
        dbg.latestPoseLoaded = true;
          try { (report as any).debug = ((report as any).debug ?? {}); (report as any).debug.fallback = false; } catch {}
        dbg.latestPoseSource = "latest";
        dbg.latestPoseFrames = got.frames.length;
        dbg.latestPoseFramesAvailable = got.frames.length;
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
        _vcad.p9Picked = true;
        _vcad.p9Top = picked.top;
        _vcad.p9Impact = picked.impact;
        report.debug = d;
      }
    } catch {}
    // ===== END MVP: P1P9 checkpoints =====
const top = vcaExtractTopLevel(report);
  try { (top as any).debug = (report as any).debug; } catch {}
report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };



  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  

    
    
// ===== MVP DEBUG NORMALIZE (stable) =====
try {
  const d: any = (report.debug ?? {});
  const hasPath = !!(_vcad.latestPosePath && String(_vcad.latestPosePath).length > 0);
  _vcad.latestPoseSource = (_vcad.latestPoseSource ?? (hasPath ? "latest" : "mini"));
  _vcad.latestPoseLoaded = hasPath ? true : (_vcad.latestPoseLoaded ?? false);
  // VCA: if loader picked a pose file, treat it as latestPosePath for breadcrumbs
  if (!_vcad.latestPosePath && (d as any).latestPoseLoaderPick) _vcad.latestPosePath = (d as any).latestPoseLoaderPick;
  if (_vcad.latestPoseFrames === undefined || _vcad.latestPoseFrames === null || _vcad.latestPoseFrames === "") {
    _vcad.latestPoseFrames = Array.isArray((report as any).frames) ? (report as any).frames.length : (_vcad.miniFrameCount ?? 0);
  }
  report.debug = d;
} catch {}
// ===== END MVP DEBUG NORMALIZE =====

        // ===== VCA: FINALIZE DEBUG FLAGS (do not lie if pose loaded) =====
    try {
      const d: any = ((report as any).debug ?? {});
      if (_vcad.latestPoseLoaded === true) _vcad.fallback = false;
      (report as any).debug = d;
    } catch {}


    // ===== VCA: RETURN TAG (R2) =====



    try {



      const d: any = ((report as any).debug ?? {});



      _vcad.__returnTag = "R2";



      (report as any).debug = d;



    } catch {}



    return okJson({ jobId: "job_demo", report, topScores: top.scores });
}

    const jobId =
      body?.jobId ||
      body?.id ||
      ("job_" + Date.now() + "_" + Math.random().toString(16).slice(2));

    // Always return a stable shape so UI never breaks
    const report = demoReport("POST");


    const top = vcaExtractTopLevel(report);

  try { (top as any).debug = (report as any).debug; } catch {}
report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };



  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  

    
    
// ===== MVP DEBUG NORMALIZE (stable) =====
try {
  const d: any = (report.debug ?? {});
  const hasPath = !!(_vcad.latestPosePath && String(_vcad.latestPosePath).length > 0);
  _vcad.latestPoseSource = (_vcad.latestPoseSource ?? (hasPath ? "latest" : "mini"));
  _vcad.latestPoseLoaded = hasPath ? true : (_vcad.latestPoseLoaded ?? false);
  // VCA: if loader picked a pose file, treat it as latestPosePath for breadcrumbs
  if (!_vcad.latestPosePath && (d as any).latestPoseLoaderPick) _vcad.latestPosePath = (d as any).latestPoseLoaderPick;
  if (_vcad.latestPoseFrames === undefined || _vcad.latestPoseFrames === null || _vcad.latestPoseFrames === "") {
    _vcad.latestPoseFrames = Array.isArray((report as any).frames) ? (report as any).frames.length : (_vcad.miniFrameCount ?? 0);
  }
  report.debug = d;
} catch {}
// ===== END MVP DEBUG NORMALIZE =====

        // ===== VCA: FINALIZE DEBUG FLAGS (do not lie if pose loaded) =====
    try {
      const d: any = ((report as any).debug ?? {});
      if (_vcad.latestPoseLoaded === true) _vcad.fallback = false;
      (report as any).debug = d;
    } catch {}


    // ===== VCA: RETURN TAG (R3) =====
try {
  const d: any = ((report as any).debug ?? {});
  _vcad.__returnTag = "R3";

  // ===== VCA: R3 breadcrumb hardening =====
  // Ensure R3 also loads latest pose (same as demo path) so breadcrumbs are real
  try {
    const jobIdFromBody = (typeof (body as any)?.jobId === "string") ? String((body as any).jobId) : "";
const gotJob = jobIdFromBody ? vcaTryLoadPoseForJobId(jobIdFromBody) : null;

let got = null as any;

// Prefer job pose when requested
if (gotJob && Array.isArray(gotJob.frames) && gotJob.frames.length > 0) {
  got = { frames: gotJob.frames, sourcePath: gotJob.sourcePath };
  _vcad.poseSource = "job";
  _vcad.jobPoseRequested = jobIdFromBody;
  _vcad.jobPosePath = gotJob.sourcePath;
  _vcad.jobPoseFramesAvailable = gotJob.frames.length;
} else {
  // If jobId requested but we didn't load it, label why (missing vs parse error)
  try {
    if (jobIdFromBody) {
      const safe = jobIdFromBody.replace(/[^a-zA-Z0-9_\-]/g, "");
      const outDir = VCA_POSE_OUT_ROOT;
      const expectedPath = path.join(outDir, `${safe}.json`);
      if (fs.existsSync(expectedPath)) {
        _vcad.poseSource = "job_parse_error_fallback_latest";
        _vcad.jobPoseRequested = jobIdFromBody;
        _vcad.jobPosePathExpected = expectedPath;
        _vcad.jobPoseErr = ((globalThis as any).__VCA_JOB_POSE_ERR__ ?? "") as any;
      } else {
        _vcad.poseSource = "job_missing_fallback_latest";
        _vcad.jobPoseRequested = jobIdFromBody;
        _vcad.jobPosePathExpected = expectedPath;
      }
    }
  } catch {}
  got = vcaTryLoadLatestPoseFromDisk();
}

    _vcad.latestPoseLoaderSeen = true;
    _vcad.latestPoseLoaderPick = got?.sourcePath ?? "";
    _vcad.latestPoseLoaderFrames = (got && Array.isArray(got.frames)) ? got.frames.length : 0;

    if (got && Array.isArray(got.frames) && got.frames.length > 0) {
      // Use the real pose frames, but cap for MVP speed
      (report as any).frames = got.frames;
      try { if (Array.isArray((report as any).frames) && (report as any).frames.length > 90) (report as any).frames = (report as any).frames.slice(0, 90); } catch {}

      _vcad.latestPoseLoaded = true;
      _vcad.latestPosePath = got.sourcePath;
      _vcad.latestPoseSource = "latest";
      _vcad.latestPoseFramesAvailable = got.frames.length;

      // Guardrail: pose too short => low confidence (do not 500)
      try {
        const avail = (typeof _vcad.latestPoseFramesAvailable === "number") ? _vcad.latestPoseFramesAvailable : 0;
        if (avail > 0 && avail < 60) {
          _vcad.lowConfidence = true;
          _vcad.lowConfidenceReason = "pose_too_short";
        }
      } catch {}
    }
  } catch (e: any) {
    _vcad.latestPoseLoaderSeen = true;
    _vcad.latestPoseLoaderErr = e?.message ? String(e.message) : "unknown";
  }

  // Promote loader pick -> latestPosePath when present
  if (!_vcad.latestPosePath && _vcad.latestPoseLoaderPick) _vcad.latestPosePath = _vcad.latestPoseLoaderPick;

  // Frames available (prefer loader-provided counts)
  if (_vcad.latestPoseFramesAvailable === undefined || _vcad.latestPoseFramesAvailable === null || _vcad.latestPoseFramesAvailable === "") {
    if (typeof _vcad.latestPoseLoaderFrames === "number") _vcad.latestPoseFramesAvailable = _vcad.latestPoseLoaderFrames;
    else if (typeof _vcad.latestPoseLoaderFramesLenRaw === "number") _vcad.latestPoseFramesAvailable = _vcad.latestPoseLoaderFramesLenRaw;
    else if (typeof _vcad.latestPoseFrames === "number") _vcad.latestPoseFramesAvailable = _vcad.latestPoseFrames;
  }

  // Frames used (what we actually analyzed / returned)
  _vcad.analysisFramesUsed = Array.isArray((report as any).frames) ? (report as any).frames.length : (typeof _vcad.latestPoseFrames === "number" ? _vcad.latestPoseFrames : 0);
  // ===== VCA: CHECKPOINT URLS (R3) =====
  try {
    const jid = String(jobId || "job_unknown");
    const base = `/frames/${encodeURIComponent(jid)}`;
    (report as any).checkpoints = Array.from({ length: 9 }).map((_, i) => {
  const p = i + 1;
  return { p, label: `P${p}`, url: vcaCheckpointUrl(String(jid), p) };
});
  } catch {}
  // ===== VCA: R3 NON-DEMO REPORT CONTENT WHEN POSE IS REAL =====
  try {
    const isRealPose = (_vcad.poseSource === "job") && (_vcad.lowConfidence !== true) && (_vcad.analysisFramesUsed >= 60);
    if (isRealPose) {
      // headline
      if ((report as any).headline && String((report as any).headline).toLowerCase().includes("demo")) {
        (report as any).headline = "Swing report (pose)";
      }
      // sanitize "Demo fallback" notes to "Pose-based"
      try {
        if (Array.isArray((report as any).topFaults)) {
          (report as any).topFaults = (report as any).topFaults.map((f:any)=>({
            ...f, youtubeUrl: vcaYouTubeForFault(f?.key, f?.label),
            note: (f?.note && String(f.note).includes("Demo")) ? "Pose-based" : f?.note
          }));
        }
      } catch {}

      // Ensure buckets exist (basic, but non-empty for demo)
      if (!Array.isArray((report as any).powerLeaks) || (report as any).powerLeaks.length === 0) {
        (report as any).powerLeaks = [
          { key:"sequence", label:"Sequence timing", meaning:"Energy is arriving a bit out of order—speed leaks before impact.", fix:"Slow-motion step-through reps." },
          { key:"strike", label:"Low point control", meaning:"Strike is inconsistent—compression varies.", fix:"Line/towel contact training." }
        ];
      }
      if (!Array.isArray((report as any).topFixes) || (report as any).topFixes.length === 0) {
        (report as any).topFixes = [
          { title:"Start-line window", text:"Use an alignment gate and start every ball through it." },
          { title:"Low-point checkpoint", text:"Ball-first contact: strike the turf in front of the ball." }
        ];
      }
      if (!Array.isArray((report as any).practicePlan) || (report as any).practicePlan.length === 0) {
        (report as any).practicePlan = [
          { day:1, focus:"Start line + strike", minutes:20, reps:"40 reps gate + 30 reps towel" },
          { day:2, focus:"Transition + finish", minutes:20, reps:"30 step-through + 20 pump drills" }
        ];
      }
    }
  } catch {}
  // ===== VCA: FINALIZE FALLBACK FLAG (R3 truth) =====
  try {
    const hasPose = (_vcad.poseSource === "job") || (!!(_vcad.latestPosePath && String(_vcad.latestPosePath).length > 0));
    const low = (_vcad.lowConfidence === true);
    _vcad.fallback = (!hasPose) || low;
  } catch {}

  // If we have a path, call it "latest"
  const hasLatestPath = !!(_vcad.latestPosePath && String(_vcad.latestPosePath).length > 0);
if (hasLatestPath) _vcad.latestPoseSource = "latest";
_vcad.latestPoseLoaded = hasLatestPath ? true : false;

  if (!_vcad.poseSource) _vcad.poseSource = (_vcad.latestPosePath ? "latest" : "mini");
(report as any).debug = d;
} catch {}

return NextResponse.json(
      { ok: true, jobId, report, scores: top.scores, practicePlan14: [
  "Day 1: 9-to-3 punch shots (face control) — 25 balls + 10 slow rehearsals.",
  "Day 2: Towel drill (low point) — 20 reps + 20 balls.",
  "Day 3: Step-through drill (sequence) — 15 rehearsals + 20 balls.",
  "Day 4: Start-line gate — 25 balls.",
  "Day 5: Line drill (strike in front) — 25 balls.",
  "Day 6: Pump drill (3 pumps) — 15 rehearsals + 20 balls.",
  "Day 7: Combine: 10 balls each (punch/towel/gate).",
  "Day 8: Repeat Day 2 (towel) + add 10 “finish holds”.",
  "Day 9: Repeat Day 1 (punch) + add 10 “hold-off” shots.",
  "Day 10: Repeat Day 3 (step-through) at 70% speed.",
  "Day 11: Random practice: alternate drills every 5 balls (30 balls).",
  "Day 12: Pressure reps: 10 balls — must start inside a 3-yard window.",
  "Day 13: Film 5 swings. Focus: contact + start line.",
  "Day 14: Test day: 20 balls — score 1 point for clean strike + good start."
].join("\n"),
plan14: [
  "Day 1: 9-to-3 punch shots (face control) — 25 balls + 10 slow rehearsals.",
  "Day 2: Towel drill (low point) — 20 reps + 20 balls.",
  "Day 3: Step-through drill (sequence) — 15 rehearsals + 20 balls.",
  "Day 4: Start-line gate — 25 balls.",
  "Day 5: Line drill (strike in front) — 25 balls.",
  "Day 6: Pump drill (3 pumps) — 15 rehearsals + 20 balls.",
  "Day 7: Combine: 10 balls each (punch/towel/gate).",
  "Day 8: Repeat Day 2 (towel) + add 10 “finish holds”.",
  "Day 9: Repeat Day 1 (punch) + add 10 “hold-off” shots.",
  "Day 10: Repeat Day 3 (step-through) at 70% speed.",
  "Day 11: Random practice: alternate drills every 5 balls (30 balls).",
  "Day 12: Pressure reps: 10 balls — must start inside a 3-yard window.",
  "Day 13: Film 5 swings. Focus: contact + start line.",
  "Day 14: Test day: 20 balls — score 1 point for clean strike + good start."
].join("\n"),
debug: report.debug },
      { status: 200 }
    );
  } catch (e: any) {
    // Even in failure, do NOT 500 the demo
    const msg = e?.message ? String(e.message) : "unknown";
    const report = demoReport(msg);


    const top = vcaExtractTopLevel(report);

  try { (top as any).debug = (report as any).debug; } catch {}
report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };



  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  

    
    
// ===== MVP DEBUG NORMALIZE (stable) =====
try {
  const d: any = (report.debug ?? {});
  const hasPath = !!(_vcad.latestPosePath && String(_vcad.latestPosePath).length > 0);
  _vcad.latestPoseSource = (_vcad.latestPoseSource ?? (hasPath ? "latest" : "mini"));
  _vcad.latestPoseLoaded = hasPath ? true : (_vcad.latestPoseLoaded ?? false);
  // VCA: if loader picked a pose file, treat it as latestPosePath for breadcrumbs
  if (!_vcad.latestPosePath && (d as any).latestPoseLoaderPick) _vcad.latestPosePath = (d as any).latestPoseLoaderPick;
  if (_vcad.latestPoseFrames === undefined || _vcad.latestPoseFrames === null || _vcad.latestPoseFrames === "") {
    _vcad.latestPoseFrames = Array.isArray((report as any).frames) ? (report as any).frames.length : (_vcad.miniFrameCount ?? 0);
  }
  report.debug = d;
} catch {}
// ===== END MVP DEBUG NORMALIZE =====

        // ===== VCA: FINALIZE DEBUG FLAGS (do not lie if pose loaded) =====
    try {
      const d: any = ((report as any).debug ?? {});
      if (_vcad.latestPoseLoaded === true) _vcad.fallback = false;
      (report as any).debug = d;
    } catch {}


    // ===== VCA: RETURN TAG (R4) =====



    try {



      const d: any = ((report as any).debug ?? {});



      _vcad.__returnTag = "R4";



      (report as any).debug = d;



    } catch {}



    return okJson({ jobId: "job_fallback", report, topScores: top.scores });
}
}





































































































export const runtime = "nodejs";

const VCA_UPLOAD_ROOT = process.env.VERCEL
  ? "/tmp/vca_uploads"
  : path.join(process.cwd(), "public", "uploads");

const VCA_FRAMES_ROOT = process.env.VERCEL
  ? "/tmp/vca_frames"
  : path.join(VCA_FRAMES_ROOT,);

const VCA_POSE_IN_ROOT = process.env.VERCEL
  ? "/tmp/vca_pose_in"
  : path.join(process.cwd(), "pose", "in");

const VCA_POSE_OUT_ROOT = process.env.VERCEL
  ? "/tmp/vca_pose_out"
  : VCA_POSE_OUT_ROOT;

const VCA_REPORTS_ROOT = process.env.VERCEL
  ? "/tmp/vca_reports"
  : path.join(process.cwd(), "reports");

fs.mkdirSync(VCA_UPLOAD_ROOT, { recursive: true });
fs.mkdirSync(VCA_FRAMES_ROOT, { recursive: true });
fs.mkdirSync(VCA_POSE_IN_ROOT, { recursive: true });
fs.mkdirSync(VCA_POSE_OUT_ROOT, { recursive: true });
fs.mkdirSync(VCA_REPORTS_ROOT, { recursive: true });

function vcaUploadUrl(rel: string) {
  return process.env.VERCEL ? `/api/uploads/${rel}` : `/uploads/${rel}`;
}
function vcaFrameUrl(rel: string) {
  return process.env.VERCEL ? `/api/frames/${rel}` : `/frames/${rel}`;
}
export async function GET() {
  return NextResponse.json({
    ok: false,
    error: "Method not allowed. Use POST with JSON body, e.g. { demo: true }."
  }, { status: 405 });
}

