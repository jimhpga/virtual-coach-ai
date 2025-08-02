// /api/analyze.js
export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing (Production). Redeploy after adding in Vercel.' });

    // body may be object or string
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
    const { id, frames } = body || {};
    if (!id || !Array.isArray(frames) || frames.length < 3) {
      return res.status(400).json({ error: 'missing id or frames (need >=3)' });
    }

    const imgs = frames.slice(0, 6); // keep request small

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
        pFlags: { type: "array", items: { type: "string", enum: ["g","y","r"] }, minItems: 9, maxItems: 9 },
        top3WorkOn: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        top3Power:  { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 }
      },
      required: ["id","tempo","pFlags","top3WorkOn","top3Power"],
      additionalProperties: false
    };

    const input = [
      {
        role: "user",
        content: [
          { type: "input_text",
            text:
`Analyze these frames of a single golf swing.
Return:
- tempo (backswing, pause, downswing in seconds; ratio as a number like 3.0)
- flags for P1..P9 using g/y/r (g=Good, y=Okay, r=Needs Work)
- Top 3 Things to Work On (short phrases)
- Top 3 Power Things to Work On (short phrases)
Strictly match the JSON schema.` },
          ...imgs.map((dataUrl) => ({ type: "input_image", image_url: { url: dataUrl } }))
        ]
      }
    ];

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        input,
        response_format: { type: 'json_schema', json_schema: { name: 'SwingReport', schema, strict: true } }
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data?.error || data || 'OpenAI error' });

    let payload = data.output?.[0]?.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? null;
    if (!payload) return res.status(500).json({ error: 'No JSON payload from OpenAI' });

    let report;
    try { report = typeof payload === 'string' ? JSON.parse(payload) : payload; }
    catch (e) { return res.status(500).json({ error: 'Invalid JSON from OpenAI', detail: String(e) }); }

    report.id = String(id);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(report);
  } catch (e) {
    return res.status(500).json({ error: 'Handler exception', detail: String(e) });
  }
}
