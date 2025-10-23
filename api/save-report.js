export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";

/** ---------- LOCAL FALLBACK (no OPENAI_API_KEY) ---------- */
function localEnhance(base) {
  const level = base.level || base?.meta?.level || "intermediate";
  const goal  = base.goal  || base?.meta?.goal  || "power";
  const score = Number(base.swingScore ?? 76);
  const handed = base?.meta?.handed ?? "right";
  const height = base?.meta?.height ?? 70;

  const p1p9 = [
    { id:"P1", name:"Address", grade: score>70?"good":"ok",
      short:"Balanced, athletic setup with neutral grip and calm upper body.",
      long:"Stand tall through the chest, soft knees, and neutral pelvis. Balance pressure ~55/45 (trail/lead). Ball position appropriate for the club and handle slightly forward.",
      video:"https://www.youtube.com/results?search_query=address+golf+checkpoint" },
    { id:"P2", name:"Takeaway", grade:"ok",
      short:"One-piece start; clubhead stays outside the hands; face square early.",
      long:"Turn the ribcage to move the club; avoid early forearm roll. Keep width in the triangle as the trail hip accepts pressure. Tempo smooth around 3:1.",
      video:"https://www.youtube.com/results?search_query=takeaway+golf+checkpoint" },
    { id:"P3", name:"Lead arm parallel", grade:"ok",
      short:"Width preserved; lead wrist flatter; shaft near plane.",
      long:"Lead arm moves across chest without collapse; trail wrist extends to set angle. Pressure trends into trail heel (not toes) to store energy without sway.",
      video:"https://www.youtube.com/results?search_query=P3+lead+arm+parallel+golf" },
    { id:"P4", name:"Top", grade: score>82?"good":"ok",
      short:"Full coil with minimal sway; wrists set; structure intact.",
      long:"Lead shoulder under chin; pelvis ~35–45° and thorax ~80–100° turned. Keep the club from getting too long unless speed training.",
      video:"https://www.youtube.com/results?search_query=P4+top+of+backswing+golf" },
    { id:"P5", name:"Delivery", grade:"ok",
      short:"Lower body leads; shaft shallows; handle forward.",
      long:"From transition, shift and rotate into the lead side. Trail elbow works in front of the hip pocket as handle leads—keeps lag and path organized.",
      video:"https://www.youtube.com/results?search_query=P5+delivery+position+golf" },
    { id:"P6", name:"Shaft parallel down", grade: score>78?"good":"ok",
      short:"Lag retained; shaft parallel to target line; face stable.",
      long:"Hands near trail thigh with slight forward shaft lean. Trail heel releases naturally; chest keeps opening. Keep club outside hands longer to avoid early throw.",
      video:"https://www.youtube.com/results?search_query=P6+shaft+parallel+downswing+golf" },
    { id:"P7", name:"Impact", grade: score>85?"good":"ok",
      short:"Forward shaft lean; lead side braced; square-to-path delivery.",
      long:"Low point ahead of ball with stable head and balanced pressure into lead foot. Lead wrist flexed, trail wrist extended—compress ball before turf.",
      video:"https://www.youtube.com/results?search_query=P7+impact+golf" },
    { id:"P8", name:"Post-impact", grade:"ok",
      short:"Arms long; rotation continues left; no stall.",
      long:"Both arms extend after strike as chest keeps turning. Trail wrist gradually unhinges; handle continues moving—prevents flip and tightens start-line.",
      video:"https://www.youtube.com/results?search_query=P8+post+impact+golf" },
    { id:"P9", name:"Finish", grade:"good",
      short:"Balanced, fully rotated; weight mostly left; tall hold.",
      long:"~90% lead-side pressure with buckle at the target and trail foot released. Hold your pose to train balance and rhythm.",
      video:"https://www.youtube.com/results?search_query=P9+finish+golf" },
  ];

  const topPriorityFixes = [
    {
      title: "Face-to-path harmony",
      why:   "Random face angles inflate curvature and dispersion even when contact is solid.",
      how:   "Neutralize grip, add lead-wrist flex by P6, and use start-line gates (6–10 feet) to calibrate."
    },
    {
      title: "Earlier shallow at transition",
      why:   "Steep deliveries force compensation (flip/stall), costing compression and consistency.",
      how:   "From P4, feel trail elbow down/in and handle left while chest rotates—‘close the door’ then swing through it."
    },
    {
      title: "Repeatable setup windows",
      why:   "Variable stance width and ball position move low point and face presentation.",
      how:   "Mark feet/ball on a mat; rehearse same windows (iron/driver) for 10 reps before every session."
    }
  ];

  const topPowerFixes = [
    {
      title: "Lead-leg post & brake",
      why:   "Stronger braking spikes pelvis speed and transfers energy up the chain.",
      how:   "‘Stick the post’ drill: into impact, feel lead hip up/back while pressing the ground—hold for two beats."
    },
    {
      title: "Dynamic pressure shift",
      why:   "Under-shifting limits torque and vertical power.",
      how:   "Step-change drill alternating slow/normal; record 3 swings to verify rhythm (≈3:1)."
    },
    {
      title: "Speed windows",
      why:   "Training at varied intents teaches faster patterns without chaos.",
      how:   "Light/medium/full sets (5-5-5) twice weekly; hold finish and confirm centered strike."
    }
  ];

  const summary_long =
    `Level: ${level}. Goal: ${goal}. Height: ${height} in. Handed: ${handed}.
You present a stable base at P1 and maintain structure into P4 with a clean coil. Transition shallows slightly late, costing compression and spin loft control. Through P6-P7 you’re near tour-caliber; more lead-leg posting and chest rotation will increase power and tighten path. Off-days show face/path drift—lead wrist flex and start-line gates fix that. Power comes from better braking, not more effort; tempo ≈3:1. Practice plan balances structure (P1–P3), delivery (P5–P7), and two days of speed.`

  const positionConsistency = { notes: "Setup/transition repeat well; small variation in face angle at P6." };
  const swingConsistency    = { notes: "Tempo consistent (~3:1) except during max-speed swings; add slow reps to stabilize timing." };

  const practicePlan = Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    title: i % 2 ? "Step-change & tempo calibration" : "Mirror P1–P3 + impact line",
    items: i % 2
      ? ["Step-change drill — 10 reps", "Metronome 3:1 — 5 min", "Record 3 swings"]
      : ["Mirror P1–P3 checkpoints — 10 reps", "Impact line — 15 brush strikes", "3 slow swings focusing on finish"]
  }));

  return {
    summary_long,
    p1p9,
    topPriorityFixes,
    topPowerFixes,
    power: { score: base.swingScore ?? 76, tempo: "3:1", release_timing: 62 },
    positionConsistency,
    swingConsistency,
    practicePlan
  };
}

