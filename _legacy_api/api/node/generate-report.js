// api/node/generate-report.js
//
// Ultra-stable baseline handler.
// No Buffer, no streaming, no dynamic import, no config export.
// Just returns JSON. This should NOT crash under Vercel.
//
// If this runs, we know we're executing your code successfully.
// After that, we can layer back body parsing + OpenAI.

function sendJson(res, statusCode, data) {
  const out = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(out);
}

async function handler(req, res) {
  // Handle preflight
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true, preflight: true });
    return;
  }

  // Simple GET: health check
  if (req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      message: "Virtual Coach AI node function is alive.",
      how_to_use: "POST {level, miss, goal} to get a sample coaching card.",
      version: "baseline-1",
    });
    return;
  }

  // Simple POST: DO NOT PARSE BODY YET.
  // We just return a canned card so nothing can blow up.
  if (req.method === "POST") {
    const demoCard = [
      "PLAYER SNAPSHOT",
      "Level: intermediate",
      "Typical miss: pull-hook under pressure",
      "Main goal: stop bowling it left under pressure",

      "PRIORITY FIX 1:\nPost into the lead leg earlier so you don't have to flip the face shut at impact. " +
        "You’re hanging back, then throwing the hands. We want rotation to square the face, not timing.",

      "PRIORITY FIX 2:\nQuiet the hands at P6 (shaft just before impact). Let chest rotation deliver the face. " +
        "That stabilizes start line and stops the wipe-left miss under pressure.",

      "POWER NOTE:\nSpeed comes after control. Once start line is predictable, THEN we add ground force and turn.",

      "DAY-ONE DRILL:\nSlow swings to P6 and freeze. Feel weight already left, chest starting to open, hands quiet. " +
        "Then turn through without slamming the face. 5 slow reps, then 2 normal-speed swings."
    ].join("\n\n");

    sendJson(res, 200, {
      ok: true,
      summary: demoCard,
      meta: {
        generated_at: new Date().toISOString(),
        model_used: "hardcoded-baseline",
      },
    });
    return;
  }

  // Anything else
  sendJson(res, 405, {
    ok: false,
    error: "Method not allowed. Use GET (health) or POST (card).",
  });
}

module.exports = handler;
