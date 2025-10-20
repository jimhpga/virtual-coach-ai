// /api/generate-report-llm.js
export const config = { runtime: "nodejs" };

import { getSimilarPros } from "@/lib/pro-library";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// lightweight “baseline” so we always have tempo/release/mode
function seededBaseline(meta = {}, filename = "") {
  const s = (filename || "").toLowerCase();
  const tempo = /120fps|slow/.test(s) ? "3:1" : "2.8:1";
  const release_timing = /slow/.test(s) ? 68 : 72;
  const arche =
    (meta.height && Number(meta.height) >= 72) ? "Long Levers" :
    (meta.height && Number(meta.height) <= 66) ? "Compact" : "Neutral";
  return {
    parsed: { filename },
    tempo,
    release_timing,
    arche,
    swingScore: 75
  };
}

// force JSON output
const SYSTEM = `
You are Virtual Coach AI, a single expert coach whose knowledge blends modern
biomechanics (Dr. Kwon), swing geometry (Jim McLean), measurement (Dave Tutelman),
and practical tour coaching (Butch Harmon). Your job is to synthesize—not imitate—
and produce a personalized, actionable report.

RULES:
- Output **only valid JSON** that matches the schema provided.
- Incorporate "Pro exemplars" as patterns (width, pressure timing, shallowing, tempo),
  not as identities (never name players or refer to "this pro").
- Mirror instructions for left-handers.
- Keep short blurbs concise; long explanations 1–3 sentences.
- The practice_plan must be 14 days, progressive, and drill-ready.

SCHEMA (return exactly this shape):
{
  "p1p9": [{ "id":"P1..P9", "grade":"good|ok|needs help", "short":"...", "long":"..." }],
  "top_priority_fixes": [ { "title":"...", "why":"...", "how":"(3 bullet steps)" } ],
  "top_power_fixes": [ { "title":"...", "why":"...", "how":"(3 bullet steps)" } ],
  "power": { "score": 0-100, "tempo":"x:x", "release_timing": 0-100 },
  "position_consistency": { "notes": "one line" },
  "swing_consistency": { "notes": "one line" },
  "practice_plan": [
    { "day": 1, "title":"...", "items":["...","..."] },
    ... (days 2–14)
  ]
}
Ensure JSON is minified or pretty; do not wrap in code fences.
`;

async function callOpenAI({ meta, filename, observations }) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const baseline = seededBaseline(meta, filename);
  const proRefs = getSimilarPros({ meta, filename, baseline, k: 4 });

  const userText = `
Student meta: ${JSON.stringify(meta || {}, null, 2)}
Filename clues: ${JSON.stringify(baseline.parsed, null, 2)}

Baseline hints:
${JSON.stringify({
    archetype: baseline.arche,
    swingScore: baseline.swingScore,
    tempo: baseline.tempo,
    release_timing: baseline.release_timing
  }, null, 2)}

Pro exemplars (anonymized; use for patterns only):
${JSON.stringify(proRefs, null, 2)}

Optional observations (from uploader or future vision system):
${JSON.stringify(observations || {}, null, 2)}

Return JSON only (schema above).`;

  // OpenAI Chat Completions (text-only)
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM.trim() },
        { role: "user", content: userText.trim() }
      ]
    })
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OpenAI ${resp.status}: ${txt.slice(0, 400)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const json = safeJson(content);
  if (!json || !json.p1p9) throw new Error("LLM did not return valid schema");
  return json;
}

// tolerant JSON extractor
function safeJson(s) {
  if (!s) return null;
  // strip code fences if any slipped through
  const cleaned = s.replace(/^```json|^```|```$/gim, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  // try to find first/last braces
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { meta = {}, filename = "", observations = {} } = body;

    const out = await callOpenAI({ meta, filename, observations });

    // sanity defaults
    out.power = out.power || {};
    if (!out.power.score) out.power.score = 74;
    if (!out.power.tempo) out.power.tempo = "3:1";
    if (!out.power.release_timing) out.power.release_timing = 68;

    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
