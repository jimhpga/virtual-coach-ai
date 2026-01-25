import { NextResponse } from "next/server";
function vcaExtractTopLevel(report:any){
  const scores = report?.scores ?? report?.data?.scores ?? null;
  const debug  = report?.debug  ?? report?.data?.debug  ?? null;

  // Safe defaults so UI never prints blanks
  const scoresSafe = scores ?? {
    swing: 82, power: 78, reliability: 74, speed: 77, efficiency: 72, consistency: 72
  };

  // Demo-safe defaults for proxies (so the UI always has numbers)
  // NOTE: These are placeholders until /api/analyze is wired to real frames.
  const debugSafe = {
    ...(debug ?? {}),
    speedProxy: (debug?.speedProxy ?? 0.620),
    handsProxy: (debug?.handsProxy ?? 0.0100),
    efficiencyProxy: (debug?.efficiencyProxy ?? 0.680),
    jitterProxy: (debug?.jitterProxy ?? 0.0056)
  };

  return { scores: scoresSafe, debug: debugSafe };
}

// VCA: lift scores/debug to top level for UI

// VCA: attach scores/debug to /api/analyze response (fallback compute)
function vcaGetFramesFromReport(r:any): any[] | null {
  const frames = (r?.frames ?? r?.pose ?? r?.data?.frames ?? r?.report?.frames) as any[] | undefined;
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


// VCA: Efficiency scoring (ported from analyze-swing)
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
  return {
    headline: "Demo report (safe)",
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

    // Keep demo report shape stable, and include proxies so UI never shows blanks
    scores: { swing: 82, power: 78, reliability: 74, speed: 77, efficiency: 72, consistency: 72 },
    debug: {
      fallback: true,
      reason: String(reason || ""),
      speedProxy: 0.620,
      handsProxy: 0.0100,
      efficiencyProxy: 0.680,
      jitterProxy: 0.0056
    }
  };
}

export async function GET() {
  const report = demoReport("GET");
  try {
    const frames = vcaGetFramesFromReport(report);
    if (frames) {
      const mini = vcaComputeMiniScoresFromFrames(frames);
      report.scores = { ...(report.scores || {}), ...(mini.scores || {}) };
      report.debug  = { ...(report.debug  || {}), ...(mini.debug  || {}) };
    }
  } catch {}
  try{
    const frames = vcaGetFramesFromReport(report);
    if(frames){
      const mini = vcaComputeMiniScoresFromFrames(frames);
      report.scores = { ...(report.scores||{}), ...(mini.scores||{}) };
      report.debug  = { ...(report.debug||{}),  ...(mini.debug||{})  };
    }
  } catch {}
  const top = vcaExtractTopLevel(report);
  return NextResponse.json(
    { ok: true, message: "Use POST /api/analyze", report, scores: top.scores, debug: top.debug },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}

    const jobId =
      body?.jobId ||
      body?.id ||
      ("job_" + Date.now() + "_" + Math.random().toString(16).slice(2));

    // Always return a stable shape so UI never breaks
    const report = demoReport("POST");
    try {
      const frames = vcaGetFramesFromReport(report);
      if (frames) {
        const mini = vcaComputeMiniScoresFromFrames(frames);
        report.scores = { ...(report.scores || {}), ...(mini.scores || {}) };
        report.debug  = { ...(report.debug  || {}), ...(mini.debug  || {}) };
      }
    } catch {}
    try{
      const frames = vcaGetFramesFromReport(report);
      if(frames){
        const mini = vcaComputeMiniScoresFromFrames(frames);
        report.scores = { ...(report.scores||{}), ...(mini.scores||{}) };
        report.debug  = { ...(report.debug||{}),  ...(mini.debug||{})  };
      }
    } catch {}
    const top = vcaExtractTopLevel(report);

    return NextResponse.json(
      { ok: true, jobId, report, scores: top.scores, debug: top.debug },
      { status: 200 }
    );
  } catch (e: any) {
    // Even in failure, do NOT 500 the demo
    const msg = e?.message ? String(e.message) : "unknown";
    const report = demoReport(msg);
    try {
      const frames = vcaGetFramesFromReport(report);
      if (frames) {
        const mini = vcaComputeMiniScoresFromFrames(frames);
        report.scores = { ...(report.scores || {}), ...(mini.scores || {}) };
        report.debug  = { ...(report.debug  || {}), ...(mini.debug  || {}) };
      }
    } catch {}
    try{
      const frames = vcaGetFramesFromReport(report);
      if(frames){
        const mini = vcaComputeMiniScoresFromFrames(frames);
        report.scores = { ...(report.scores||{}), ...(mini.scores||{}) };
        report.debug  = { ...(report.debug||{}),  ...(mini.debug||{})  };
      }
    } catch {}
    const top = vcaExtractTopLevel(report);

    return NextResponse.json(
      { ok: true, jobId: "job_fallback", report, scores: top.scores, debug: top.debug },
      { status: 200 }
    );
  }
}




