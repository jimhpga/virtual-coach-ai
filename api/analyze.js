export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  }

  // Safely read request body
  let body = '';
  try {
    await new Promise((resolve, reject) => {
      req.on('data', chunk => (body += chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
  } catch {
    return res.status(400).json({ error: 'Failed to read body' });
  }

  let payload = {};
  try {
    payload = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Grab videoUrl or use fallback
  const selections = payload.selections || {};
  let videoUrl = (payload.videoUrl || '').trim();
  if (!videoUrl) {
    videoUrl = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';
  }

  const cid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

  // Call OpenAI
  let ai = null;
  try {
    const prompt = `
Return STRICT JSON ONLY. Format:
{
  "id": "string",
  "profile": "string",
  "tempo": "string",
  "totals": { "fairways": number, "greens": number, "putts": number, "swingSpeedAvg": number, "power": number },
  "metrics": { "P1": number, "P2": number, ..., "P9": number },
  "pstack": {
    "P1": { "condition": "string", "rating": "string", "status": "good|okay|need", "short": "string", "long": "string" },
    ...
    "P9": { ... }
  },
  "tips3": [ "string", "string", "string" ],
  "power": { "score": number, "notes": [ "string", "string", "string" ] },
  "powerTips3": [ "string", "string", "string" ],
  "lessons14": [ "string", ..., "string" ]
}

Only use: "status": good | okay | need
video=${videoUrl}, club=${selections.club || '7I'}, model=${selections.model || 'v1'}
    `.trim();

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return STRICT JSON only, no prose.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    const json = await r.json();
    const text = json?.choices?.[0]?.message?.content || '{}';
    ai = JSON.parse(text);
  } catch (err) {
    console.error('[OpenAI error]', err);
    ai = {
      id: cid,
      profile: 'Auto profile',
      tempo: '3:1',
      totals: { fairways: 8, greens: 12, putts: 30, swingSpeedAvg: 98, power: 82 },
      metrics: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`P${i + 1}`, i + 1])),
      pstack: Object.fromEntries(Array.from({ length: 9 }, (_, i) => {
        const p = `P${i + 1}`;
        return [p, {
          condition: ['Setup','Takeaway','Lead Arm','Top','Transition','Delivery','Impact','Extension','Finish'][i],
          rating: `${6 + (i % 4)}/10`,
          status: ['good', 'okay', 'need'][i % 3],
          short: `Auto short for ${p}`,
          long: `Auto long explanation for ${p}`
        }];
      })),
      tips3: ['Hold finish', 'Shift earlier', 'Extend left'],
      power: { score: 82, notes: ['Strong base', 'Good lag', 'More width at P4'] },
      powerTips3: ['Step drill', '3-ball whip', 'Med ball wall throw'],
      lessons14: Array.from({ length: 14 }, (_, i) => `Day ${i + 1} - Practice block`)
    };
  }

  // Force assign ID
  ai.id = ai.id || cid;

  // Save to Supabase
  let saved = false;
  try {
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE;
    const r = await fetch(`${supaUrl}/rest/v1/reports`, {
      method: 'POST',
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: ai.id, data: ai })
    });

    if (r.ok) saved = true;
    else {
      const t = await r.text();
      console.error('[Supabase save error]', r.status, t);
    }
  } catch (err) {
    console.error('[Supabase error]', err);
  }

  // Return result
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ...ai, _saved: saved, _cid: cid, _videoUrl: videoUrl });
}
