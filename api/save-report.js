// api/save-report.js
export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";

/** Local fallback when OPENAI_API_KEY is missing or fails. */
function localEnhance(base) {
  const level = base.level || base?.meta?.level || "intermediate";
  const goal  = base.goal  || base?.meta?.goal  || "power";
  const score = Number(base.swingScore ?? 76);

  const p1p9 = [
    { id:"P1", name:"Address", grade: score>70?"good":"ok",
      short:"Athletic, balanced setup with neutral grip and calm upper body.",
      long:"Stand tall through the chest with soft knees, neutral pelvis, and balanced foot pressure (roughly 55/45 trail/lead). Ball position appropriate for the club and handle slightly forward. Build a consistent pre-shot routine to lock this in each time.",
      video:"https://www.youtube.com/results?search_query=address+golf+checkpoint" },
    { id:"P2", name:"Takeaway", grade:"ok",
      short:"One-piece start; clubhead stays outside the hands; face stays square.",
      long:"Move the chest and ribcage to start the club—avoid over-rolling the forearms. Keep width in the triangle and maintain posture while trail hip begins to accept pressure. Tempo stays smooth (about 3:1).",
      video:"https://www.youtube.com/results?search_query=takeaway+golf+checkpoint" },
    { id:"P3", name:"Lead arm parallel", grade:"ok",
      short:"Width preserved; lead wrist flatter; shaft stays near plane.",
      long:"Lead arm continues across the chest without collapse; trail wrist extends to set the angle. Pressure continues into the trail heel, not the toes. This stores energy without swaying off the ball.",
      video:"https://www.youtube.com/results?search_query=P3+lead+arm+parallel+golf" },
    { id:"P4", name:"Top", grade: score>82?"good":"ok",
      short:"Full coil with minimal sway; wrists set; structure intact.",
      long:"Lead shoulder gets under the chin; pelvis ~35–45° and thorax ~80–100° turned. Club is short of across-the-line unless you’re speed training. Feel width and a soft trail arm rather than a lift.",
      video:"https://www.youtube.com/results?search_query=P4+top+of+backswing+golf" },
    { id:"P5", name:"Delivery", grade:"ok",
      short:"Lower body leads; shaft shallows into delivery slot.",
      long:"From transition, shift and rotate into the lead side. Trail elbow moves in front of the hip pocket as the handle leads. This creates efficient sequencing and preserves lag.",
      video:"https://www.youtube.com/results?search_query=P5+delivery+position+golf" },
    { id:"P6", name:"Shaft parallel down", grade: score>78?"good":"ok",
      short:"Lag retained; shaft parallel to target line; face stable.",
      long:"Hands just ahead of trail thigh with shaft leaning slightly forward. Trail heel begins to release naturally; chest continues opening. Keep the club outside hands longer to avoid early throw.",
      video:"https://www.youtube.com/results?search_query=P6+shaft+parallel+downswing+golf" },
    { id:"P7", name:"Impact", grade: score>85?"good":"ok",
      short:"Forward shaft lean; lead side braced; face delivered square-to-path.",
      long:"Low point ahead of the ball with stable head and balanced pressure into the lead foot. Lead wrist flexed, trail wrist extended—compress the ball before the turf.",
      video:"https://www.youtube.com/results?search_query=P7+impact+golf" },
    { id:"P8", name:"Post-impact", grade:"ok",
      short:"Arms extend; rotation continues left; no stall.",
      long:"Both arms long after strike with chest continuing to rotate. Trail wrist gradually unhinges; handle keeps moving. This prevents a flip and tightens start-line.",
      video:"https://www.youtube.com/results?search_query=P8+post+impact+golf" },
    { id:"P9", name:"Finish", grade:"good",
      short:"Balanced, fully rotated; weight mostly left; tall finish.",
      long:"Weight ~90% lead side with belt buckle at the target and trail foot released. Hold your pose for two counts to hard-wire balance and rhythm.",
      video:"https://www.youtube.com/results?search_query=P9+finish+golf" },
  ];

  const topPriorityFixes =
    goal==="consistency" ? [
      "Stabilize face-to-path via lead-wrist flex and neutral grip",
      "Smoother lower-to-upper sequence from P4→P6",
      "Repeatable setup alignments (stance width/ball position)"
    ] : goal==="accuracy" ? [
      "Intermediate target + start-line calibration",
      "Reduce head sway to center low point",
      "Match face to path with grip and wrist conditions"
    ] : goal==="swing_plane" ? [
      "One-piece takeaway (club outside hands to P2)",
      "Early shallow from P4 without casting",
      "Keep chest turning through P7 to avoid stall"
    ] : [
      "Stronger lead-leg post/braking at transition",
      "Faster chest rotation through P7",
      "Maintain width in backswing to open speed windows"
    ];

  const topPowerFixes = [
    "Lead-leg post/brake at transition",
    "Pump-step or step-change for dynamic pressure shift",
    "Overspeed windows (light/medium/full) 2×/week"
  ];

  const summary =
    level==="beginner"
    ? "You’ve built a solid base from setup through impact. Keep it simple: consistent posture, a one-piece takeaway, and finish your chest to the target. We’ll add distance by learning a smooth pressure shift and a firm lead-leg post."
    : level==="advanced"
    ? "Your sequencing and delivery are close to a tour corridor. Most gains are in lead-leg braking, chest rotation speed, and face-to-path harmony. Small improvements around P6/P7 will tighten strike windows without sacrificing speed."
    : "You move well through P7 with a couple of energy leaks. We’ll clean up takeaway shape, shallow the shaft sooner, and post harder into the lead side for more speed and tighter dispersion.";

  const positionConsistency = { notes: "Setup and transition repeat nicely; variability shows up in face control near P6. Use checkpoints at P2/P6 and a metronome to stabilize rhythm (≈3:1)." };
  const swingConsistency    = { notes: "Tempo holds around 3:1 under stock speed. During speed-up, timing drifts slightly—alternate step drills with slow-motion reps." };

  const practicePlan = Array.from({length:14}, (_,i)=>({
    day: i+1,
    title: i%2? "Step-change & tempo calibration" : "Mirror P1–P3 + impact line",
    items: i%2
      ? ["Step-change drill — 10 reps", "Metronome 3:1 — 5 min", "Record 3 swings"]
      : ["Mirror P1–P3 checkpoints — 10 reps", "Impact line — 15 brush strikes", "3 slow swings focusing on finish"]
  }));

  return {
    summary,
    p1p9,
    topPriorityFixes,
    topPowerFixes,
    power: { score: base.swingScore ?? 76, tempo: "3:1", release_timing: 62 },
    positionConsistency,
    swingConsistency,
    practicePlan
  };
}

