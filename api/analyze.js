// /api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const { id, frames } = req.body || {};
    if (!id || !Array.isArray(frames) || frames.length < 3) {
      return res.status(400).json({ error: 'missing id or frames (need >=3)' });
    }

    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        tempo: {
          type: "object",
          properties: {
            backswing: { type: "number" },
            pause: { type: "number" },
            downswing: { type: "number" },
            ratio: { type: "number" }
          }, required: ["backswing","pause","downswing","ratio"]
        },
        pFlags: {
          type: "array",
          items: { type: "string", enum: ["g","y","r"] }, minItems: 9, maxItems: 9
        },
        top3WorkOn: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        top3Power:  { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 }
      },
      required: ["id","tempo","pFlags","top3WorkOn","top3Power"],
      additionalProperties: false
    };

    // Build an OpenAI Responses API request with images + JSON schema
    const messages = [
      { role: "system", content:
        "You are a golf swing analyst. Given 3–9 key frames of a single swing, estimate tempo (backswing, pause, downswing, ratio) " +
        "and set P1–P9 flags (g=Good, y=Okay, r=Needs Work). Provide Top 3 Things to Work On and Top 3 Power Things to Work On. " +
        "Be consistent and conservative. Output MUST match the JSON schema." },
      { role: "user", content: [
          { type: "text", text:
            "Analyze these frames. Estimate seconds for backswing/pause/downswing and overall ratio. " +
            "Assign 9 flags for P1..P9. Then list Top 3 Work-On and Top 3 Power items." },
          ...frames.map(dataUrl => ({ type: "input_image", image_url: dataUrl }))
        ]
      }
    ];

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",               // vision-capable
        input: messages,
        response_format: {             // structured JSON
          type: "json_schema",
          json_schema: { name: "SwingReport", schema, strict: true }
        }
      })
    });

    const j = await r.json();
    if (!r.ok) {
      console.error("OpenAI error:", j);
      return res.status(500).json({ error: j.error || "OpenAI error" });
    }

    // Extract structured output
    let payload = j.output?.[0]?.content?.[0]?.text
               || j.choices?.[0]?.message?.content;
    if (typeof payload === "string") payload = JSON.parse(payload);

    const report = payload || {};
    report.id = id;

    res.setHeader("Cache-Control","no-store");
    return res.status(200).json(report);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
}