/** ---------- TRY AI ENRICHMENT ---------- */
async function enrichWithAI(base) {
  try {
    const aiUrl = `${process.env.VERCEL_URL || "https://virtualcoachai.net"}/api/generate-report-llm`;
    const res = await fetch(aiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report: base })
    });
    if (!res.ok) throw new Error("AI enrichment failed");
    const data = await res.json();
    return { enhanced: true, ...data };
  } catch (e) {
    console.warn("AI enrichment fallback:", e.message);
    return { enhanced: false, ...localEnhance(base) };
  }
}

/** ---------- API ROUTE ---------- */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `reports/${id}.json`;

    const base = {
      schema: "1.0",
      created: new Date().toISOString(),
      status: body.status ?? "ready",
      swingScore: body.swingScore ?? 76,
      muxPlaybackId: body.muxPlaybackId ?? null,
      muxUploadId: body.muxUploadId ?? null,
      level: body?.meta?.level || body?.hints?.level,
      goal: body?.meta?.goal || body?.hints?.goal,
      meta: body.meta || {},
      note: body.note || ""
    };

    const ai = await enrichWithAI(base);

    const report = {
      ...base,
      summary_long: ai.summary || ai.summary_long,
      topPriorityFixes: ai.topPriorityFixes,
      topPowerFixes: ai.topPowerFixes,
      powerLeaks: ai.powerLeaks || [],
      power: ai.power || { score: base.swingScore ?? 76, tempo: "3:1", release_timing: 62 },
      p1p9: ai.p1p9,
      positionConsistency: ai.positionConsistency,
      swingConsistency: ai.swingConsistency,
      practicePlan: ai.practicePlan
    };

    const { url } = await put(key, JSON.stringify(report), {
      access: "public",
      contentType: "application/json"
    });

    return res.status(200).json({ id, url, enhanced: !!ai.enhanced, level: report.level, goal: report.goal });
  } catch (e) {
    return res.status(500).json({
      error: String(e?.message || e),
      hint: "Set BLOB_READ_WRITE_TOKEN and OPENAI_API_KEY."
    });
  }
}
