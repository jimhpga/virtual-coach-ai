module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/app/api/full-swing-report/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
;
;
const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
    apiKey: process.env.OPENAI_API_KEY
});
const runtime = "nodejs";
async function POST(req) {
    try {
        const body = await req.json().catch(()=>({}));
        const { playerName = "Player", age = "", handicap = "", typicalBallFlight = "", typicalMiss = "", goals = "", notes = "" } = body || {};
        const userSummary = `
Player name: ${playerName}
Age: ${age}
Handicap / scoring: ${handicap}
Typical ball flight: ${typicalBallFlight}
Typical miss: ${typicalMiss}
Goals: ${goals}
Extra notes from player or coach: ${notes}
`.trim();
        const systemPrompt = `
You are an experienced golf coach creating a structured full-swing report for a serious amateur player.

***VOICE & TONE***
- Talk like a coach to one player.
- Direct, positive, honest.
- Short sentences, but real detail.
- Talk to the player as "you".

***P1–P9 CHECKPOINTS***
You MUST create EXACTLY 9 checkpoints mapped to:

P1 – Setup / address  
P2 – Takeaway  
P3 – Lead arm parallel / early backswing  
P4 – Top of backswing  
P5 – Early downswing  
P6 – Delivery position (shaft parallel on downswing)  
P7 – Impact  
P8 – Early follow-through  
P9 – Finish / full follow-through  

Each checkpoint's "phase" should read like "P3 – Lead arm parallel / early backswing".

***JSON SHAPE (ONLY JSON, NO MARKDOWN)***

{
  "playerOverview": string,
  "scores": {
    "overall": number,
    "power": number,
    "reliability": number,
    "consistency": number
  },
  "strengths": string[],
  "leaks": string[],
  "topFixes": string[],
  "checkpoints": [
    {
      "id": string,
      "label": string,
      "status": "ON_TRACK" | "NEEDS_ATTENTION" | "PRIORITY",
      "phase": string,
      "coachNotes": string,
      "commonMisses": string[],
      "keyDrills": string[]
    }
  ],
  "practicePlan14Day": string[]
}

***LENGTH & CONTENT RULES***

Player overview:
- 2 short paragraphs.
- 8–12 sentences total.
- Paragraph 1: clear picture of where their game is now (ball flight, miss, strengths, typical patterns).
- Paragraph 2: HOW you will help them get better – the main priorities, what to focus on, and what it should do for their ball flight and scoring.

Checkpoints (P1–P9):
- "coachNotes": 3–5 sentences each.
- Explain what you see now, what “good” looks like, and 1–2 feels to chase.
- Tie to ball flight/contact whenever it makes sense.

Strengths / leaks / top fixes:
- "strengths": 3–5 specific bullets.
- "leaks": 3–5 bullets showing where they lose strokes.
- "topFixes": EXACTLY 3 items in priority order – these are the three biggest "power moves".

Practice plan:
- 12–14 one-line items, each a realistic 15–20 minute session.

Scores (VERY IMPORTANT):
- Think of a typical serious amateur. Most scores should land between 45 and 85.
- "overall" roughly reflects their mix of strengths and leaks.
- "power" is about distance potential and quality of strike.
- "reliability" is about how repeatable the motion is under pressure.
- "consistency" is about controlling start line, curve, and contact.
- DO NOT hand out 90+ unless you clearly describe an elite-level pattern.
- Make sure the scores match the story you tell. If you say reliability is a weakness, keep that number lower (for example 45–65).
`.trim();
        const userPrompt = `
Using this player context, generate a full swing report in JSON only:

${userSummary}
`.trim();
        const response = await client.responses.create({
            model: "gpt-4.1-mini",
            input: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ]
        });
        const first = response.output[0];
        let rawText = "";
        if (first.type === "message") {
            const contentItem = first.content.find((c)=>c.type === "output_text");
            if (contentItem?.text) {
                rawText = contentItem.text;
            }
        }
        if (!rawText) {
            throw new Error("No text returned from model");
        }
        rawText = rawText.trim();
        if (rawText.startsWith("```")) {
            rawText = rawText.replace(/```json/i, "").replace(/```$/, "").trim();
        }
        let report;
        try {
            report = JSON.parse(rawText);
        } catch (err) {
            console.error("Failed to parse JSON from model:", rawText);
            throw new Error("Model did not return valid JSON");
        }
        // Safety: enforce exactly 9 checkpoints (P1–P9)
        if (report.checkpoints.length > 9) {
            report.checkpoints = report.checkpoints.slice(0, 9);
        } else if (report.checkpoints.length < 9) {
            while(report.checkpoints.length < 9){
                const idx = report.checkpoints.length + 1;
                report.checkpoints.push({
                    id: `p${idx}`,
                    label: `Checkpoint P${idx}`,
                    status: "NEEDS_ATTENTION",
                    phase: `P${idx}`,
                    coachNotes: "Placeholder checkpoint added to keep the report structure consistent.",
                    commonMisses: [],
                    keyDrills: []
                });
            }
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true,
            report
        });
    } catch (err) {
        console.error("full-swing-report error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: err?.message || "Unknown error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__a079f940._.js.map