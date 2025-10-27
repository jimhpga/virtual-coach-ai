// api/node/generate-report.js
//
// Minimal sanity check function.
// Goal: PROVE Vercel will execute a basic Node serverless fn without Edge,
// without OpenAI, without dynamic import.
//
// If THIS runs, then we know the problem isn't Vercel routing, it's the
// way it was treating /api/generate-report.js. After this is live,
// we'll wire back in the coaching card logic.

const handler = async (req, res) => {
  // allow browser / curl preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end(JSON.stringify({ ok: true, preflight: true }));
    return;
  }

  // simple GET health check
  if (req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      ok: true,
      message: "Node function is alive. Use POST with {level, miss, goal} next.",
      note: "This is the /api/node/generate-report endpoint.",
    }));
    return;
  }

  // handle POST with dummy coaching text (no OpenAI yet)
  if (req.method === "POST") {
    // read raw body safely
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    let bodyJson = {};
    try {
      bodyJson = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch (e) {
      bodyJson = {};
    }

    const level = bodyJson.level || "unknown";
    const miss  = bodyJson.miss  || "not provided";
    const goal  = bodyJson.goal  || "not provided";

    const summaryText =
      `PRIORITY FIX 1: Control the clubface.\n` +
      `PRIORITY FIX 2: Get onto the lead side earlier.\n` +
      `POWER NOTE: Speed comes after control.\n` +
      `DRILL: Slow rehearsal to P6, pause, rotate through.\n` +
      `\n(player level=${level}, miss=${miss}, goal=${goal})`;

    const payload = {
      ok: true,
      summary: summaryText,
      meta: {
        level,
        miss,
        goal,
        generated_at: new Date().toISOString(),
        model_used: "offline-demo",
      },
    };

    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(payload));
    return;
  }

  // anything else
  res.writeHead(405, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
};

// Vercel Node serverless export (CommonJS)
module.exports = handler;

// Tell Vercel: run this as node, not edge.
module.exports.config = {
  runtime: "nodejs",
};
