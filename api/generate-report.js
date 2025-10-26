// api/generate-report.js
//
// Virtual Coach AI — Coaching Card Generator
// - Node runtime (NOT Edge) so we can talk to OpenAI
// - CommonJS style (require/module.exports) so it runs clean in your app
// - Will ALWAYS return 200 with some coaching text, even if OpenAI explodes
//
// After deploy + alias, test with:
// curl -Method POST `
//   -Uri https://virtualcoachai.net/api/generate-report `
//   -Headers @{ "Content-Type" = "application/json" } `
//   -Body '{ "level": "intermediate", "miss": "pull-hook", "goal": "stop bowling it left under pressure" }'

export const config = {
  // force Vercel to treat this as a Node Serverless Function, not Edge
  runtime: "nodejs",
};

// --- OpenAI client loader (safe) ----------------------------------------

function getOpenAIClient() {
  // lazy-require so Node doesn't throw just from parsing the file
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.warn("No OPENAI_API_KEY in env; using fallback mode.");
      return null;
    }
    const OpenAI = require("openai"); // CommonJS require

    return new OpenAI({
      apiKey: key,
    });
  } catch (err) {
    console.error("OpenAI init failed:", err);
    return null;
  }
}

// --- Prompt builder ------------------------------------------------------

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

// --- Fallback card (no AI / AI failed) ----------------------------------

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

// --- Body reader: handles req.body OR raw stream -----------------------

async function readJsonBody(req) {
  // Sometimes Vercel gives us parsed JSON already:
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  // Sometimes it's a string:
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }

  // Fallback: read the stream
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// --- Response helper to *always* send JSON and not crash CORS -----------

function sendJson(res, statusCode, data) {
  res.status(statusCode);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data));
}

// --- MAIN HANDLER -------------------------------------------------------

module.exports = async function handler(req, res) {
  // Handle preflight for browser fetch/POST
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true, preflight: true });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST" });
    return;
  }

  // We wrap the whole body in try/catch so NOTHING throws uncaught
  try {
    const body = await readJsonBody(req);
    const { level, miss, goal } = body || {};

    // Try to get OpenAI client
    const client = getOpenAIClient();

    // default output
    let cardText = "";
    let modelUsed = "";

    if (client) {
      try {
        // Call OpenAI using the new SDK style
        const completion = await client.responses.create({
          model: "gpt-4o-mini",
          input: buildPrompt({ level, miss, goal }),
        });

        // This is how the new SDK exposes text. If it's empty, we fall back.
        cardText = (completion && completion.output_text || "").trim();

        if (!cardText) {
          console.warn("OpenAI returned empty text; using fallback");
          cardText = fallbackCard({ level, miss, goal });
          modelUsed = "fallback:empty-openai-output";
        } else {
          modelUsed = "openai:gpt-4o-mini";
        }
      } catch (err) {
        console.error("OpenAI call exploded, using fallback:", err);
        cardText = fallbackCard({ level, miss, goal });
        modelUsed = "fallback:openai-error";
      }
    } else {
      // No OpenAI client => no key or init error
      cardText = fallbackCard({ level, miss, goal });
      modelUsed = "fallback:no-openai";
    }

    const payload = {
      ok: true,
      summary: cardText,
      meta: {
        level: level || null,
        miss: miss || null,
        goal: goal || null,
        generated_at: new Date().toISOString(),
        model_used: modelUsed,
      },
    };

    sendJson(res, 200, payload);
  } catch (err) {
    console.error("generate-report FATAL catch:", err);

    // even in total failure, send a baseline card
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
};
