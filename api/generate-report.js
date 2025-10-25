// api/generate-report.js
//
// Goal:
// Safe serverless (Node) function for producing a swing report draft.
// This is NOT an Edge Function. We explicitly tell Vercel to use nodejs runtime
// so we can import 'openai' normally without killing the build.

export const config = {
  runtime: 'nodejs', // <- IMPORTANT: forces Node serverless, not Edge
};

// If you're using Vercel env vars, you'll want OPENAI_API_KEY set in Vercel.
// We import OpenAI and create a client. If there's no key, we'll fall back to stub text.
import OpenAI from "openai";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  try {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } catch (err) {
    console.error("OpenAI init failed:", err);
    return null;
  }
}

// helper to build a prompt from basic swing notes
function buildPrompt(body) {
  // body might include: level, missPattern, club, goals, etc.
  const level = body.level || "intermediate";
  const miss = body.miss || "push-fade";
  const goal = body.goal || "more consistency under pressure";

  // Tone matches site voice — direct, no fluff, no talking down.
  return `
You are Virtual Coach AI, a PGA-teaching style swing coach.
Write a short coaching card for this player.

Player level: ${level}
Typical miss: ${miss}
Main goal: ${goal}

Do the following:
1. Give 2 Priority Fixes (control/consistency first). Explain in plain English.
2. Give 1 Power Fix (speed, only if they're stable enough to chase speed).
3. Give 1 simple drill they can start today.

Rules:
- Be specific ("post into lead leg earlier", "quiet the hands at P6"), not generic ("stay down").
- Do NOT shame the player.
- Keep it short and punchy. No fluff. No "try 10 feels".
`;
}

// fallback coaching card if OpenAI isn't available
function fallbackCoachText() {
  return [
    "PRIORITY FIX 1: Clubface control at P6. Quiet the hands and let your body rotation square the face. If the hands try to save it late, start line jumps.",
    "PRIORITY FIX 2: Stop hanging back. Post into your lead leg earlier so contact isn't thin/high/right. You want your chest slightly more over the ball by impact.",
    "POWER FIX: Add speed only after ball start line is stable. Work lead wrist flex at P6, then release later so you’re not dumping speed early.",
    "DRILL: Slow-motion rehearsals to P6, pause, then turn through. 5 slow reps, then 2 normal-speed reps. That builds sequence you can actually repeat under pressure."
  ].join("\n\n");
}

// Vercel-style handler for Node serverless functions
export default async function handler(req, res) {
  // Only allow POST for now
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  try {
    // Parse the request body safely (handles raw string or already-parsed JSON)
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    // Build the model prompt
    const prompt = buildPrompt(body);

    // Try to get an OpenAI client if we have a key
    const openai = getOpenAIClient();

    let coachText = "";

    if (openai) {
      try {
        // Call OpenAI
        // Using responses API for assistants-style structured output
        const completion = await openai.responses.create({
          model: "gpt-4o-mini",
          input: prompt,
        });

        // SDK surfaces text as `output_text`
        coachText = completion.output_text || "";
      } catch (err) {
        console.error("OpenAI call failed, using fallback:", err);
        coachText = fallbackCoachText();
      }
    } else {
      // No API key, just return demo text so you can still show value
      coachText = fallbackCoachText();
    }

    // Shape a payload roughly in line with what your viewer wants
    // (This is intentionally simple. We can evolve this to include
    // topPriorityFixes, topPowerFixes, etc. once we standardize report.html.)
    const responsePayload = {
      ok: true,
      summary: coachText,
      meta: {
        level: body.level || null,
        miss: body.miss || null,
        goal: body.goal || null,
        generated_at: new Date().toISOString(),
      },
    };

    res.status(200).json(responsePayload);
  } catch (err) {
    console.error("generate-report error:", err);
    res.status(500).json({
      ok: false,
      error: "Could not generate report",
      detail: String(err && err.message ? err.message : err),
    });
  }
}
