// /api/analyze.js — robust body parsing + clearer errors
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type','application/json');
    return res.status(405).json({ error: 'Use POST' });
  }

  // ---- Parse JSON body safely (Vercel Node fn may not parse for you) ----
  let bodyText = '';
  try {
    await new Promise((resolve, reject) => {
      req.on('data', (c) => (bodyText += c));
      req.on('end', resolve);
      req.on('error', reject);
    });
  } catch (e) {
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  let payload;
  try {
    payload = JSON.parse(bodyText || '{}');
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { id, frames } = payload || {};
  if (!id || !Array.isArray(frames) || frames.length < 3) {
    return res.status(400).json({ error: 'missing id or frames (need >=3)' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY env var' });
  }

  // Keep payload modest (avoid 413/size issues)
  const clipped = frames.slice(0, 6); // cap at 6 frames for now

  const schema = {
    type: "object",
    properties: {
      id: { type: "string" },
      tempo: {
        type: "object",
        properties: {
          backswing: { type: "number" },
          pause:     { type: "number" },
          downswing: { type: "number" },
          ratio:     { type: "number" }
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

  const messages = [
    { role: "system", content:
      "You are a golf swing analyst. Given 3–9 key frames of a single swing, estimate tempo (backswing, pause, downswing, ratio) " +
      "and set P1–P9 flags (g=Good, y=Okay, r=Needs Work). Provide Top 3 Things to Work On and Top 3 Power Things to Work On. " +
      "Be conservative, consistent, and follow the JSON schema strictly." },
    { role: "user", content: [
        { type: "text", text:
          "Analyze these frames. Estimate seconds for backswing/pause/downswing and overall ratio. " +
          "Assign 9 flags for P1..P9. Then list Top 3 Work-On and Top 3 Power items." },
        ...clipped.map(dataUrl => ({ type: "input_image", image_url: dataUrl }))
      ]
    }
  ];

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        input: messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: "SwingReport", schema, strict: true }
        }
      })
    });

    const text = await r.text();
    if (!r.ok) {
      // Return the raw OpenAI error text to help debug in browser/console
      return res.status(500).json({ error: "OpenAI error", detail: text });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: "Invalid JSON from OpenAI", detail: text.slice(0, 500) });
    }

    // Handle both Responses-style and Chat Completions-style payloads
    let payloadOut = data.output?.[0]?.content?.[0]?.text
                  || data.choices?.[0]?.message?.content;

    if (typeof payloadOut === "string") {
      try { payloadOut = JSON.parse(payloadOut); } catch (e) {
        return res.status(500).json({ error: "OpenAI returned non-JSON content", detail: payloadOut.slice(0, 500) });
      }
    }

    const report = payloadOut || {};
    report.id = id;

    res.setHeader("Cache-Control","no-store");
    return res.status(200).json(report);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
