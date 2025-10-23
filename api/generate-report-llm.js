export const config = { runtime: "edge" };

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req) {
  try {
    const body = await req.json();
    const report = body.report || {};
    const player = report.meta || {};
    const level = player.level || "intermediate"; // beginner | intermediate | advanced
    const focus = player.focus || "overall swing improvement";

    const prompt = `
You are an elite golf instructor combining Jim Hartnett, Dr. Kwon, Butch Harmon, and Dave Tuttleman.
Generate a highly personalized swing report based on this data:

Player info:
- Level: ${level}
- Focus: ${focus}
- Height: ${player.height || "unknown"}
- Handed: ${player.handed || "right"}
- Eye dominance: ${player.eye || "unknown"}
- Swing Score: ${report.swingScore || "unknown"}

Requirements:
1. Write a detailed summary (2–3 paragraphs) of their current swing strengths, weaknesses, and key improvement themes.
2. Create 3 Priority Fixes and 3 Power Fixes with concise titles, a short version (3 lines max), and a longer expanded “why/how” version.
3. Identify 3 Power Leaks with biomechanical explanation (e.g., early release, lead leg brake, torso timing).
4. Include a realistic 14-day Practice Plan with drills, structure, and focus progression.
5. Use natural coaching tone, avoid robotic phrasing.
6. Match depth to the player’s level (${level}): Beginner = simple, Advanced = biomechanical.

Return JSON with this exact structure:
{
  "summary": "...",
  "topPriorityFixes": [
    {"title":"...", "why":"...", "how":"..."}
  ],
  "topPowerFixes": [
    {"title":"...", "why":"...", "how":"..."}
  ],
  "powerLeaks": [
    {"title":"...", "why":"...", "how":"..."}
  ],
  "practicePlan": [
    {"day":1, "title":"...", "items":["...", "..."] }
  ]
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-5",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are Virtual Coach AI, a professional golf coach with biomechanical expertise." },
        { role: "user", content: prompt }
      ]
    });

    const data = JSON.parse(completion.choices[0].message.content || "{}");
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
