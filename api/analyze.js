// /api/analyze.js — robust JSON, retry on empty content, better errors
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type','application/json');
    return res.status(405).json({ error: 'Use POST' });
  }

  const cid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);

  // --- read raw body ---
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

  let payload;
  try { payload = JSON.parse(bodyText || '{}'); }
  catch { return res.status(400).json({ error: 'Invalid JSON body', cid }); }

  const { id, frames, handed, eye } = payload || {};
  if (!id || !Array.isArray(frames) || frames.length < 3) {
    return res.status(400).json({ error: 'missing id or frames (need >=3)', cid });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY env var', cid });
  }

  // ---- context ----
  const handedness = (handed === 'left' || handed === 'right') ? handed : 'right';
  const eyeDom     = (eye === 'left' || eye === 'right') ? eye : 'unknown';

  const contextLine =
    `Player is ${handedness.toUpperCase()}-HANDED` +
    (eyeDom !== 'unknown' ? ` and ${eyeDom.toUpperCase()}-EYE DOMINANT.` : '.') +
    ' Adjust expectations accordingly: ' +
    (handedness === 'right' ? 'for RIGHT-handed, reference standard P1–P9; ' : 'for LEFT-handed, mirror P1–P9; ') +
    (eyeDom === 'right'
      ? 'Right-eye dominant: shoulder turn ≤~90°, smaller head rotation on backswing, nose slightly in front of the ball at impact. '
      : eyeDom === 'left'
        ? 'Left-eye dominant: tolerates larger shoulder turn/head rotation while maintaining ball focus. '
        : 'If eye dominance unknown, use neutral expectations. ');

  const schemaHint = `
Return ONLY valid JSON with this exact shape:

{
  "id": "string",
  "tempo": { "backswing": number, "pause": number, "downswing": number, "ratio": number },
  "checkpoints": [
    { "id":"P1","title":"Setup","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" },
    { "id":"P2","title":"Shaft Parallel (BS)","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" },
    { "id":"P3","title":"Lead Arm Parallel","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" },
    { "id":"P4","title":"Top","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" },
    { "id":"P5","title":"Lead Arm Parallel (DS)","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" },
    { "id":"P6","title":"Shaft Parallel (DS)","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" },
    { "id":"P7","title":"Impact","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" },
    { "id":"P8","title":"Trail Arm Parallel","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" },
    { "id":"P9","title":"Finish","status":"g|y|r","noteShort":"≤12 words","noteLong":"1–2 sentences" }
  ],
  "top3WorkOn": [
    { "title":"string","why":"one sentence","drill":"concise drill instruction" },
    { "title":"string","why":"one sentence","drill":"concise drill instruction" },
    { "title":"string","why":"one sentence","drill":"concise drill instruction" }
  ],
  "top3Power": [
    { "title":"string","why":"one sentence","drill":"concise drill instruction" },
    { "title":"string","why":"one sentence","drill":"concise drill instruction" },
    { "title":"string","why":"one sentence","drill":"concise drill instruction" }
  ],
  "mostImportant": { "title":"string","why":"one sentence","drill":"concise drill instruction" },
  "powerAssessment": {
    "clubheadSpeedEstimate":"e.g., 84–90 mph (7i) or 95–102 mph (Driver)",
    "kinematicSequence":"g|y|r",
    "lowerBodyEngagement":"g|y|r",
    "notes":["short","bullets"]
  }
}
`;

  const clipped = frames.slice(0, 6); // keep payload modest
  const userContent = [{ type: 'text', text: 'Analyze these frames and return ONLY the JSON described.' }];
  for (const dataUrl of clipped) {
    userContent.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'low' } });
  }

  // helper: parse possibly-messy JSON by extracting the first {...} block
  function smartParseJSON(s) {
    if (typeof s === 'object' && s) return s;
    if (typeof s !== 'string') throw new Error('no-string');
    const start = s.indexOf('{');
    const end   = s.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error('no-braces');
    const core = s.slice(start, end + 1);
    return JSON.parse(core);
  }

  async function callOpenAI({ simple = false }) {
    const systemPrompt = (simple
      ? // SIMPLER retry prompt
        ('Return ONLY JSON. If uncertain, guess conservatively. ' + contextLine + schemaHint)
      : // full prompt
        ('You are a golf swing analyst. Use frames from ONE swing to estimate tempo (seconds), assess P1–P9 with status + short + long notes, and produce concise, actionable coaching. ' +
         'Flags: g=Good, y=Okay, r=Needs Work. Be conservative, specific, and consistent. ' +
         contextLine + schemaHint + 'Do NOT include commentary outside the JSON.')
    );

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        // keep json_object for primary attempt; on retry we'll allow non-JSON and smart-parse
        ...(simple ? {} : { response_format: { type: 'json_object' } }),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent }
        ],
        max_tokens: simple ? 800 : 1000
      })
    });

    const text = await r.text();
    if (!r.ok) {
      const out = { error: 'OpenAI error', status: r.status, detail: text, cid };
      throw out;
    }

    let data;
    try { data = JSON.parse(text); }
    catch { throw { error: 'Invalid JSON from OpenAI', detail: text.slice(0,600), cid }; }

    const msg = data.choices?.[0]?.message || {};
    let content = msg.content;

    // If empty content, attempt alternate places or signal retry
    if (!content || (typeof content === 'string' && content.trim() === '')) {
      // Sometimes models return nothing due to filtering/format. Trigger retry by throwing a marker.
      const fr = data.choices?.[0]?.finish_reason || 'unknown';
      throw { error: 'EMPTY_CONTENT', finish_reason: fr, raw: data, cid };
    }

    // Try strict parse first; if it fails, smart-parse
    try { return { report: JSON.parse(content), raw: data }; }
    catch {
      try { return { report: smartParseJSON(content), raw: data }; }
      catch (e2) { throw { error: 'Parse failure', detail: content?.slice?.(0,600) || 'no content', cid }; }
    }
  }

  try {
    // First attempt: strict JSON mode
    let result;
    try {
      result = await callOpenAI({ simple: false });
    } catch (e) {
      if (e?.error === 'EMPTY_CONTENT') {
        // Retry once: simpler prompt, no response_format, we’ll smart-parse
        try {
          result = await callOpenAI({ simple: true });
        } catch (e2) {
          return res.status(500).json({ error: 'OpenAI (retry) failed', detail: e2, cid });
        }
      } else {
        return res.status(500).json({ error: 'OpenAI failed', detail: e, cid });
      }
    }

    const report = result.report || {};
    report.id = id;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(report);
  } catch (e) {
    return res.status(500).json({ error: 'Analyze failed', detail: e, cid });
  }
}
