// api/generate-report.js
//
// Production AI coaching card generator for Virtual Coach AI.
// - Runs as Node, not Edge (so OpenAI client is allowed).
// - Tries OpenAI first.
// - If OpenAI fails OR there's no OPENAI_API_KEY set, returns a strong fallback card.
// - Never throws an uncaught error, so Vercel won't 500 on a player.

export const config = {
  runtime: 'nodejs',
};

import OpenAI from "openai";

function getOpenAIClient() {
  // If there's no key in env, return null
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } catch (err) {
    console.error("OpenAI init failed:", err);
    return null;
  }
}

// Helper: build the coaching prompt we send to the model
function buildPrompt({ level, miss, goal }) {
  const lvl = level || "intermediate";
  const missDesc = miss || "pull-hook under pressure";
  const aim = goal || "more control under pressure";

  return `
You are Virtual Coach AI, a veteran PGA-teaching style swing coach.
Your job is to build a focused improvement card for THIS player.

Player level: ${lvl}
Typical miss: ${missDesc}
Main goal: ${aim}

Do the following:
1. Give exactly TWO Priority Fixes. These should tighten control/consistency first.
   They should sound like: "Post into the lead leg earlier so you don't have to flip the face."
   Each should include what to feel, and WHY it matters for ball flight.
2. Give ONE Power Note. Only talk about speed if control is stable. Be honest.
3. Give ONE Day-One Drill. Simple, specific, can do today.

Rules:
- Speak directly to the player, not like a textbook.
- No shame. No "just keep your head down" garbage.
- Use the language a lesson tee coach would use: P6, face control, start line, rotate instead of flip.
- Keep it punchy. No fluff paragraphs.
- Output plain text, no markdown.
`;
}

// Fallback card (no OpenAI / OpenAI failed)
function fallbackCard({ level, miss, goal }) {
  const lvl = level || "intermediate";
  const missDesc = miss || "pull-hook under pressure";
  const aim = goal || "more control under pressure";

  return [
    `PLAYER SNAPSHOT
Level: ${lvl}
Typical miss: ${missDesc}
Main goal: ${aim}`,

    `PRIORITY FIX 1:
Stabilize the clubface through impact instead of "saving it" with the hands.
Right now you're shutting the face late to not miss right, and that turns into the pull-hook.
Quiet the hands at P6 (shaft just before impact) and let your chest rotation square the face.
Rotation squares the face repeatably. Flip is timing-based, and it breaks under pressure.`,

    `PRIORITY FIX 2:
Get onto your lead side sooner so you don't have to throw the face.
You're hanging back, then slamming the face shut to square it.
Post into the lead leg earlier, chest more over the ball at impact.
When you move left and rotate, you control start line without needing a panic release.`,

    `POWER NOTE:
Do not chase speed yet. Speed on top of chaos just gives you faster chaos.
First we make start line predictable. Then we add ground force and rotation for distance.`,

    `DAY-ONE DRILL:
Make slow-motion swings to P6 and freeze.
Feel: weight already into the lead leg, chest starting to open, hands quiet.
Then turn through without throwing the face.
Do 5 slow reps, then 2 normal-speed swings. That's how you build a motion you can actually trust on the course.`
  ].join("\n\n");
}

// Safe body parsing for Vercel serverless
async function readJsonBody(req) {
  // If Vercel already parsed JSON body:
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  // If it's a raw string:
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }

  // Otherwise read the stream manually:
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  try {
    const body = await readJsonBody(req);

    const { level, miss, goal } = body;

    const client = getOpenAIClient();
    let cardText = "";

    if (client) {
      // Try model path first
      try {
        const completion = await client.responses.create({
          model: "gpt-4o-mini",
          input: buildPrompt({ level, miss, goal }),
        });

        // SDK helper
        cardText = completion.output_text || "";
      } catch (err) {
        console.error("OpenAI call failed, using fallback:", err);
        cardText = fallbackCard({ level, miss, goal });
      }
    } else {
      // no OPENAI_API_KEY in env
      cardText = fallbackCard({ level, miss, goal });
    }

    const payload = {
      ok: true,
      summary: cardText,
      meta: {
        level: level || null,
        miss: miss || null,
        goal: goal || null,
        generated_at: new Date().toISOString(),
        model_used: client ? "openai:gpt-4o-mini" : "fallback:no-openai",
      },
    };

    res.status(200).json(payload);
  } catch (err) {
    console.error("generate-report fatal error:", err);

    // Even in a fatal case, we still respond with something useful.
    res.status(200).json({
      ok: true,
      summary: fallbackCard({}),
      meta: {
        level: null,
        miss: null,
        goal: null,
        generated_at: new Date().toISOString(),
        model_used: "fallback:fatal",
      },
      warning: "AI call failed at runtime; fallback used.",
    });
  }
}
