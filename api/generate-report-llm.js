export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const { report = {}, goals = [], level = "intermediate" } =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    // --- Lightweight guard so route works even if OPENAI_API_KEY is absent
    const hasKey = !!process.env.OPENAI_API_KEY;

    // Tone per level
    const tone = {
      beginner:      "plain, helpful, avoid jargon, short sentences",
      intermediate:  "coaching tone, some terminology, clear steps",
      advanced:      "technical, biomechanics-aware, detailed cues"
    }[level] || "coaching tone";

    // (A) build a robust prompt for P1–P9, coaching card, consistency & summary
    const prompt = `
You are a PGA-level coach. Personalize this golf swing report. Keep it factual, concise and useful.
Audience tone: ${tone}
Player goals: ${goals.join(", ") || "not stated"}

INPUT REPORT (JSON):
${JSON.stringify(report).slice(0, 12000)}

Write JSON with this shape:
{
 "coachingCard": {
   "topPriorityFixes": ["...", "...", "..."],
   "topPowerFixes": ["...", "...", "..."]
 },
 "consistency": {
   "position": { "score": 60-95, "note": "1–2 sentences" },
   "swing":    { "score": 60-95, "note": "1–2 sentences" }
 },
 "p1p9": [   // keep 9 items in order
   {
     "id":"P1","name":"Address","grade":"good|ok|needs help",
     "short":"1-line useful description",
     "long":"3–6 lines, concrete, personalized, include 1 actionable cue",
     "video":"YouTube search URL that matches the checkpoint"
   },
   ...
 ],
 "summary": {
   "whatYouDoWell": ["bullet", "bullet"],
   "needsAttention": ["bullet", "bullet"],
   "goals": ["bullet", "bullet"]
 }
}
Return ONLY JSON.
    `.trim();

    // (B) If we have a key, call the LLM. Else, fall back to a deterministic stub so the flow still works.
    let enriched;
    if (hasKey) {
      // Use OpenAI Responses API (works with o3 or gpt-4o-mini)
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: prompt,
          temperature: 0.6
        })
      });
      const data = await r.json();
      const text = data?.output?.[0]?.content?.[0]?.text || data?.choices?.[0]?.message?.content || "{}";
      enriched = JSON.parse(text);
    } else {
      // Safe fallback: create something reasonable so the UI isn’t empty in dev
      enriched = {
        coachingCard: {
          topPriorityFixes: ["Neutralize grip pressure", "Match shaft and hand plane", "Keep trail heel grounded to P5"],
          topPowerFixes: ["Later wrist set", "Stronger lead-leg brake", "Tempo 3:1 metronome"]
        },
        consistency: {
          position: { score: 72, note: "Setup repeatable; small drift late." },
          swing: { score: 70, note: "Sequence holds; timing slips under max effort." }
        },
        p1p9: (report.p1p9 || []).map((p,i) => ({
          id: p.id || `P${i+1}`,
          name: p.name || `P${i+1}`,
          grade: p.grade || ["good","ok","needs help"][i%3],
          short: p.short || "Short AI hint.",
          long:  p.long  || "Longer AI explanation with 1+ concrete drills.",
          video: p.video || `https://www.youtube.com/results?search_query=${encodeURIComponent((p.name||`P${i+1}`)+" golf checkpoint")}`
        })),
        summary: {
          whatYouDoWell: ["Ground-up sequencing", "Balanced finish"],
          needsAttention: ["Lead-wrist structure at P4", "Face-to-path control through P7"],
          goals: goals.length ? goals : ["Tempo 3:1", "Swing plane"]
        }
      };
    }

    // (C) Merge with incoming report
    const merged = {
      ...report,
      level,
      goals,
      coachingCard: enriched.coachingCard,
      consistency: enriched.consistency,
      p1p9: enriched.p1p9,
      summary: enriched.summary
    };

    res.status(200).json({ enhanced: true, report: merged });
  } catch (err) {
    res.status(500).json({ error: "AI route failed", detail: String(err) });
  }
}
