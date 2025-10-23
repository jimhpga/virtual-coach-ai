// api/save-report.js
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
      long:"Stand tall through the chest, soft knees, and neutral pelvis. Balance pressure ~55/45 (trail/lead). Ball position appropriate for the club and handle slightly forward. Lock this with a brief, repeatable pre-shot routine.",
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
      long:"Lead shoulder under chin; pelvis ~35–45° and thorax ~80–100° turned. Keep the club from getting too long unless speed training. Feel width and a soft trail arm rather than lifting.",
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
      how:   "Mark feet/ball on a mat; rehearse the same windows (iron/driver) for 10 reps before every session."
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
      why:   "Under-shifting limits available verticals/torque—robs effortless mph.",
      how:   "Step-change and pump-step: 10 reps alternating slow/normal; record 3 swings to verify rhythm (≈3:1)."
    },
    {
      title: "Speed windows",
      why:   "Practicing at varied intents teaches the body to organize faster patterns without chaos.",
      how:   "Light/medium/full sets (5-5-5) 2×/week; hold finish and confirm centerness of strike."
    }
  ];

  const summary_long =
    `Level: ${level}. Goal: ${goal}. Height: ${height} in. Handed: ${handed}.
You present a stable base at P1 and maintain structure into P4 with a clean coil for your build. The transition pattern shows good intent but can shallow earlier to reduce handle-stall and improve strike tightness. Through P6-P7 you’re close to a tour-like delivery—power grows rapidly when the lead-leg posts sooner and the chest keeps rotating. On off-days, dispersion tends to spread when the face outruns the path; simple start-line gates and lead-wrist flex cures most of it. Speed will come from better braking and pressure shift, not ‘trying harder’; keep tempo near 3:1 while adding speed windows. The plan below balances movement quality (P1–P3), delivery dynamics (P5–P7), and two days of scalable speed.`

  const positionConsistency = { notes: "Setup/transition repeat well. Variability shows mostly in face delivery around P6; add lead-wrist flex checkpoints and start-line gates." };
  const swingConsistency    = { notes: "Tempo ~3:1 on stock swings; creeps faster during speed work. Alternate slow-motion rehearsals with step-change to keep timing constant." };

  const practicePlan = Array.from({length:14}, (_,i)=>({
    day: i+1,
    title: i%2? "Step-change & tempo calibration" : "Mirror P1–P3 + impact line",
    items: i%2
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

/** ---------- OPENAI (preferred) ---------- */
async function enhanceWithOpenAI(base) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { enhanced:false, ...localEnhance(base) };

  const prompt = `
You are a world-class golf coach (Butch Harmon + Dr. Kwon + Jim McLean + Dave Tutelman). Return ONLY valid JSON:
{
  "summary_long": "6–10 sentence personalized narrative summary",
  "p1p9": [ { "id":"P1","name":"...","grade":"good|ok|bad","short":"2–3 sentences","long":"3–6 sentences","video":"YT search URL" }, ... ],
  "topPriorityFixes": [ { "title":"...", "why":"1–2 sentences", "how":"2–4 steps/drills" }, ...3 items total ],
  "topPowerFixes":    [ { "title":"...", "why":"1–2 sentences", "how":"2–4 steps/drills" }, ...3 items total ],
  "power": { "score": 0-100, "tempo":"e.g. 3:1", "release_timing": 0-100 },
  "positionConsistency": { "notes":"2–3 sentences" },
  "swingConsistency":    { "notes":"2–3 sentences" },
  "practicePlan": [ { "day":1-14, "title":"...", "items":["...", "..."] }, ... 14 items ]
}
Personalize to: swingScore=${Number(base.swingScore??76)}, height=${base?.meta?.height ?? 'n/a'}, handed=${base?.meta?.handed ?? 'n/a'}, level=${base?.meta?.level || base.level || 'intermediate'}, goal=${base?.meta?.goal || base.goal || 'power'}.
Use precise checkpoint language (P1..P9), avoid fluff, include concrete feels/cues. Ensure valid JSON.
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
      goal:  body?.meta?.goal  || body?.hints?.goal,
      meta: body.meta || {},
      note: body.note || ""
    };

    const ai = await enhanceWithOpenAI(base);

    const report = {
      ...base,
      summary_long: ai.summary_long,
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

    return res.status(200).json({ id, url, enhanced: !!ai.enhanced, level: report.level, goal: report.goal });
  } catch (e) {
    return res.status(500).json({
      error: String(e?.message || e),
      hint: "Set BLOB_READ_WRITE_TOKEN. For AI, set OPENAI_API_KEY."
    });
  }
}
