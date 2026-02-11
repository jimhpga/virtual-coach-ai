import path from "path";

import * as fs from "fs";




/* VCA_NORMALIZE_OUT_START */
function vcaNormalizeOut(out: any){
  try{
    if(!out || typeof out !== "object") return out;

    // ---- Always ensure poseSnap exists ----
    if(out.poseSnap == null){
      out.poseSnap = { phaseFramesRequested: {}, phaseFramesSnapped: {} };
    } else {
      if(out.poseSnap.phaseFramesRequested == null) out.poseSnap.phaseFramesRequested = {};
      if(out.poseSnap.phaseFramesSnapped   == null) out.poseSnap.phaseFramesSnapped   = {};
    }

    // ---- Alias/compat: practice_plan ----
    if(out.practice_plan == null){
      if(out.practicePlan != null) out.practice_plan = out.practicePlan;
      else if(out.plan != null)    out.practice_plan = out.plan;
      else out.practice_plan = null;
    }

    // ---- Alias/compat: p_checkpoints ----
    if(out.p_checkpoints == null){
      if(out.pCheckpoints != null) out.p_checkpoints = out.pCheckpoints;
      else if(out.pChecks != null) out.p_checkpoints = out.pChecks;
      else if(out.pchecks != null) out.p_checkpoints = out.pchecks;
      else out.p_checkpoints = [];
    }

    // ---- Alias/compat: ranked_faults + swing_score ----
    if(out.ranked_faults == null){
      if(out.rankedFaults != null) out.ranked_faults = out.rankedFaults;
      else if(out.faults != null)  out.ranked_faults = out.faults;
      else if(out.ranked != null)  out.ranked_faults = out.ranked;
      else out.ranked_faults = [];
    }

    if(out.swing_score == null){
      if(out.swingScore != null) out.swing_score = out.swingScore;
      else if(out.score != null) out.swing_score = out.score;
      else out.swing_score = 0;
    }

    // ---- Contract: metrics must exist with required keys ----
    if(out.metrics == null || typeof out.metrics !== "object"){
      out.metrics = {};
    }

    const req = [
      "tempo_ratio",
      "backswing_time_ms",
      "downswing_time_ms",
      "pelvis_rotation_p7",
      "torso_rotation_p7",
      "x_factor_proxy",
      "spine_tilt_p7",
      "side_bend_p7",
      "lead_arm_angle_p6",
      "handle_height_p7",
      "hip_drift_total",
      "center_mass_shift"
    ];

    for(const k of req){
      // Prefer metrics.k, else top-level k, else 0
      if(out.metrics[k] == null){
        if(out[k] != null) out.metrics[k] = out[k];
        else out.metrics[k] = 0;
      }
    }

    // Also mirror to top-level (optional but helps older consumers)
    for(const k of req){
      if(out[k] == null && out.metrics[k] != null){
        out[k] = out.metrics[k];
      }
    }

  } catch(e) {}
  return out;
}
/* VCA_NORMALIZE_OUT_END */

/* VCA_CONTRACT_BASE_START */
function vcaBaseOut(){
  return {
    ok: true,
    message: "",
    ts: Date.now(),

    swing_score: 0,
    ranked_faults: [],

    practice_plan: null,
    p_checkpoints: [],

    poseSnap: { phaseFramesRequested: {}, phaseFramesSnapped: {} },

    metrics: {
      tempo_ratio: 0,
      backswing_time_ms: 0,
      downswing_time_ms: 0,
      pelvis_rotation_p7: 0,
      torso_rotation_p7: 0,
      x_factor_proxy: 0,
      spine_tilt_p7: 0,
      side_bend_p7: 0,
      lead_arm_angle_p6: 0,
      handle_height_p7: 0,
      hip_drift_total: 0,
      center_mass_shift: 0
    }
  };
}

