// api/generate-report-llm.js
export const config = { runtime: "nodejs" };

function safeJson(input) {
  try {
    if (!input) return {};
    if (typeof input === "string") return JSON.parse(input);
    return input;
  } catch {
    return {};
  }
}

function buildFallbackEnhancement(report) {
  // Deterministic, lightweight enhancement so the UI looks “personalized”
  const meta = report?.meta || {};
  const handed = meta.handed || "right";
  const tempo = meta.tempo || "3:1";

  return {
    topPriorityFixes: [
      "Posture & spine angle stable through P2",
      "Clubface square by P3 (lead wrist flat)",
      "Finish with chest to target, 90% weight on lead side",
    ],
    topPowerFixes: [
      "Earlier wrist set by P2.5",
      "Lead hip posts into impact",
      "Push ground later (release speed closer to impact)",
    ],
    positionConsistency: { notes: "Set consistent ball position for the selected club; rehearse same start line." },
    swingConsistency: { notes: "Keep head steady and re-center pressure forward by P4; finish balanced." },
    power: { score: Math.max(60, Number(report?.swingScore ?? 74)), tempo, release_timing: 65 },
    p1p9: [
      { id: "P1", name: "Address", grade: "ok",
        short: "Athletic stance; weight centered; neutral grip.",
        long: "Match hand height to hip crease; slight knee flex; align zipper through ball; trail hand soft to avoid shutting face.",
        video: "https://www.youtube.com/results?search_query=P1+address+golf" },
      { id: "P2", name: "Takeaway", grade: "good",
        short: "One-piece move; club outside hands; face square.",
        long: "Keep trail wrist soft; maintain triangle; shaft parallel to target line; avoid early roll-in.",
        video: "https://www.youtube.com/results?search_query=P2+takeaway+golf" },
      { id: "P3", name: "Lead arm parallel", grade: "ok",
        short: "Width maintained; club parallel to spine.",
        long: "Lead wrist more flat, trail elbow points down; don’t over-rotate chest.",
        video: "https://www.youtube.com/results?search_query=P3+lead+arm+parallel+golf" },
      { id: "P4", name: "Top", grade: "needs help",
        short: "Complete turn; trail elbow under; face not shut.",
        long: "Feel trail hip deep; lead wrist flat not cupped; avoid across-the-line; small pause helps sequence.",
        video: "https://www.youtube.com/results?search_query=P4+top+of+backswing+golf" },
      { id: "P5", name: "Shaft parallel down", grade: "ok",
        short: "Shallow slightly; hands inside clubhead.",
        long: "Pressure to lead foot; trail elbow in front of hip; retain wrist angles.",
        video: "https://www.youtube.com/results?search_query=P5+downswing+golf" },
      { id: "P6", name: "Club parallel before impact", grade: "ok",
        short: "Handle leads; face square; chest open.",
        long: "Lead hip posted; keep trail heel light; strike ball then turf.",
        video: "https://www.youtube.com/results?search_query=P6+pre+impact+golf" },
      { id: "P7", name: "Impact", grade: "good",
        short: "Forward shaft lean; weight left; low point ahead.",
        long: "Lead wrist flat/bowed; keep head back of ball; compress with hands leading.",
        video: "https://www.youtube.com/results?search_query=P7+impact+golf" },
      { id: "P8", name: "Post impact", grade: "ok",
        short: "Arms extend; chest rotates; face passive.",
        long: "Keep width; rotate through; maintain speed into P9.",
        video: "https://www.youtube.com/results?search_query=P8+post+impact+golf" },
      { id: "P9", name: "Finish", grade: "ok",
        short: "Balanced, chest to target, trail foot up.",
        long: "Hold finish; belt buckle to target; weight 90% lead side.",
        video: "https://www.youtube.com/results?search_query=P9+finish+golf" },
    ],
    practicePlan: Array.from({ length: 14 }, (_, i) => {
      const day = i + 1;
      if (day === 1) return { day, title: "Mirror P1–P2 (10m)", items: ["Athletic posture checkpoints", "One-piece takeaway with stick"] };
      if (day === 2) return { day, title: "Tempo & pump", items: ["Metronome "+tempo+" (5m)", "Pump drill — 10 reps"] };
      if (day === 3) return { day, title: "Lead wrist at P4", items: ["Bow lead wrist at top — 15 reps", "Record 3 swings"] };
      if (day === 4) return { day, title: "Low-point gates", items: ["Impact line — 20 brush strikes", "3 slow-motion swings"] };
      if (day === 5) return { day, title: "Path & start line", items: ["Alignment stick start line — 15 balls"] };
      if (day === 6) return { day, title: "Speed windows", items: ["Light → medium → full — 15 balls"] };
      if (day === 7) return { day, title: "Review", items: ["Re-record P1–P4 checkpoints"] };
      if (day === 8) return { day, title: "Re-load wrist set", items: ["Set by P2.5 — 15 reps"] };
      if (day === 9) return { day, title: "Face-to-path", items: ["Start left, curve back — 10 balls"] };
      if (day === 10) return { day, title: "Ground forces", items: ["Hold trail heel, post into lead — 10 reps"] };
      if (day === 11) return { day, title: "Tempo "+tempo, items: ["Metronome — 5 min"] };
      if (day === 12) return { day, title: "Pressure shift", items: ["Step-change — 10 reps"] };
      if (day === 13) return { day, title: "Combine", items: ["Alternate drills — 20 balls"] };
      return { day, title: "Retest", items: ["Film 3 swings — upload new report"] };
    }),
  };
}

async function callOpenAI(system, user) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null; // triggers fallback

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`OpenAI ${r.status}: ${txt.slice(0, 200)}`);
  }
  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content || "{}";
  return safeJson(raw);
}

const SYSTEM = `
You are a senior golf coach and MUST return only strict JSON matching the target shape. 
Personalize to handedness, height, eye, handicap if given. Be concise and actionable.
`;

function userPrompt(report) {
  const lean = {
    meta: report?.meta || {},
    power: report?.power || { score: report?.swingScore ?? 80 },
    p1p9: report?.p1p9 || [],
    faults: report?.faults || [],
    note: report?.note || "",
  };
  return `Base swing report:\n${JSON.stringify(lean, null, 2)}\nReturn only the enhancement JSON keys.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const body = safeJson(req.body);
    const report = body?.report || {};

    let enhanced = await callOpenAI(SYSTEM, userPrompt(report));
    if (!enhanced || typeof enhanced !== "object") {
      enhanced = buildFallbackEnhancement(report);
    }
    return res.status(200).json(enhanced);
  } catch (e) {
    console.error("LLM route failed:", e?.message || e);
    // Still return fallback so UI fills out
    const report = safeJson(req.body)?.report || {};
    return res.status(200).json(buildFallbackEnhancement(report));
  }
}
