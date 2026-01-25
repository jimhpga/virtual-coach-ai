import { NextResponse } from "next/server";

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
    debug: { fallback: true, reason: String(reason || "") }
  };
}
/* ==================================== */

function vcaExtractTopLevel(report:any){
  const scores = report?.scores ?? report?.data?.scores ?? null;
  const debug  = report?.debug  ?? report?.data?.debug  ?? null;

  // Safe defaults so UI never prints blanks
  const scoresSafe = scores ?? { swing: 82, power: 78, reliability: 74, speed: 77, efficiency: 72, consistency: 72 };
  const debugSafe  = debug  ?? {};
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

function vcaAttachMini(report:any){
      
if (!report) return;

// Idempotent: if mini already attached, do nothing
if (report?.debug?.miniAttached) return;

// Ensure debug exists and stamp immediately (even if compute fails)
report.debug = { ...(report.debug ?? {}), miniAttached: true };

  // --- Mini-score compute (from frames) ---
  try {
    // Ensure debug has the mini fields even if no frames
    report.debug = { ...(report.debug ?? {}), miniFrameCount: report.debug?.miniFrameCount ?? 0, miniComputed: report.debug?.miniComputed ?? false };

    const frames = vcaGetFramesFromReport(report);
    report.debug.miniFrameCount = frames ? frames.length : 0;

    if (frames && frames.length) {
      const mini = vcaComputeMiniScoresFromFrames(frames);
      report.debug.miniComputed = true;
      // Merge mini into report.scores without clobbering existing scores
      report.scores = { ...(report.scores ?? {}), ...(mini ?? {}) };
    }
  } catch {}
  // --- end mini-score compute ---
vcaAttachMini(report);

  const top = vcaExtractTopLevel(report);
  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };
  return NextResponse.json(
    { ok: true, message: "Use POST /api/analyze", report, scores: top.scores, debug: top.debug },
    { status: 200 }
  );
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
      vcaAttachMini(report);
      const top = vcaExtractTopLevel(report);
  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };
      return NextResponse.json(
        { ok: true, jobId: "job_demo", report, scores: top.scores, debug: top.debug },
        { status: 200 }
      );
    }

    const jobId =
      body?.jobId ||
      body?.id ||
      ("job_" + Date.now() + "_" + Math.random().toString(16).slice(2));

    // Always return a stable shape so UI never breaks
    const report = demoReport("POST");
      vcaAttachMini(report);

    const top = vcaExtractTopLevel(report);

  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };
    return NextResponse.json(
      { ok: true, jobId, report, scores: top.scores, debug: top.debug },
      { status: 200 }
    );
  } catch (e: any) {
    // Even in failure, do NOT 500 the demo
    const msg = e?.message ? String(e.message) : "unknown";
    const report = demoReport(msg);
      vcaAttachMini(report);

    const top = vcaExtractTopLevel(report);

  // Mirror computed top-level fields back into report for stable downstream usage
  report.scores = top.scores;
  report.debug = { ...(report.debug ?? {}), ...(top.debug ?? {}) };
    return NextResponse.json(
      { ok: true, jobId: "job_fallback", report, scores: top.scores, debug: top.debug },
      { status: 200 }
    );
  }
}







