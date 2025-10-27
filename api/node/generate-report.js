// api/node/generate-report.js
//
// Minimal safe Node serverless function.
// - CommonJS (module.exports)
// - Explicit runtime: nodejs18.x
// - NO OpenAI usage yet
// - GET works (health check)
// - POST returns a realistic offline coaching card
//
// After saving this file:
//   git add api/node/generate-report.js
//   git commit -m "stabilize node generate-report endpoint runtime=nodejs18.x no imports"
//   git push origin main
//   vercel deploy --prod
//
// Then test with curl (replace <NEWDEPLOY> with the URL vercel prints):
//   curl https://<NEWDEPLOY>.vercel.app/api/node/generate-report
//   curl -Method POST `
//     -Uri https://<NEWDEPLOY>.vercel.app/api/node/generate-report `
//     -Headers @{ "Content-Type"="application/json" } `
//     -Body '{ "level":"intermediate","miss":"pull-hook","goal":"control under pressure" }'

function sendJson(res, statusCode, dataObj) {
  const body = JSON.stringify(dataObj);

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

// offline coaching card (no AI yet)
function offlineCard({ level, miss, goal }) {
  const lvl = level || "intermediate";
  const missDesc = miss || "pull-hook under pressure";
  const aim = goal || "more control under pressure";

  return [
    `PLAYER SNAPSHOT
Level: ${lvl}
Typical miss: ${missDesc}
Main goal: ${aim}`,

    `PRIORITY FIX 1:
Post into your lead leg sooner so you don't have to shut the face with your hands.
When you "hang back" then flip, the ball starts left and hooks.
Feel your weight get left by P6 (club halfway down), and let your chest keep turning.
Turning squares the face without timing a flip.`,

    `PRIORITY FIX 2:
Stabilize the clubface instead of rescuing it at the last instant.
Quiet the hands through impact. Let rotation deliver the face.
That gives you a predictable start line under pressure.`,

    `POWER NOTE:
Speed comes later. First we control start line and contact.
Once face control is reliable, THEN we add rotation speed and ground force.`,

    `DAY-ONE DRILL:
Slow motion to P6 and freeze. Check: lead side is loaded, chest starting to open, hands quiet.
Then turn through without throwing the face.
Do 5 slow reps, then 2 normal-speed. Repeat.
This is how you build something that holds up on the course.`,
  ].join("\n\n");
}

// read JSON body safely in Node
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }

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

// main handler
async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true, preflight: true });
    return;
  }

  // GET: health check
  if (req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      message: "Node function is alive. Use POST with {level, miss, goal}.",
      note: "This is /api/node/generate-report",
    });
    return;
  }

  // Only POST does the card
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const level = body.level || null;
    const miss = body.miss || null;
    const goal = body.goal || null;

    const card = offlineCard({ level, miss, goal });

    const payload = {
      ok: true,
      summary: card,
      meta: {
        level,
        miss,
        goal,
        generated_at: new Date().toISOString(),
        model_used: "offline-demo",
      },
    };

    sendJson(res, 200, payload);
  } catch (err) {
    console.error("FATAL in handler:", err);

    sendJson(res, 200, {
      ok: true,
      summary: offlineCard({}),
      meta: {
        level: null,
        miss: null,
        goal: null,
        generated_at: new Date().toISOString(),
        model_used: "offline-fatal",
      },
      warning: "caught runtime error, returned offline card",
    });
  }
}

// This tells Vercel "this is a Node serverless function, not Edge"
handler.config = {
  runtime: "nodejs18.x",
};

// export CommonJS
module.exports = handler;
