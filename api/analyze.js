// /api/analyze.js — Chat Completions (vision) → rich JSON with short+long notes per P1–P9
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Use POST' });
  }

  // ---- read raw body ----
  let bodyText = '';
  try {
    await new Promise((ok, err) => {
      req.on('data', c => (bodyText += c));
      req.on('end', ok);
      req.on('error', err);
    });
  } catch {
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  let payload;
  try { payload = JSON.parse(bodyText || '{}'); }
  catch { return res.status(400).json({ error: 'Invalid JSON body' }); }

  const { id, frames, handed, eye } = payload || {};
  if (!id || !Array.isArray(frames) || frames.length < 3) {
    return res.status(400).json({ error: 'missing id or frames (need >=3)' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY env var' });
  }

  const handedness = (handed === 'left' || handed === 'right') ? handed : 'right';
  const eyeDom     = (eye === 'left' || eye === 'right') ? eye : 'unknown';

  const contextLine =
    `Player is ${handedness.toUpperCase()}-HANDED` +
    (eyeDom !== 'unknown' ? ` and ${eyeDom.toUpperCase()}-EYE DOMINANT.` : '.') +
    ' Adjust expectations accordingly: ' +
    (handedness === 'right'
      ? 'for RIGHT-handed, reference standard P1–P9; '
      : 'for LEFT-handed, mirror P1–P9; ') +
    (eyeDom === 'right'
      ? 'Right-eye dominant: shoulder turn ≤~90°, smaller head rotation on backswing, nose slightly in front of the ball at impact. '
      : eyeDom === 'left'
        ? 'Left-eye dominant: tolerates larger shoulder turn/head rotation while maintaining ball focus. '
        : 'If eye dominance unknown, use neutral expectations. ');

  // ---- schema hint (now with short+long notes per checkpoint) ----
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

  const systemPrompt =
    'You are a golf swing analyst. Use the provided frames from ONE swing to estimate tempo (seconds), assess P1–P9 with status + short + long notes, and produce concise, actionable coaching. ' +
    'Flags: g=Good, y=Okay, r=Needs Work. Be conservative, specific, and consistent. ' +
    contextLine + schemaHint +
    'Do NOT include commentary outside the JSON. If uncertain, pick the closest flag and write short+long notes.';

  // ---- user content (images) ----
  const clipped = frames.slice(0, 6);
  const userContent = [{ type: 'text', text: 'Analyze these frames and return ONLY the JSON described.' }];
  for (const dataUrl of clipped) {
    userContent.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'low' } });
  }

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
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent }
        ],
        max_tokens: 1100
      })
    });

    const text = await r.text();
    if (!r.ok) return res.status(500).json({ error: 'OpenAI error', detail: text });

    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(500).json({ error: 'Invalid JSON from OpenAI', detail: text.slice(0, 600) }); }

    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(500).json({ error: 'No content from model', detail: JSON.stringify(data).slice(0, 600) });

    let report;
    try { report = JSON.parse(content); }
    catch {
      if (typeof content === 'object') report = content;
      else return res.status(500).json({ error: 'Model did not return JSON', detail: content.slice(0, 600) });
    }

    report.id = id;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(report);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
