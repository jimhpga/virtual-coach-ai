// /api/analyze.js — returns full contract with mock data so UI is complete today
export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY (prod)');
    return res.status(500).json({ error: 'Server not configured: OPENAI_API_KEY missing' });
  }

  const cid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);

  // read body
  let bodyText = '';
  try {
    await new Promise((ok, err) => {
      req.on('data', c => (bodyText += c));
      req.on('end', ok);
      req.on('error', err);
    });
  } catch {
    return res.status(400).json({ error: 'Failed to read request body', cid });
  }

  // parse
  let payload;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch (e) {
    console.error('[analyze] bad JSON', e?.message, { cid });
    return res.status(400).json({ error: 'Invalid JSON body', cid });
  }
  if (!payload?.videoUrl) return res.status(400).json({ error: 'Missing videoUrl', cid });

  // selections optional
  const selections = payload.selections || { club: '7I', model: 'analysis-v1', dataset: 'baseline' };

  try {
    // TODO: replace with real OpenAI call later; keep output shape identical
    const data = {
      id: payload.id || cid,
      profile: `${selections.club} session — ${selections.dataset}`,
      tempo: '3:1',
      totals: { fairways: 8, greens: 11, putts: 30, swingSpeedAvg: 101, power: 82 },
      metrics: { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6, P7: 7, P8: 8, P9: 9 },
      fixesTop3: [
        'Keep head steady through P3',
        'Smooth transition at P4 (no rush)',
        'Extend through impact to P8'
      ],
      powerAssessment: 'Solid base; add 2–3 mph with better ground use and cleaner kinematic sequence.',
      powerTop3: [
        'Post into lead side earlier',
        'Stronger trail arm fold at P3–P4',
        'Finish fully rotated (belly button to target)'
      ],
      lessons14Days: [
        'Day 1: Tempo drill 3:1 with metronome — 15 mins',
        'Day 2: Mirror checkpoints P1–P3 — 10 mins',
        'Day 3: Transition pause at P4 — 50 swings',
        'Day 4: Lead side post — step drill',
        'Day 5: Impact bag — hands ahead at P7',
        'Day 6: Finish hold 3s — balance check',
        'Day 7: Combine: tempo + transition',
        'Day 8: Alignment + start line gates',
        'Day 9: Low point control — towel drill',
        'Day10: Trail arm fold/extend reps',
        'Day11: Speed ladder — 5×10 swings',
        'Day12: Target practice — 9 boxes',
        'Day13: Simulated round — 9 holes',
        'Day14: Retest + video compare'
      ],
      images: {}, // wire later
      selections
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (e) {
    console.error('[analyze] fail', { cid, msg: e?.message });
    return res.status(500).json({ error: 'Report generation failed', cid });
  }
}
