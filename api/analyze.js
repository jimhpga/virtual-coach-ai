// /api/analyze.js — Chat Completions (vision) + forced JSON output
// Requirements:
// 1) Vercel Project → Settings → Environment Variables → OPENAI_API_KEY = sk-...
// 2) Client posts: { id: string, frames: string[dataURL][] } (3–9 frames; we'll clip to 6)
// 3) Frontend reads the JSON and renders it (tempo, pFlags, top3 lists)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Use POST' });
  }

  // --- Read raw JSON body (safe on Vercel) ---
  let bodyText = '';
  try {
    await new Promise((resolve, reject) => {
      req.on('data', (c) => (bodyText += c));
      req.on('end', resolve);
      req.on('error', reject);
    });
  } catch {
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  let payload;
  try {
    payload = JSON.parse(bodyText || '{}');
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { id, frames } = payload || {};
  if (!id || !Array.isArray(frames) || frames.length < 3) {
    return res.status(400).json({ error: 'missing id or frames (need >=3)' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY env var' });
  }

  // --- Keep payload modest to avoid 413s and image parsing errors ---
  const clipped = frames.slice(0, 6); // take first 6 frames
  const userContent = [
    {
      type: 'text',
      text:
        'Analyze these frames of a SINGLE golf swing. Return ONLY JSON with this shape:\n' +
        '{ "id": "string", "tempo": {"backswing": number, "pause": number, "downswing": number, "ratio": number}, ' +
        '"pFlags": ["g"|"y"|"r", x9], "top3WorkOn": [string, x3], "top3Power": [string, x3] }'
    }
  ];
  // detail:"low" helps the model accept smaller/compressed images
  for (const dataUrl of clipped) {
    userContent.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'low' } });
  }

  const systemPrompt =
    'You are a golf swing analyst. Given 3–9 key frames from ONE swing, estimate tempo in seconds (backswing, pause, downswing) ' +
    'and overall ratio, set 9 flags for P1..P9 (g=Good, y=Okay, r=Needs Work), and list Top 3 Things to Work On and Top 3 Power Things to Work On. ' +
    'Be conservative and consistent. Return ONLY valid JSON with keys: id, tempo{backswing,pause,downswing,ratio}, pFlags[9], top3WorkOn[3], top3Power[3].';

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' }, // force pure JSON
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 500
      })
    });

    const text = await r.text();
    if (!r.ok) {
      // Bubble exact OpenAI error to client so we can see it
      return res.status(500).json({ error: 'OpenAI error', detail: text });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res
        .status(500)
        .json({ error: 'Invalid JSON from OpenAI', detail: text.slice(0, 500) });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res
        .status(500)
        .json({ error: 'No content from model', detail: JSON.stringify(data).slice(0, 500) });
    }

    let report;
    try {
      report = JSON.parse(content);
    } catch {
      if (typeof content === 'object') report = content;
      else
        return res
          .status(500)
          .json({ error: 'Model did not return JSON', detail: content.slice(0, 500) });
    }

    report.id = id; // ensure id round-trips
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(report);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
