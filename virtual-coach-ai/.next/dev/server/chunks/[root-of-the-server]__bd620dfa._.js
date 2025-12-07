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
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/fs/promises [external] (fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs/promises", () => require("fs/promises"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/src/app/api/swing-report/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$util__$5b$external$5d$__$28$util$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/util [external] (util, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs/promises [external] (fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
;
;
;
const runtime = "nodejs";
const execFileAsync = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$util__$5b$external$5d$__$28$util$2c$__cjs$29$__["promisify"])(__TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["execFile"]);
function safeParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch  {
        const repaired = str.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/“|”/g, '"').replace(/‘|’/g, "'");
        return JSON.parse(repaired);
    }
}
// --- SAMPLE REPORT FALLBACK (for "See sample report" button) ---
const SAMPLE_REPORT = {
    createdAt: new Date().toISOString(),
    overallScore: 76,
    powerScore: 80,
    efficiencyScore: 70,
    consistencyScore: 72,
    dominantMiss: "push_fade",
    summary: "Sample report: solid motion with enough speed, but face and path slightly mismatched, giving you a gentle push–fade. Clean up setup, takeaway depth, and delivery so you can tighten start lines and control curve without losing your natural move.",
    issues: [
        {
            id: "open_face_top",
            title: "Open clubface at the top",
            severity: "high",
            position: "top",
            description: "At the top, the clubface is considerably more open than your lead forearm, making it difficult to square at impact and causing a rightward start line and curve.",
            drills: [
                "Lead wrist bow drill: At the top, rehearse flattening or slightly bowing the lead wrist to match clubface to forearm.",
                "Stick-on-forearm drill: Place a stick along your lead arm and match clubface angle to the stick at the top."
            ]
        },
        {
            id: "steep_down",
            title: "Steep downswing with little face control",
            severity: "high",
            position: "downswing",
            description: "Club shaft gets too steep on the way down, and the face hangs open. That mix sends the ball starting right with a soft fade and occasional wipe–slice.",
            drills: [
                "Wall or chair depth drill: rehearse takeaway so the handle works in while the clubhead stays in front.",
                "Lead wrist tilt drill: three-quarter swings focusing on modest forward shaft lean with a quieter handle exit."
            ]
        },
        {
            id: "strike_high",
            title: "Strike pattern too high on the face",
            severity: "medium",
            position: "impact",
            description: "Contact tends to live slightly high on the clubface, costing ball speed and flattening launch. Combined with the open face it robs you of distance even when the ball finishes in play.",
            drills: [
                "Impact tape or dry-erase dot on the face for 10–15 balls, aiming to stack strikes around the center.",
                "Tee-height ladder drill: Alternate low/normal tee heights to train centered contact."
            ]
        },
        {
            id: "finish_balance",
            title: "Finish balance under pressure",
            severity: "low",
            position: "finish",
            description: "On routine swings your finish is solid, but under pressure you tend to stand up early and lose your posted left side. That’s more of a scoring tendency issue than a mechanics disaster.",
            drills: [
                "3-second hold drill: every shot in practice, freeze your finish until the ball lands.",
                "Pressure ladder: hit 3-ball sets with small targets and hold your finish on every swing."
            ]
        }
    ],
    practicePlanSummary: "Sample 14-day plan: first four days on setup and face control with slow, feedback-rich reps. Days 5–10 blend shallow-and-square delivery with strike work. Days 11–14 take it to the course with one setup key and one delivery key, aiming at windows, not perfect mechanics."
};
// Build the vision prompt for the AI
function buildVisionPrompt() {
    return `
You are VCA Virtual Coach, a tour-level golf coach AI.

You are analyzing a golf swing from 4–6 still frames taken from a face-on or down-the-line video.
Blend the influence of:
- Jim Hartnett ("Golf for the Other 80%"): simple, priority-based, scoring-focused coaching.
- Jim McLean: P-system checkpoints, corridors of success, fault-tree thinking.
- Butch Harmon: ball-flight laws and "don’t wreck what already works".
- Dr. Kwon: ground-force and sequencing.
- Dave Tutelman: light golf-physics influence (spin loft, face/path, gear effect, strike).

The goal:
- Identify the main ball-flight tendencies and delivery pattern.
- Find a short list of 2–3 high-leverage priorities.
- Suggest simple, realistic drills a normal golfer can actually do.

Return ONLY valid JSON matching this TypeScript interface:

interface SwingReport {
  createdAt: string;
  overallScore: number;
  powerScore: number;
  efficiencyScore: number;
  consistencyScore: number;
  dominantMiss: string;
  summary: string;
  issues: {
    id: string;
    title: string;
    severity: "low" | "medium" | "high";
    position:
      | "setup"
      | "backswing"
      | "top"
      | "transition"
      | "downswing"
      | "impact"
      | "finish";
    description: string;
    drills: string[];
  }[];
  practicePlanSummary: string;
}

Guidelines:
- Scores must be between 0 and 100.
- Use 3–5 issues, each with 2–4 concise drills.
- dominantMiss should be a short label like "push_slice", "pull_hook", "thin", "fat", etc.
- Use plain, tour-style but clear language.
- Return JSON only, no backticks or commentary.
`.trim();
}
// Read frames produced by ffmpeg and return an array of base64 strings
async function extractFramesToBase64(inputPath) {
    const tmpDir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(inputPath);
    const framePattern = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(tmpDir, "frame-%02d.jpg");
    // Grab up to 4 frames spread over the clip
    await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-vf",
        "fps=4,scale=640:-1",
        "-vframes",
        "4",
        framePattern
    ]);
    const frames = [];
    for(let i = 1; i <= 4; i++){
        const framePath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(tmpDir, `frame-0${i}.jpg`);
        try {
            const buf = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].readFile(framePath);
            frames.push(buf.toString("base64"));
        } catch  {
            break;
        }
    }
    return frames;
}
async function POST(req) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error("OPENAI_API_KEY is not set on the server.");
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Server misconfiguration: missing OpenAI API key."
            }, {
                status: 500
            });
        }
        const contentType = req.headers.get("content-type") || "";
        // If this is NOT multipart/form-data, treat it as "see sample report"
        if (!contentType.includes("multipart/form-data")) {
            const sample = {
                ...SAMPLE_REPORT,
                createdAt: new Date().toISOString()
            };
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(sample, {
                status: 200
            });
        }
        // --- Handle real video upload ---
        const formData = await req.formData().catch(()=>null);
        const file = formData?.get("video");
        if (!file || typeof file.arrayBuffer !== "function") {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "No video file received in 'video' field."
            }, {
                status: 400
            });
        }
        // Save uploaded video to a temp file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const tmpRoot = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), ".tmp-swing");
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].mkdir(tmpRoot, {
            recursive: true
        });
        const inputPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(tmpRoot, `swing-${Date.now()}.mp4`);
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].writeFile(inputPath, buffer);
        // Extract frames with ffmpeg
        const framesBase64 = await extractFramesToBase64(inputPath);
        if (framesBase64.length === 0) {
            console.error("ffmpeg produced no frames");
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to extract frames from video."
            }, {
                status: 500
            });
        }
        // Build vision messages
        const systemPrompt = buildVisionPrompt();
        const imageParts = framesBase64.map((b64)=>({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${b64}`
                }
            }));
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4.1-mini",
                response_format: {
                    type: "json_object"
                },
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analyze this player's full swing from these frames and generate a SwingReport JSON object."
                            },
                            ...imageParts
                        ]
                    }
                ]
            })
        });
        if (!openaiRes.ok) {
            const text = await openaiRes.text();
            console.error("OpenAI API error:", openaiRes.status, text);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "OpenAI API error.",
                detail: text
            }, {
                status: 500
            });
        }
        const openaiJson = await openaiRes.json();
        const content = openaiJson?.choices?.[0]?.message?.content;
        if (!content) {
            console.error("No content in OpenAI response:", openaiJson);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "No content returned from AI."
            }, {
                status: 500
            });
        }
        let parsed;
        try {
            parsed = safeParseJSON(content);
        } catch (err) {
            console.error("Failed to parse AI JSON:", err, content);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "AI returned invalid JSON.",
                raw: content
            }, {
                status: 500
            });
        }
        // Normalize required fields
        if (!parsed.createdAt) parsed.createdAt = new Date().toISOString();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(parsed, {
            status: 200
        });
    } catch (err) {
        console.error("Error in /api/swing-report:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error.",
            detail: String(err?.message || err)
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__bd620dfa._.js.map