function vcaMergeBase(out: any){
  // shallow merge + nested metrics/poseSnap merge, so callers can override selectively
  const base = vcaBaseOut();
  const merged = { ...base, ...(out || {}) };

  const mBase = (base as any).metrics || {};
  const mOut  = (out  as any)?.metrics || {};
  (merged as any).metrics = { ...mBase, ...mOut };

  const psBase = (base as any).poseSnap || {};
  const psOut  = (out  as any)?.poseSnap || {};
  (merged as any).poseSnap = { ...psBase, ...psOut };

  return merged;
}
/* ===== VCA_CANONICALIZE_OUT (AUTO) ===== */
function vcaCanonicalizeOut(o: any) {
  if (!o || typeof o !== "object") return o;

  const pairs: Array<[string, string]> = [
    ["rankedFaults", "ranked_faults"],
    ["swingScore", "swing_score"],
    ["practicePlan", "practice_plan"],
    ["pCheckpoints", "p_checkpoints"],
    ["pChecks", "p_checkpoints"],
    ["pchecks", "p_checkpoints"],
  ];

  // copy alias -> canonical (only if canonical missing)
  for (const [from, to] of pairs) {
    if ((o as any)[to] == null && (o as any)[from] != null) {
      (o as any)[to] = (o as any)[from];
    }
  }

  // delete alias keys so we emit ONE contract
  for (const [from, to] of pairs) {
    if (from !== to && (o as any)[from] != null) delete (o as any)[from];
  }

  // ===== VCA_CANON_PCHECKS_ENSURE (AUTO) =====
  // Guarantee p_checkpoints is non-empty without relying on external helpers.
  try {
    const pc = (o as any).p_checkpoints;
    if (!Array.isArray(pc) || pc.length === 0) {
      (o as any).p_checkpoints = [
        { p: 1,  label: "P1",  desc: "Setup (address)" },
        { p: 2,  label: "P2",  desc: "Shaft parallel backswing" },
        { p: 3,  label: "P3",  desc: "Lead arm parallel backswing" },
        { p: 4,  label: "P4",  desc: "Top of swing" },
        { p: 5,  label: "P5",  desc: "Lead arm parallel downswing" },
        { p: 6,  label: "P6",  desc: "Shaft parallel downswing" },
        { p: 7,  label: "P7",  desc: "Impact" },
        { p: 8,  label: "P8",  desc: "Shaft parallel follow-through" },
        { p: 9,  label: "P9",  desc: "Trail arm parallel follow-through" },
        { p: 10, label: "P10", desc: "Finish" },
      ];
      (o as any).poseSnap = (o as any).poseSnap ?? {};
      (o as any).poseSnap.p_checkpoints_fallback = true;
    }
  } catch {}
  // ===== /VCA_CANON_PCHECKS_ENSURE (AUTO) =====
  return o;
}
/* ===== /VCA_CANONICALIZE_OUT (AUTO) ===== */
function vcaRespond(out: any, status: number){
  payload = vcaCanonicalizeOut(payload); // VCA_CANONICALIZE_OUT
  try { (payload as any).vca_watermark = "RESPOND_WM_20260210_184334"; } catch {} // VCA_RESPOND_WATERMARK
  const finalOut = vcaNormalizeOut(vcaMergeBase(out));
  return new Response(JSON.stringify(finalOut), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-VCA-Respond": "1_20260210_195218", // VCA_RESPOND_HEADER
    },
  });



}
/* VCA_CONTRACT_BASE_END */
function readJsonIfExists(p: string): any | null {
  try {
    if (!fs.existsSync(p)) return null;
    const txt = fs.readFileSync(p, "utf8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export const runtime = "nodejs";



function enrichLowConfidenceBlock<T extends any>(key: string, block: T | null | undefined) {
  if (!block || typeof block !== "object") return block;
  const b: any = block;

  const confMin = (typeof b.confidenceMin === "number") ? b.confidenceMin : null;
  const status  = (typeof b.status === "string") ? b.status : "not_available";

  const usesProxy =
    (b.P5?.shaftSource === "pose_proxy") ||
    (b.P6?.shaftSource === "pose_proxy") ||
    (b.P7?.shaftSource === "pose_proxy");

  const confidenceLabel =
    (confMin === null) ? "Unknown" :
    (confMin >= 60) ? "High" :
    (confMin >= 35) ? "Medium" : "Low";

  // default user-facing message
  let message = "";
  if (status === "ok") {
    message = "Measured shaft-vs-lead-arm alignment at P5/P6/P7.";
  } else if (status === "low_confidence") {
    message = usesProxy
      ? "Confidence was low. Using a proxy shaft estimate for stability."
      : "Confidence was low. Measurements may be less reliable.";
  } else {
    message = "Not enough tracking confidence to score this reliably.";
  }

  const nextSteps: string[] =
    (status === "low_confidence") ? [
      "Film face-on with the full club visible (grip to clubhead).",
      "Use 120–240 fps if possible, good lighting, and a steady camera.",
      "Avoid dark shafts/clothes against dark backgrounds."
    ] :
    (status === "not_available") ? [
      "Re-record with the full club visible and steady framing.",
      "Improve lighting and remove motion blur."
    ] : [];

  b.usesProxy = usesProxy;
  b.confidenceLabel = confidenceLabel;
  b.message = b.message ?? message;
  b.nextSteps = Array.isArray(b.nextSteps) ? b.nextSteps : nextSteps;

  // Keep meta for debug, but ensure it's always present/typed
  b.meta = (b.meta && typeof b.meta === "object") ? b.meta : {};

  return b as T;
}
/* ===== VCA_PCHECKPOINTS_DESC_PATCH (AUTO) ===== */
function vcaPDesc(p: number): string {
  switch (p) {
    case 1: return "Setup (address)";
    case 2: return "Shaft parallel backswing";
    case 3: return "Lead arm parallel backswing";
    case 4: return "Top of swing";
    case 5: return "Lead arm parallel downswing";
    case 6: return "Shaft parallel downswing";
    case 7: return "Impact";
    case 8: return "Shaft parallel follow-through";
    case 9: return "Trail arm parallel follow-through";
    case 10: return "Finish";
    default: return "";
  }
}

function vcaAttachCheckpointDesc(arr: any): any {
  if (!Array.isArray(arr)) return arr;
  return arr.map((x: any) => {
    const p = typeof x?.p === "number" ? x.p : (typeof x?.idx === "number" ? x.idx : undefined);
    const label = x?.label ?? (typeof p === "number" ? `P${p}` : undefined);
    const desc = (typeof p === "number") ? vcaPDesc(p) : "";
    return { ...x, p, label, desc };
  });
}
/* ===== /VCA_PCHECKPOINTS_DESC_PATCH (AUTO) ===== */
/* ===== VCA_ENSURE_PCHECKPOINTS (AUTO) ===== */
function vcaEnsurePCheckpoints(o: any): any {
  try {
    if (!o || typeof o !== "object") return o;

    const fallback = [
      { p: 1,  label: "P1",  desc: vcaPDesc(1)  },
      { p: 2,  label: "P2",  desc: vcaPDesc(2)  },
      { p: 3,  label: "P3",  desc: vcaPDesc(3)  },
      { p: 4,  label: "P4",  desc: vcaPDesc(4)  },
      { p: 5,  label: "P5",  desc: vcaPDesc(5)  },
      { p: 6,  label: "P6",  desc: vcaPDesc(6)  },
      { p: 7,  label: "P7",  desc: vcaPDesc(7)  },
      { p: 8,  label: "P8",  desc: vcaPDesc(8)  },
      { p: 9,  label: "P9",  desc: vcaPDesc(9)  },
      { p: 10, label: "P10", desc: vcaPDesc(10) },
    ];

    const pc = (o as any).p_checkpoints;

    if (!Array.isArray(pc) || pc.length === 0) {
      (o as any).p_checkpoints = fallback;
      (o as any).poseSnap = (o as any).poseSnap ?? {};
      (o as any).poseSnap.p_checkpoints_fallback = true;
    
  return o;
    }

    (o as any).p_checkpoints = vcaAttachCheckpointDesc(pc);
  
  return o;
  } catch {
  
  return o;
  }
}
/* ===== /VCA_ENSURE_PCHECKPOINTS (AUTO) ===== */

function vcaDemoFastPayload(){
  return {
    p5p6p7ShaftArm: enrichLowConfidenceBlock("p5p6p7ShaftArm", readJsonIfExists(path.join("E:\\VCA\\Cache\\repo-moved\\_shots\\vid_20260122_181118\\_mirror"),"P5_P6_P7_ShaftArm.json")),p3p5Mirror: readJsonIfExists(path.join("E:\\VCA\\Cache\\repo-moved\\_shots\\vid_20260122_181118\\_mirror","P3_P5_Mirror.json")),
    ok: true,
    headline: "Demo report (safe)",
    swingScore: 82,
    rankedFaults: [
      { key:"clubface_control", score:60, label:"Clubface control (impact)", meaning:"Face-to-path is drifting — start line control suffers.", confidence: 86, confidenceLabel: "High", drills:["9-to-3 punch shots (hold face square).","Start-line gate with alignment sticks."] },
      { key:"low_point_control", score:55, label:"Low point control (strike)", meaning:"Bottom of arc varies — contact and compression vary.", confidence: 68, confidenceLabel: "Medium", drills:["Towel 4–6\" behind ball.","Line drill: strike in front of ball."] }
    ],
    poseSnap: {
      poseConfidence: 100,
      poseConfidenceLabel: "High",
      phaseFramesRequested: { P1:7,P2:22,P3:37,P4:52,P5:67,P6:77,P7:87,P8:102,P9:122 , P10: 140},
      phaseFramesSnapped:   { P1:24,P2:24,P3:40,P4:51,P5:67,P6:76,P7:76,P8:101,P9:118 , P10: 136},
      issues: []
    }
  };
}

export async function POST(req: Request) {
  let body: any = null;
  try { body = await req.json(); } catch { body = null; }

  const isDemo =
    body?.demo === true ||
    body?.demo === "true" ||
    body?.demo === 1 ||
    body?.demo === "1";

  const pFallback = [
    { p: 1,  label: "P1",  desc: "Setup (address)" },
    { p: 2,  label: "P2",  desc: "Shaft parallel backswing" },
    { p: 3,  label: "P3",  desc: "Lead arm parallel backswing" },
    { p: 4,  label: "P4",  desc: "Top of swing" },
    { p: 5,  label: "P5",  desc: "Lead arm parallel downswing" },
    { p: 6,  label: "P6",  desc: "Shaft parallel downswing" },
    { p: 7,  label: "P7",  desc: "Impact" },
    { p: 8,  label: "P8",  desc: "Shaft parallel follow-through" },
    { p: 9,  label: "P9",  desc: "Trail arm parallel follow-through" },
    { p: 10, label: "P10", desc: "Finish" }
  ];

  try {
    if (isDemo) {
      const out: any = (typeof vcaDemoFastPayload === "function") ? vcaDemoFastPayload() : { ok: true, headline: "Demo", message: "demo" };
      if (!Array.isArray(out.p_checkpoints) || out.p_checkpoints.length === 0) out.p_checkpoints = pFallback;
      out.poseSnap = out.poseSnap ?? {};
      out.poseSnap.p_checkpoints_fallback = true;
      out.vca_watermark = out.vca_watermark ?? ("DEMO_HARDRESET_" + Date.now());
      return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json", "X-VCA-Demo": "1" } });
    }

    // Non-demo minimal alive
    const out: any = { ok: true, message: "analyze-swing minimal route alive", p_checkpoints: pFallback, poseSnap: { p_checkpoints_fallback: true }, vca_watermark: ("LIVE_HARDRESET_" + Date.now()) };
    return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json", "X-VCA-Alive": "1" } });
  } catch (e: any) {
    const msg = (e && (e.stack || e.message)) ? String(e.stack || e.message) : String(e);
    return new Response(JSON.stringify({ ok: false, where: "api/analyze-swing POST", error: msg }), { status: 500, headers: { "Content-Type": "application/json", "X-VCA-ERR": "1" } });
  }
}

