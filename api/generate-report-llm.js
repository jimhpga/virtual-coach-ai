// api/generate-report-llm.js
export const config = { runtime: 'nodejs' };

import OpenAI from 'openai';

/**
 * Expected POST body:
 * {
 *   report: { ...existing report json... },   // required-ish
 *   level: "beginner" | "intermediate" | "advanced",  // optional
 *   focusAreas: ["swing_plane","hand_path", ...],      // optional []
 *   save: false                                      // optional (unused here)
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const report = body.report || {};
    const level = (body.level || report?.meta?.level || 'intermediate')
      .toString()
      .toLowerCase();
    const focusAreas = Array.isArray(body.focusAreas) ? body.focusAreas : [];

    // ---------- If no API key, return a deterministic "sample" ------------
    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json(buildFallback(report, level, focusAreas));
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = [
      'You are Virtual Coach AI, a tour-level instructor.',
      'Blend insights from Jim Hartnett, Jim McLean, Butch Harmon, Dr. Kwon, and Dave Tutelman.',
      'Write in the style that matches the golfer level: beginner = very plain, intermediate = practical coaching with light biomechanics, advanced = technical/biomechanics forward.',
      'Always personalize. Use the existing report fields when present (power tempo release, notes, name, height, handed, p1p9 array).',
      'Focus on actionable tips; tie suggestions to the chosen focus areas if provided.',
      'Return **only** valid JSON matching the schema specified in the user message.',
    ].join(' ');

    const schema = `
Return a single JSON object with this shape:
{
  "topPriorityFixes": [string, string, string],     // 0-3 items
  "topPowerFixes": [string, string, string],        // 0-3 items
  "consistency": {
    "position": { "score": number, "notes": string },
    "swing": { "score": number, "notes": string }
  },
  "power": {
    "score": number,            // 0-100
    "tempo": string,            // e.g. "3:1"
    "release_timing": number    // 0-100
  },
  "p1p9": [
    {
      "id": "P1",
      "name": "Address",
      "grade": "ok|good|needs help|excellent",
      "short": "1-2 sentence short label",
      "long": "3-7 sentence expanded explanation, personalized",
      "video": "https://youtube.com/... (search hint is fine)"
    }
    // ... P2..P9
  ],
  "practicePlan": [
    {
      "day": 1,
      "title": "short drill title",
      "items": ["bullet","bullet"]
    }
    // 10-14 days preferred
  ],
  "swingSummary": {
    "whatYouDoWell": [string,string,string],
    "needsAttention": [string,string,string],
    "goals": [string,string,string],
    "paragraph": "1-3 paragraphs summarizing the swing and priorities"
  },
  "meta": {
    "level": "beginner|intermediate|advanced"       // echo what you used
  }
}
`;

    const user = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: [
            'Here is the current report JSON (may be partial). Use it to personalize.',
            'Then return a fully fleshed-out JSON object in the EXACT schema below.',
            '',
            `Golfer level to use: ${level}`,
            `Focus areas to emphasize (optional): ${focusAreas.join(', ') || 'none supplied'}`,
            '',
            '--- CURRENT REPORT JSON START ---',
            JSON.stringify(report, null, 2),
            '--- CURRENT REPORT JSON END ---',
            '',
            schema
          ].join('\n')
        }
      ]
    };

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        user
      ]
    });

    let json;
    try {
      json = JSON.parse(resp.choices?.[0]?.message?.content || '{}');
    } catch (e) {
      json = buildFallback(report, level, focusAreas);
      json._warn = 'LLM JSON parse failed; returned fallback.';
    }

    // Merge light power defaults if missing
    if (!json.power) {
      json.power = {
        score: Number(report.swingScore ?? 72) || 72,
        tempo: report.power?.tempo || '3:1',
        release_timing: Number(report.power?.release_timing ?? 60) || 60
      };
    }

    // Echo level in meta
    json.meta = { ...(json.meta || {}), level };

    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

function buildFallback(report = {}, level = 'intermediate', focusAreas = []) {
  const lvlNote = level === 'beginner'
    ? 'Simple cues first; minimal jargon.'
    : level === 'advanced'
    ? 'More technical language and biomechanical detail.'
    : 'Balanced coaching with light biomechanics.';

  const focus = focusAreas.length ? `Focus areas requested: ${focusAreas.join(', ')}.` : 'No specific focus areas provided.';

  return {
    topPriorityFixes: [
      'Check alignment and ball position at setup.',
      'Keep lead wrist flatter at P3–P4.',
      'Match face to path through P6–P7.'
    ],
    topPowerFixes: [
      'Add lead-leg braking at transition.',
      'Push vertical force windows (light→medium→full).',
      'Stabilize trail foot pressure longer in backswing.'
    ],
    consistency: {
      position: { score: 72, notes: 'Setup repeatable; small drift late.' },
      swing: { score: 70, notes: 'Sequence mostly holds; timing slips under max effort.' }
    },
    power: {
      score: Number(report.swingScore ?? 78),
      tempo: report?.power?.tempo || '3:1',
      release_timing: Number(report?.power?.release_timing ?? 66)
    },
    p1p9: [
      { id:'P1', name:'Address', grade:'ok', short:'Athletic stance.', long:'Neutral grip and centered weight. Maintain soft knees and balanced foot pressure. Keep chest proud without arching lower back.', video: yt('address golf setup') },
      { id:'P2', name:'Takeaway', grade:'good', short:'One-piece move.', long:'Club outside hands with face square. Keep trail wrist soft so shaft stays on plane rather than fanning open too quickly.', video: yt('golf takeaway on plane') },
      { id:'P3', name:'Lead arm parallel', grade:'ok', short:'Width maintained.', long:'Club parallel to spine. Avoid collapsing trail elbow—hold radius to keep swing arc wide and stable.', video: yt('lead arm parallel checkpoints') },
      { id:'P4', name:'Top', grade:'needs help', short:'Elbow under; face not shut.', long:'Trail elbow should point more down to support shallowing later. Keep face neutral relative to forearm.', video: yt('top of backswing trail elbow down') },
      { id:'P5', name:'Shaft parallel down', grade:'ok', short:'Shallow slightly.', long:'Retain hinge while routing shaft slightly from inside. This reduces across-the-line delivery.', video: yt('shallower downswing drill') },
      { id:'P6', name:'Club parallel before impact', grade:'ok', short:'Handle forward; square face.', long:'Match face-to-path; preserve wrist structure into delivery. Push handle slightly forward to control loft/face.', video: yt('p6 position face to path') },
      { id:'P7', name:'Impact', grade:'good', short:'Forward lean; low point ahead.', long:'Lead side braced with shaft lean. Keep trail foot pressure releasing as chest rotates through.', video: yt('golf impact position drill') },
      { id:'P8', name:'Post impact', grade:'ok', short:'Arms extend; chest rotates.', long:'Let arms extend while torso continues to rotate; avoid early stall/flip.', video: yt('post impact extension drill') },
      { id:'P9', name:'Finish', grade:'ok', short:'Balanced, tall.', long:'Weight fully left; belt buckle to target. Hold finish for two counts for balance training.', video: yt('finish position hold drill') },
    ],
    practicePlan: Array.from({ length: 14 }).map((_, i) => ({
      day: i + 1,
      title: i % 2 ? 'Tempo window + align start line' : 'Mirror P1–P2 + wrist set control',
      items: i % 2
        ? ['Metronome 3:1 for 5 min', 'Start-line stick—10 balls']
        : ['Mirror checkpoint P1–P2 (10m)', 'Set by P2.5; 15 reps']
    })),
    swingSummary: {
      whatYouDoWell: [
        'Ground-up sequencing is solid.',
        'Lag retention into P6 is consistent.',
        'Balanced finish indicates efficient energy use.'
      ],
      needsAttention: [
        'Trail elbow orientation at P4 for shallowing later.',
        'Face-to-path match between P5–P6 under speed.',
        'Lead wrist structure—avoid late flip.'
      ],
      goals: [
        'Sharpen delivery windows (face & start-line).',
        'Increase lead-leg braking at transition.',
        'Build tolerance for speed without timing loss.'
      ],
      paragraph: [
        lvlNote,
        focus,
        'Overall you’re strong from P1 to P3, store energy well to P4, and deliver with good structure. The main gains lie in improving trail-elbow orientation at the top and stabilizing face-to-path at P6 under speed. Use the 14-day plan to reinforce setup precision, then add speed windows and lead-leg braking for a clean, powerful release.'
      ].join(' ')
    },
    meta: { level }
  };
}

function yt(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