async function enhanceWithOpenAI(base) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { enhanced:false, ...localEnhance(base) };

  const prompt = `
You are a world-class golf coach (Butch Harmon, Dr. Kwon, Jim McLean, Dave Tutelman combined).
Create a DETAILED, PERSONALIZED JSON report with fields:
- summary (3–6 sentences, specific to level="${base?.meta?.level||base.level||'intermediate'}" and goal="${base?.meta?.goal||base.goal||'power'}"; mention strengths AND 1–2 clear priorities)
- p1p9: array of 9 items:
  { id, name, grade in ["good","ok","bad"], short (2–3 sentences), long (3–6 sentences, concrete cues/checkpoints), video (YouTube search URL) }
- topPriorityFixes: 3 highly actionable bullets
- topPowerFixes: 3 highly actionable bullets
- power: { score (0–100), tempo (e.g., "3:1"), release_timing (0–100) }
- positionConsistency: { notes (2–3 sentences with what is repeatable vs variable) }
- swingConsistency: { notes (2–3 sentences with tempo/timing notes) }
- practicePlan: 14 items { day (1–14), title, items [2–4 drills] }

Constraints:
- Be specific to swingScore=${Number(base.swingScore??76)}, height=${base?.meta?.height ?? 'n/a'}, handed=${base?.meta?.handed ?? 'n/a'}.
- Avoid generic fluff; use clear checkpoints (P1..P9) and practical feels.
- Return ONLY valid JSON.
  `.trim();

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      response_format: { type: "json_object" }
    })
  });

  if (!resp.ok) {
    return { enhanced:false, ...localEnhance(base) };
  }
  const data = await resp.json().catch(()=> ({}));
  const txt = data?.output_text || data?.output?.[0]?.content?.[0]?.text || "";
  try {
    const j = JSON.parse(txt);
    return { enhanced:true, ...j };
  } catch {
    return { enhanced:false, ...localEnhance(base) };
  }
}

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
      goal:  body?.meta?.goal  || body?.hints?.goal,
      meta: body.meta || {},
      note: body.note || ""
    };

    const ai = await enhanceWithOpenAI(base);

    const report = {
      ...base,
      summary: ai.summary,
      p1p9: ai.p1p9,
      topPriorityFixes: ai.topPriorityFixes,
      topPowerFixes: ai.topPowerFixes,
      power: ai.power,
      positionConsistency: ai.positionConsistency,
      swingConsistency: ai.swingConsistency,
      practicePlan: ai.practicePlan
    };

    const { url } = await put(key, JSON.stringify(report), {
      access: "public",
      contentType: "application/json"
    });

    // expose level/goal too to display in meta pills
    return res.status(200).json({ id, url, enhanced: !!ai.enhanced, level: report.level, goal: report.goal });
  } catch (e) {
    return res.status(500).json({
      error: String(e?.message || e),
      hint: "Set BLOB_READ_WRITE_TOKEN. For AI, set OPENAI_API_KEY."
    });
  }
}
