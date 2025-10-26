// api/generate-report.js
//
// Virtual Coach AI — Coaching Card Generator
// - CommonJS module, safe for Vercel's Node runtime
// - Forces Node runtime (not Edge) via module.exports.config
// - Never throws a 500 at the player
// - Uses OpenAI if available, otherwise returns a strong fallback card

// Tell Vercel: run this as Node (NOT Edge)
const config = {
  runtime: "nodejs",
};

// Lazy-load OpenAI client safely
function getOpenAIClient() {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.warn("No OPENAI_API_KEY in env; fallback mode.");
      return null;
    }

    // Require here so build doesn't explode if module isn't bundled for edge
    const OpenAI = require("openai");

    return new OpenAI({
      apiKey: key,
    });
  } catch (err) {
    console.error("OpenAI init failed:", err);
    return null;
  }
}

// Build the coaching prompt for AI
function buildPrompt(opts) {
  const level = opts && opts.level ? opts.level : "intermediate";
  const miss = opts && opts.miss ? opts.miss : "pull-hook under pressure";
  const goal = opts && opts.goal ? opts.goal : "more control under pressure";

  return (
`You are Virtual Coach AI, a veteran PGA-teaching style swing coach.
Your job is to build a focused improvement card for THIS player.

Player level: ${level}
Typical miss: ${miss}
Main goal: ${goal}

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
- Output plain text only.`
  );
}

// Fallback card if OpenAI isn't available
function fallbackCard(opts) {
  const level = (opts && opts.level) || "intermediate";
  const miss = (opts && opts.miss) || "pull-hook under pressure";
  const goal = (opts && opts.goal) || "more control under pressure";

  return [
    `PLAYER SNAPSHOT
Level: ${level}
Typical miss: ${miss}
Main goal: ${goal}`,

    `PRIORITY FIX 1:
Stabilize the clubface through impact instead of "saving it" with the hands.
Right now you're shutting the face late to not miss right, and that turns into the pull-hook.
Quiet the hands at P6 (shaft just before impact) and let your chest rotation square the face.
Rotation squares the face repeatably. Flip is timing-based, and it falls apart under pressure.`,

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
Do 5 slow reps, then 2 normal-speed swings.
This is how you build a motion you can trust on the course.`
  ].join("\n\n");
}

// Read request body as JSON, safely
async function readJsonBody(req) {
  // Case 1: already parsed
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  // Case 2: body is a string
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch (err) {
      return {};
    }
  }

  // Case 3: stream
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

// Send JSON with proper headers (NO res.status())
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(body);
}

// Main handler
async function handler(req, res) {
  // Handle CORS preflight quickly
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true, preflight: true });
    return;
  }

  // Friendly message for GET (browser poke / health check)
  if (req.method === "GET") {
    sendJson(res, 200, { ok: false, error: "Use POST" });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const level = body.level || null;
    const miss = body.miss || null;
    const goal = body.goal || null;

    const client = getOpenAIClient();
    let cardText = "";
    let modelUsed = "";

    if (client) {
      try {
        // OpenAI "responses" API
        const completion = await client.responses.create({
          model: "gpt-4o-mini",
          input: buildPrompt({ level, miss, goal }),
        });

        // Try to pull plain text off response
        if (completion && completion.output_text) {
          cardText = String(completion.output_text || "").trim();
          modelUsed = "openai:gpt-4o-mini";
        } else {
          console.warn("OpenAI gave no output_text. Using fallback.");
          cardText = fallbackCard({ level, miss, goal });
          modelUsed = "fallback:empty-output";
        }
      } catch (err) {
        console.error("OpenAI call failed:", err);
        cardText = fallbackCard({ level, miss, goal });
        modelUsed = "fallback:openai-error";
      }
    } else {
      // No OPENAI_API_KEY or cannot init client
      cardText = fallbackCard({ level, miss, goal });
      modelUsed = "fallback:no-openai";
    }

    const payload = {
      ok: true,
      summary: cardText,
      meta: {
        level,
        miss,
        goal,
        generated_at: new Date().toISOString(),
        model_used: modelUsed,
      },
    };

    sendJson(res, 200, payload);
  } catch (err) {
    console.error("generate-report FATAL catch:", err);

    const payload = {
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
    };

    sendJson(res, 200, payload);
  }
}

// Export for Vercel (CommonJS style)
module.exports = handler;
module.exports.config = config;
