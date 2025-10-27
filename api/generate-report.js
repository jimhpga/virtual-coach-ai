// api/generate-report.js
//
// Virtual Coach AI — Coaching Card Generator (safe runtime version)
//
// Goals:
// - Runs in Node serverless (NOT Edge)
// - CommonJS export (module.exports)
// - Dynamic import("openai") so build/runtime won't explode if require() isn't supported in this env
// - Never returns a 500 to the golfer
// - GET returns a harmless JSON message so we can health-check with curl
//
// After deploy + alias, test:
//   curl https://virtualcoachai.net/api/generate-report
//
// And real inference test (PowerShell):
//   curl -Method POST `
//     -Uri https://virtualcoachai.net/api/generate-report `
//     -Headers @{ "Content-Type"="application/json" } `
//     -Body '{ "level":"intermediate","miss":"pull-hook","goal":"stop bowling it left" }'

// Tell Vercel: run this as Node (not Edge)
const config = {
  runtime: "nodejs",
};

// -------------------------
// prompt builder
function buildPrompt(opts) {
  const level = (opts && opts.level) || "intermediate";
  const miss = (opts && opts.miss) || "pull-hook under pressure";
  const goal = (opts && opts.goal) || "more control under pressure";

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

// -------------------------
// fallback card (if AI missing / fails)
// This is what keeps us from ever giving a 500.
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

// -------------------------
// read request body as JSON safely in Vercel's Node runtime
async function readJsonBody(req) {
  // If req.body is already a parsed object (sometimes in Vercel), use it
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  // If req.body is a string, try to parse it
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }

  // Otherwise, read the request stream manually
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

// -------------------------
// send JSON with proper headers using plain Node response methods
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(body);
}

// -------------------------
// try AI first, fallback if anything goes sideways
async function createCard(level, miss, goal) {
  // 1. If no OPENAI_API_KEY, skip AI entirely
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      text: fallbackCard({ level, miss, goal }),
      modelUsed: "fallback:no-openai",
    };
  }

  // 2. dynamic import of openai (ESM client)
  let OpenAI;
  try {
    const mod = await import("openai"); // returns ESM module namespace
    OpenAI = mod.default || mod.OpenAI || mod;
  } catch (err) {
    console.error("Dynamic import('openai') failed:", err);
    return {
      text: fallbackCard({ level, miss, goal }),
      modelUsed: "fallback:import-failed",
    };
  }

  // 3. actually call the model
  try {
    const client = new OpenAI({ apiKey: key });

    const completion = await client.responses.create({
      model: "gpt-4o-mini",
      input: buildPrompt({ level, miss, goal }),
    });

    const txt = (completion && completion.output_text)
      ? String(completion.output_text).trim()
      : "";

    if (!txt) {
      // AI responded but gave nothing usable
      return {
        text: fallbackCard({ level, miss, goal }),
        modelUsed: "fallback:empty-output",
      };
    }

    return {
      text: txt,
      modelUsed: "openai:gpt-4o-mini",
    };
  } catch (err) {
    console.error("OpenAI call threw:", err);
    return {
      text: fallbackCard({ level, miss, goal }),
      modelUsed: "fallback:openai-error",
    };
  }
}

// -------------------------
// main handler that Vercel will invoke
async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true, preflight: true });
    return;
  }

  // Health check / sanity check (no crash on GET)
  if (req.method === "GET") {
    sendJson(res, 200, {
      ok: false,
      message: "This endpoint expects POST with {level, miss, goal}.",
      hint: "Use POST to get your personalized coaching card.",
    });
    return;
  }

  // Reject anything that's not POST
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST" });
    return;
  }

  try {
    const body = await readJsonBody(req);

    const level = body.level || null;
    const miss = body.miss || null;
    const goal = body.goal || null;

    const result = await createCard(level, miss, goal);

    const payload = {
      ok: true,
      summary: result.text,
      meta: {
        level,
        miss,
        goal,
        generated_at: new Date().toISOString(),
        model_used: result.modelUsed,
      },
    };

    sendJson(res, 200, payload);
  } catch (err) {
    console.error("generate-report FATAL catch:", err);

    // absolutely last resort: still feed them a legit card
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

// Export for Vercel
module.exports = handler;
module.exports.config = config;
