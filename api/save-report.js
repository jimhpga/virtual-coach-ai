// api/save-report.js
export const config = { runtime: "nodejs" };

import { put } from "@vercel/blob";

/** Optional: lightweight heuristic enhancer if no OPENAI_API_KEY */
function localEnhance(base) {
  const level = base.level || base?.meta?.level || "intermediate";
  const goal  = base.goal  || base?.meta?.goal  || "power";
  const score = Number(base.swingScore ?? 75);

  const mk = (t,s,l)=>({title:t, short:s, long:l});

  const p1p9 = [
    { id:"P1", name:"Address", grade: score>70?"good":"ok",
      short:"Athletic, balanced posture with neutral grip.",
      long:"Set up with feet shoulder-width, slight knee flex, neutral spine. Pressure 55/45 trail/lead, handle modestly forward. Vision matched to aim." },
    { id:"P2", name:"Takeaway", grade:"ok",
      short:"One-piece move with clubface square.",
      long:"Clubhead stays outside hands through knee height. Minimal forearm roll. Maintain triangle; trail hip begins to load." },
    { id:"P3", name:"Lead arm parallel", grade:"ok",
      short:"Width maintained, shaft near plane.",
      long:"Lead arm across chest without collapse; trail wrist extended, lead wrist flatter. Pressure continues into trail heel." },
    { id:"P4", name:"Top", grade: score>82?"good":"ok",
      short:"Full coil without excessive sway.",
      long:"Lead shoulder under chin, pelvis turned 35–45°, thorax 80–100°. Wrists set; club short of across-the-line unless speed training." },
    { id:"P5", name:"Delivery", grade:"ok",
      short:"Lower body leads; shaft shallows.",
      long:"Pelvis shifts/rotates to lead side. Trail elbow in front of hip pocket. Handle leads while club shallows from P4." },
    { id:"P6", name:"Shaft parallel down", grade: score>78?"good":"ok",
      short:"Lag retained; face square-ish.",
      long:"Shaft near parallel to target line; hands just ahead of trail thigh. Trail heel beginning to release; torso open ~25°." },
    { id:"P7", name:"Impact", grade: score>85?"good":"ok",
      short:"Forward shaft lean and stable face.",
      long:"Lead side braced, handle ahead, low-point in front, face delivered square-to-path. Lead wrist flexed; trail wrist extended." },
    { id:"P8", name:"Post-impact", grade:"ok",
      short:"Arms extend; rotation continues.",
      long:"Both arms extended after strike; chest continues left. Trail wrist gradually unhinges; no stall/flip." },
    { id:"P9", name:"Finish", grade:"good",
      short:"Balanced, fully rotated to target.",
      long:"Weight 90% lead side; belt buckle target-ward; trail foot vertical or released. Hold pose for 2 seconds." },
  ];

  const topPriorityFixes =
    goal==="consistency" ? [
      "Smoother lower-to-upper sequence from P4→P6",
      "Stabilize face angles with grip/lead-wrist match",
      "Repeatable setup alignments (stance/ball position)"
    ] : goal==="accuracy" ? [
      "Tighten start-line with intermediate target",
      "Match face-to-path via grip and lead wrist",
      "Calm head sway for centered strike"
    ] : goal==="swing_plane" ? [
      "Match takeaway arc (club outside hands at P2)",
      "Shallow from P4 without early cast",
      "Finish chest left to avoid stall"
    ] : [
      "More lead-leg braking from P4",
      "Faster chest rotation through P7",
      "Wider backswing to maintain speed windows"
    ];

  const topPowerFixes = [
    "Lead-leg post/brake at transition",
    "Pump-step or step-change for pressure shift",
    "Overspeed windows (light/medium/full)"
  ];

  const summary =
    level==="beginner"
    ? "Solid base from setup through impact. Keep it simple: stable posture, one-piece takeaway, and finish your chest to the target. We’ll build power by learning a smooth pressure shift and a firm lead-leg post."
    : level==="advanced"
    ? "Sequencing and delivery are close to tour corridor. Gains are in lead-leg braking, chest rotation, and face-to-path harmony. Small changes at P6/P7 will tighten strike windows without sacrificing speed."
    : "Good motion through P7 with a few energy leaks. We’ll clean up takeaway shape, shallow the shaft sooner, and add a stronger post into lead side for more speed and tighter dispersion.";

  const positionConsistency = { notes: "Setup and transition are repeatable; minor variability in face control around P6." };
  const swingConsistency    = { notes: "Tempo stable (~3:1). Occasional timing drift under speed—use metronome and step drills." };

  const practicePlan = Array.from({length:14}, (_,i)=>({
    day: i+1,
    title: i%2? "Step-change & tempo" : "Mirror P1-P3 + impact line",
    items: i%2
      ? ["Step-change drill — 10 reps", "Metronome 3:1 — 5 min", "Record 3 swings"]
      : ["Mirror P1-P3 checkpoints — 10 reps", "Impact line — 15 brush strikes", "3 slow swings focusing on finish"]
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

  // Lazy, robust prompt (short for MVP)
  const prompt = `
You are a world-class golf coach (Butch Harmon, Dr. Kwon, Jim McLean, Dave Tutelman combined).
Create a JSON report with fields:
- summary (2-4 sentences, personalized for level="${base?.meta?.level||base.level||'intermediate'}" and goal="${base?.meta?.goal||base.goal||'power'}")
- p1p9: array of 9 items {id,name,grade,short,long,video}
- topPriorityFixes: 3 bullets
- topPowerFixes: 3 bullets
- power {score,tempo,release_timing}
- positionConsistency {notes}
- swingConsistency {notes}
- practicePlan: 14 items {day,title,items[]}

Focus on *actionable, non-generic* coaching. Keep "short" 1 sentence; "long" 2–4 sentences. If you add video, use a useful YouTube search link.
Return ONLY valid JSON.
Given: swingScore=${Number(base.swingScore??76)}; height=${base?.meta?.height ?? 'n/a'}; handed=${base?.meta?.handed ?? 'n/a'}.
  `.trim();

  // OpenAI Responses API (JSON mode) – minimal client to avoid extra deps
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
    // Fall back if OpenAI fails
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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

    // AI enhancement (OpenAI if available, otherwise heuristic localEnhance)
    const ai = await enhanceWithOpenAI(base);

    // Merge
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

    return res.status(200).json({ id, url, enhanced: !!ai.enhanced });
  } catch (e) {
    return res.status(500).json({
      error: String(e?.message || e),
      hint: "Ensure @vercel/blob is installed and BLOB_READ_WRITE_TOKEN is set. For AI, set OPENAI_API_KEY."
    });
  }
}
