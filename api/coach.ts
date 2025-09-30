import "dotenv/config";
import OpenAI from "openai";
import { loadSystemPrompt } from "../ai/prompt.js";
import { CoachOut } from "../ai/schemas.js";

// Vercel Serverless Function (Node)
// POST /api/coach with JSON body = your facts object
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" }); return;
  }

  const facts = req.body || {};
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const system = loadSystemPrompt();

  const resp = await client.responses.create({
    model: process.env.VCAI_MODEL_REASON || "gpt-4.1-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(facts) }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "VCAI_CoachOut",
        // Use Zod's runtime schema as JSON
        schema: JSON.parse(CoachOut.toString())
      }
    },
    temperature: 0.3
  });

  const text = resp.output_text ?? "{}";
  let json;
  try { json = JSON.parse(text); }
  catch { return res.status(500).json({ error: "Invalid JSON from model" }); }

  const parsed = CoachOut.safeParse(json);
  if (!parsed.success) {
    return res.status(500).json({ error: "Schema failed", details: parsed.error.message });
  }
  res.status(200).json(parsed.data);
}
