import type { NextApiRequest, NextApiResponse } from "next";

type ReqBody = {
  notes?: string;
  club?: string;
  handedness?: string;
  eye?: string;
  level?: string;
};

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    // Try to salvage the first JSON object in the string
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const chunk = s.slice(start, end + 1);
      return JSON.parse(chunk);
    }
    // Final fallback: return minimal safe payload
    return {
      summary: {
        intro: "I can’t reliably read the response I generated — so I’m not going to guess.",
        diagnosis: "",
        advice: "Please re-submit and tell me your typical miss (push/pull/slice/hook/thin/fat).",
        questions: ["What is your most common miss lately?"]
      },
      three_good: [],
      three_help: [],
      three_power_leaks: [],
      confidence: { level: "LOW", reason: "Model returned invalid JSON." },
      camera_quality: { status: "WARN", reason: "No camera analysis available yet.", tips: [] }
    };
  }
}

function normalizeAiPayload(x: any) {
  const level = (x?.confidence?.level || x?.confidence || "MEDIUM").toString().toUpperCase();

  const intro = x?.summary?.intro ?? x?.intro ?? "";
  const diagnosis = x?.summary?.diagnosis ?? x?.diagnosis ?? "";
  const advice = x?.summary?.advice ?? x?.advice ?? "";

  const questions = (x?.summary?.questions ?? x?.questions ?? []).filter(Boolean);

  const three_good = (x?.three_good ?? x?.threeGood ?? x?.strengths ?? []).filter(Boolean).slice(0, 3);
  const three_help = (x?.three_help ?? x?.threeHelp ?? x?.improvements ?? []).filter(Boolean).slice(0, 3);
  const three_power_leaks = (x?.three_power_leaks ?? x?.threePowerLeaks ?? x?.powerLeaks ?? []).filter(Boolean).slice(0, 3);

  const camera_quality = x?.camera_quality ?? x?.cameraQuality ?? {
    status: "WARN",
    reason: "Camera analysis not enabled yet.",
    tips: ["Down-the-line: camera hand-high, aimed at hands.", "Face-on: camera chest-high, aimed at sternum."]
  };

  // Enforce your “don’t guess” rule
  if (level === "LOW") {
    return {
      ...x,
      confidence: { level: "LOW", reason: x?.confidence?.reason || x?.reason || "Not enough info to be confident." },
      summary: {
        intro: intro || "I’m not confident enough to diagnose this safely yet.",
        diagnosis: diagnosis || "",
        advice: advice || "I don’t want to guess and accidentally make you worse. Answer the quick question(s) below and I’ll tighten the diagnosis.",
        questions: questions.length ? questions.slice(0, 2) : ["What is your most common miss right now?", "Is this down-the-line or face-on?"]
      },
      three_good,
      three_help,
      three_power_leaks,
      camera_quality
    };
  }

  return {
    ...x,
    confidence: { level, reason: x?.confidence?.reason || x?.reason || "" },
    summary: {
      intro,
      diagnosis,
      advice,
      questions: Array.isArray(questions) ? questions : []
    },
    three_good,
    three_help,
    three_power_leaks,
    camera_quality
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = (process.env.OPENAI_API_KEY || "").trim().replace(/^["']+|["']+$/g, "");
  if (!key) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  const body = (req.body || {}) as ReqBody;

  const system = [
    "You are Virtual Coach AI, a golf instructor.",
"Adjust explanations, drills, and language to the player's level (Beginner, Intermediate, Advanced, Tour).",
    "CRITICAL RULE: If you are not confident, say so clearly and ask 1-2 short questions to clarify before diagnosing.",
    "Never guess a diagnosis that could make the player worse.",
    "Write the summary longer than a tweet: intro, diagnosis, advice must feel complete and helpful.",
    "Output must be JSON ONLY. No backticks. No extra text."
  ].join(" ");

  const user = {
    context: {
  club: body.club || "",
  handedness: body.handedness || "",
  eye: body.eye || "",
  level: body.level || ""
},
    player_request: (body.notes || "").trim()
  };

  const outputShape = {
    summary: {
      intro: "2-4 sentences: expectations + what we’re assessing from the info provided.",
      diagnosis: "4-6 sentences: likely issues + why (avoid certainty unless confident).",
      advice: "4-6 sentences: priorities + what to feel/see next + 1 simple test/check.",
      questions: ["If LOW confidence: ask 1-2 questions here. Otherwise empty array."]
    },
    three_good: ["string", "string", "string"],
    three_help: ["string", "string", "string"],
    three_power_leaks: ["string", "string", "string"],
    confidence: { level: "HIGH|MEDIUM|LOW", reason: "string" },
    camera_quality: { status: "PASS|WARN|FAIL", reason: "string", tips: ["string"] }
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ input: user, output_shape: outputShape }) }
        ]
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(500).json({ error: "OpenAI HTTP error", detail: txt });
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content || "{}";
    const parsed = safeJsonParse(content);
    const normalized = normalizeAiPayload(parsed);

    return res.status(200).json({ ok: true, data: normalized });
  } catch (e: any) {
    return res.status(500).json({ error: "Server error", detail: e?.message || String(e) });
  }
}







