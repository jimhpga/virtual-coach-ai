// api/generate-report-llm.js
export const config = { runtime: "nodejs" };

function safeJson(input) {
  try {
    if (!input) return {};
    if (typeof input === "string") return JSON.parse(input);
    return input;
  } catch {
    return {};
  }
}

function stripFences(s) {
  if (typeof s !== "string") return s;
  return s.replace(/^\s*```json\s*/i, "").replace(/^\s*```\s*$/i, "");
}

async function openaiJsonCompletion({ model, system, user }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`OpenAI ${r.status}: ${txt.slice(0, 200)}`);
  }

  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content || "{}";
  const clean = stripFences(raw);
  return safeJson(clean);
}

const SYSTEM = `
You are a senior golf coach who writes *strict JSON*. 
You enhance a base swing report for a student using expert voices (Butch Harmon, Jim McLean, Dr. Kwon, Dave Tutelman).
Output JSON only—no prose, no markdown.

Return ONLY these keys when present:
{
  "topPriorityFixes": string[],           // 1–3 items
  "topPowerFixes": string[],              // 1–3 items
  "positionConsistency": { "notes": string },
  "swingConsistency": { "notes": string },
  "power": { "score": number, "tempo": string, "release_timing": number }, // 0–100; tempo like "3:1"
  "p1p9": [
     { "id": "P1", "name": "Address", "grade": "good|ok|needs help",
       "short": "concise coaching point",
       "long": "longer actionable coaching notes",
       "video": "https://... (optional)" },
     …
  ],
  "practicePlan": [
    { "day": number, "title": string, "items": string[] } // 10–14 days, small focused blocks
  ]
}

Personalize to the student (handedness, eye, height, handicap) if provided. 
Be specific but concise; no medical claims; avoid brand names. 
Always produce valid JSON that matches the shape above (omit keys you cannot infer).
`;

function userPromptFromReport(report) {
  const summary = {
    meta: report?.meta || {},
    power: report?.power || { score: report?.swingScore ?? 80 },
    p1p9: report?.p1p9 || [],
    faults: report?.faults || [],
    note: report?.note || "",
  };

  return `
Base swing report (JSON):
${JSON.stringify(summary, null, 2)}
`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = safeJson(req.body);
    const report = body?.report || {};

    const enhanced = await openaiJsonCompletion({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      system: SYSTEM,
      user: userPromptFromReport(report),
    });

    // Return *only* the enhancement object; saver merges safely
    return res.status(200).json(enhanced || {});
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: String(e?.message || e),
      hint:
        "Ensure OPENAI_API_KEY is set and that incoming report JSON is not empty.",
    });
  }
}

