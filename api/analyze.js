// /api/analyze.js — minimal, safe, and loud in logs
export default async function handler(req, res) {
  // 1) Guard: fail fast if OpenAI key missing
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY (prod)');
    return res.status(500).json({ error: 'Server not configured: OPENAI_API_KEY missing' });
  }

  // Correlation id for logs
  const cid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);

  // 2) Read raw body
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

  // 3) Parse + validate
  let payload;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch (e) {
    console.error('[analyze] bad JSON', e?.message, { cid });
    return res.status(400).json({ error: 'Invalid JSON body', cid });
  }
  if (!payload) return res.status(400).json({ error: 'Missing request body', cid });

  const { videoUrl, options } = payload;
  if (!videoUrl) return res.status(400).json({ error: 'Missing videoUrl', cid });

  console.log('[analyze] start', { cid });

  // 4) Core logic
  try {
    // TODO: call OpenAI / your analysis here and produce "data"
    // const result = await runAnalysis({ videoUrl, options });
    // ...convert to data...

    // TEMP: allow test via payload.mock
    const data = payload.mock ?? { metrics: { /* P1..P9 here when ready */ } };

    if (!data || !data.metrics) {
      console.error('[analyze] missing metrics', { cid });
      return res.status(502).json({ error: 'No metrics in response', cid });
    }

    console.log('[analyze] ok', { cid });
    return res.status(200).json(data);
  } catch (e) {
    console.error('[analyze] fail', { cid, msg: e?.message });
    return res.status(500).json({ error: 'Report generation failed', cid });
  }
}
