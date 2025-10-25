// api/generate-report.js
//
// Goal:
// Safe serverless (Node) function for producing a swing report draft.
// This is NOT an Edge Function. We are explicitly telling Vercel to use nodejs runtime
// so we can import 'openai' normally without killing the build.

export const config = {
  runtime: 'nodejs', // <- IMPORTANT: forces Node serverless, not Edge
};

// If you're using Vercel env vars, you'll want OPENAI_API_KEY set in Vercel.
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// helper to build a prompt from basic swing notes
function buildPrompt(body) {
  // body might include: level, missPattern, club, goals, etc.
  const level = body.level || "intermediate";
  const miss = body.miss || "push-fade";
  const goal = body.goal || "more consistency under pressure";

  // We keep tone consistent with your site.
  return `
You are Virtual Coach AI, a PGA-teaching style swing coach.
Write a short coaching card for this player.

Player level: ${level}
Typical miss: ${miss}
Main goal: ${goal}

1. Give 2 priority fixes (control/consistency first).
2. Give 1 power fix (speed, if appropriate).
3. Give 1 drill they can start today.
Keep the language plain, direct, non-judgmental. No fluff.
`;
}

// Vercel-style handler for Node serverless functions
export default async function handler(req, res) {
  // Only allow POST for now
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    // --- build prompt
    const prompt = buildPrompt(body);

    // --- call OpenAI
    // You can upgrade this to gpt-4o or your tuned model.
    // We're keeping it simple for now.
    let coachText = "";
    try {
      const completion = await client.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
      });

      // Different OpenAI SDKs shape responses differently. We're using .output_text
      coachText = completion.output_text || "No response.";
    } catch (err) {
      // Fallback so you can still demo if OpenAI is down or key missing
      coachText = [
        "PRIORITY FIX 1: Clean up clubface control at P6. Quiet the hands, let the body turn deliver the face.",
        "PRIORITY FIX 2: Stop hanging back. Post into your lead leg earlier so contact isn’t high/right.",
        "POWER FIX: Add speed after contact window stabilizes. Lead wrist flex at P6 → later release.",
        "DRILL: Slow rehearsals to P6, pause, then turn through. 5 reps slow, then 2 at normal speed."
      ].join("\n");
    }

    // --- shape API response in the style your report viewer expects
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
