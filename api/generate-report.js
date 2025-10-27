// api/generate-report.js
//
// Virtual Coach AI — Coaching Card Generator (safe runtime version)
//
// Goals:
// - Runs in Node serverless (NOT Edge)
// - CommonJS (module.exports)
// - Dynamic import of "openai" so cold start won't explode if require() isn't supported
// - Never returns a 500 to the golfer
// - GET returns a harmless JSON message so we can health-check with curl
//
// After deploying + aliasing, test:
//   curl https://virtualcoachai.net/api/generate-report
// and:
//   curl -Method POST `
//     -Uri https://virtualcoachai.net/api/generate-report `
//     -Headers @{ "Content-Type"="application/json" } `
//     -Body '{ "level":"intermediate","miss":"pull-hook","goal":"stop bowling it left" }'

const config = {
  runtime: "nodejs", // <- tell Vercel this is Node, not Edge
};

// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// fallback card (no AI or AI failed)
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

// ---------------------------------------------------------------------
// tiny helper: try to parse JSON body regardless of how Vercel fed it
async function readJsonBody(req) {
  // already-object case
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  // string case
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }

  // stream case
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

// ---------------------------------------------------------------------
// send JSON with headers in plain Node style
function sendJson(res, statusCode, data) {
  const out = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(out);
}

// ---------------------------------------------------------------------
// create coaching card (AI first, fallback if not available)
async function createCard(level, miss, goal) {
  // 1. If there's no API key, skip AI entirely
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      text: fallbackCard({ level, miss, goal }),
      modelUsed: "fallback:no-openai",
    };
  }

  // 2. We DO have a key. Now dynamically import the ESM client.
  //    We wrap in try so if import() isn't allowed for some reason, we still live.
  let OpenAI;
  try {
    // dynamic import returns a module namespace object
    const mod = await import("openai");
    OpenAI = mod.default || mod.OpenAI || mod;
  } catch (err) {
    console.error("Dynamic import('openai') failed:", err);
    return {
      text: fallbackCard({ level, miss, goal }),
      modelUsed: "fallback:import-failed",
    };
  }

  // 3. Try to call the model
  try {
    const client = new OpenAI({ apiKey: key });

    const completion = await client.responses.create({
      model: "gpt-4o-mini",
      input: buildPrompt({ level, miss, goal }),
    });

    const txt = (completion && completion.output_text) ? String(completion.output_text).trim() : "";

    if (!txt) {
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

// ---------------------------------------------------------------------
// main handler Vercel will invoke
async function handler(req, res) {
  // handle preflight
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true, preflight: true });
    return;
  }

  // health check + debug: should NEVER crash here
  if (req.method === "GET") {
    sendJson(res, 200, {
      ok: false,
      message: "This endpoint expects POST with {level, miss, goal}.",
      hint: "Use POST to get your personalized coaching card.",
    });
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

    // last-resort safety
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
