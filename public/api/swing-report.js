module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing OPENAI_API_KEY env var" }));
    return;
  }

  // Read raw body (Vercel plain Node function)
  async function readBody(req) {
    return await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });
  }

  try {
    const raw = await readBody(req);
    let body = {};
    if (raw) {
      try { body = JSON.parse(raw); } catch (e) { body = {}; }
    }

    const playerName = (body.playerName || "Player").toString().trim() || "Player";

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a concise, no-BS golf coach. " +
              "Return ONLY a JSON object with this exact shape: " +
              "{ player, summary:{ body, tags[] }, ratings:{ swing, power, reliability }, " +
              "goodCharacteristics[], priorityFixes[], powerLeaks[], " +
              "checkpoints:[{ pos, name, status, note }], " +
              "practice:{ overview, blocks:[{ title, body }] } }. " +
              "Status MUST be one of GREEN, YELLOW, RED. " +
              "All text should be short, range-usable sentences. No markdown, no backticks, no extra keys."
          },
          {
            role: "user",
            content:
              "Player name: " + playerName + ". " +
              "Right-handed amateur golfer upload. " +
              "Generate a realistic but generic swing report and a 14-day plan."
          }
        ],
      }),
    });

    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error("OpenAI HTTP error:", openaiRes.status, txt);
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "OpenAI request failed" }));
      return;
    }

    const json = await openaiRes.json();
    const content = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || "{}";

    let report;
    try {
      report = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e, content);
      report = {};
    }

    if (!report.player) report.player = playerName;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(report));
  } catch (err) {
    console.error("AI swing-report error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Failed to generate report" }));
  }
};
