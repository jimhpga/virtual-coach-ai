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
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[project]/src/app/api/swing-report/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "maxDuration",
    ()=>maxDuration,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/os [external] (os, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
;
;
;
;
;
const runtime = "nodejs";
const maxDuration = 60;
/**
 * Try to parse JSON, and do a light repair pass if the model
 * sneaks in trailing commas or smart quotes.
 */ function safeParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch  {
        const repaired = str.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/“|”/g, '"').replace(/‘|’/g, "'");
        return JSON.parse(repaired);
    }
}
/**
 * Run ffmpeg to pull a few JPEG frames from the uploaded video,
 * return them as data: URLs for OpenAI vision.
 */ async function extractFrames(videoPath, frameCount = 4) {
    const tmpDir = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].mkdtemp(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].tmpdir(), "vca-frames-"));
    const outputPattern = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(tmpDir, "frame-%02d.jpg");
    await new Promise((resolve, reject)=>{
        // 1 frame per second, first N frames
        const args = [
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            videoPath,
            "-vf",
            "fps=1",
            "-vframes",
            String(frameCount),
            outputPattern
        ];
        const child = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])("ffmpeg", args);
        child.on("error", (err)=>{
            console.error("ffmpeg spawn error:", err);
            reject(err);
        });
        child.on("close", (code)=>{
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited with code ${code}`));
        });
    });
    const files = (await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readdir(tmpDir)).filter((f)=>f.toLowerCase().endsWith(".jpg"));
    files.sort();
    const frames = [];
    for (const file of files){
        const full = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(tmpDir, file);
        const buf = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(full);
        frames.push(`data:image/jpeg;base64,${buf.toString("base64")}`);
    }
    // Clean up temp dir
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].rm(tmpDir, {
        recursive: true,
        force: true
    });
    return frames;
}
/**
 * System prompt: who VCA is + JSON contract for SwingReport.
 */ function buildSystemPrompt() {
    return [
        "You are VCA Virtual Coach, a tour-level golf coach AI.",
        "You blend Jim Hartnett’s 'Golf for the Other 80%' priority stack and simple language,",
        "Jim McLean’s P-system / corridors of success and fault-tree testing,",
        "Butch Harmon’s ball-flight laws and 'don’t wreck what works' philosophy,",
        "Dr. Kwon’s ground-force / sequencing concepts,",
        "and a light layer of Dave Tutelman’s golf-physics perspective.",
        "",
        "You coach for scoring, not pretty positions. You favour a short list of big priorities over a long list of random tips.",
        "Adjust tone and dosage for rec 20+, mid caps, single digits, plus players, and tour patterns.",
        "",
        "You are analysing golf swing video frames (face-on or down-the-line).",
        "Use the images to infer: dominant miss pattern, key positions, main leaks, and practical drills.",
        "",
        "You must output ONLY valid JSON matching this TypeScript interface:",
        "",
        `{
  "createdAt": "string",
  "overallScore": number,         // 0–100
  "powerScore": number,           // 0–100
  "efficiencyScore": number,      // 0–100
  "consistencyScore": number,     // 0–100
  "dominantMiss": "string",       // e.g. "push-slice", "pull-hook", "thin", etc.
  "summary": "string",            // 2–4 sentences in plain English
  "issues": [
    {
      "id": "string",
      "title": "string",
      "position":
        "setup" |
        "takeaway" |
        "backswing" |
        "top" |
        "transition" |
        "downswing" |
        "impact" |
        "finish",
      "severity": "low" | "medium" | "high",
      "description": "string",
      "drills": ["string"]
    }
  ],
  "practicePlanSummary": "string" // 3–6 sentences describing the 14-day focus
}`,
        "",
        "Rules:",
        "- Scores must be integers 0–100.",
        "- 3–5 issues total. At least one high severity, at least one medium.",
        "- Make every drill something a normal range golfer can actually do.",
        "- Use simple, direct language, not biomech jargon.",
        "- DO NOT include any commentary outside the JSON object."
    ].join(" ");
}
/**
 * Build the user content for OpenAI, using frames if we have them.
 */ function buildUserContent(frames) {
    const baseText = frames && frames.length > 0 ? [
        "You are analysing a real golfer’s swing using the attached video frames.",
        "Infer the dominant miss pattern, where the motion breaks down, and what is already working.",
        "Then produce the SwingReport JSON described in the system prompt.",
        "Assume a stock mid-iron or driver unless the frames clearly show otherwise."
    ].join(" ") : [
        "No frames were available. Pretend you are analysing a typical 15-handicap slicer with a push-slice driver miss.",
        "Create a realistic SwingReport JSON for that player based on your coaching knowledge."
    ].join(" ");
    const content = [
        {
            type: "text",
            text: baseText
        }
    ];
    if (frames && frames.length > 0) {
        for (const url of frames){
            content.push({
                type: "image_url",
                image_url: {
                    url
                }
            });
        }
    }
    return content;
}
async function POST(req) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "OPENAI_API_KEY is not set on the server."
            }, {
                status: 500
            });
        }
        const contentType = req.headers.get("content-type") || "";
        let frames = null;
        // If this is a real upload (multipart/form-data), extract frames via ffmpeg
        if (contentType.startsWith("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("video");
            if (file && typeof file === "object" && "arrayBuffer" in file) {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const tmpVideoPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].tmpdir(), `vca-swing-${Date.now()}.mp4`);
                await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(tmpVideoPath, buffer);
                try {
                    frames = await extractFrames(tmpVideoPath, 4);
                } catch (err) {
                    console.error("Failed to extract frames with ffmpeg:", err);
                } finally{
                    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].rm(tmpVideoPath, {
                        force: true
                    });
                }
            }
        } else {
            // Non-multipart (your "See sample report" button) → no frames, just sample
            frames = null;
        }
        const systemPrompt = buildSystemPrompt();
        const userContent = buildUserContent(frames);
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                // Use a multimodal-capable model
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
                        content: userContent
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
            console.error("Failed to parse AI JSON for swing report:", err, content);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "AI returned invalid JSON.",
                raw: content
            }, {
                status: 500
            });
        }
        // Normalize / guard a few fields
        parsed.createdAt = parsed.createdAt || new Date().toISOString();
        // Make sure scores are in 0–100 range
        parsed.overallScore = clampScore(parsed.overallScore);
        parsed.powerScore = clampScore(parsed.powerScore);
        parsed.efficiencyScore = clampScore(parsed.efficiencyScore);
        parsed.consistencyScore = clampScore(parsed.consistencyScore);
        // Basic sanity check on issues
        if (!Array.isArray(parsed.issues) || parsed.issues.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "AI returned a report with no issues.",
                raw: parsed
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(parsed, {
            status: 200
        });
    } catch (err) {
        console.error("Error in /api/swing-report:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error."
        }, {
            status: 500
        });
    }
}
function clampScore(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b8f59a08._.js.map