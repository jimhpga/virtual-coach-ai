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
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fluent$2d$ffmpeg$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/fluent-ffmpeg/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ffmpeg$2d$static$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ffmpeg-static/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/os [external] (os, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
;
;
;
;
const runtime = "nodejs";
// Tell fluent-ffmpeg where ffmpeg lives
if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ffmpeg$2d$static$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]) {
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fluent$2d$ffmpeg$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].setFfmpegPath(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ffmpeg$2d$static$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]);
}
// Simple JSON repair just in case the AI returns commas/trailing stuff
function safeParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch  {
        const repaired = str.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/“|”/g, '"').replace(/‘|’/g, "'");
        return JSON.parse(repaired);
    }
}
// Extract a few JPEG frames from a temp video file and return base64 strings
async function extractFrames(videoPath) {
    return new Promise((resolve, reject)=>{
        const tmpDir = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdtempSync(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].tmpdir(), "swing-frames-"));
        const timestamps = [
            "10%",
            "50%",
            "90%"
        ]; // early / mid / late
        const framePaths = [];
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fluent$2d$ffmpeg$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(videoPath).on("end", ()=>{
            try {
                const framesBase64 = framePaths.map((fp)=>{
                    const buf = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(fp);
                    const b64 = buf.toString("base64");
                    __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].unlinkSync(fp);
                    return `data:image/jpeg;base64,${b64}`;
                });
                __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].rmSync(tmpDir, {
                    recursive: true,
                    force: true
                });
                resolve(framesBase64);
            } catch (err) {
                reject(err);
            }
        }).on("error", (err)=>{
            reject(err);
        }).screenshots({
            timestamps,
            filename: "frame-%i.jpg",
            folder: tmpDir,
            size: "720x? "
        });
        // We don't get file names until ffmpeg runs, so we glob by pattern
        // after it finishes in the 'end' handler above.
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readdir(tmpDir, (err, files)=>{
            if (!err && files) {
                files.filter((f)=>f.startsWith("frame-") && f.endsWith(".jpg")).forEach((f)=>framePaths.push(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(tmpDir, f)));
            }
        });
    });
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
        // Try to read FormData (video upload). If none is present,
        // fall back to a static sample report so the button still works.
        let file = null;
        try {
            const formData = await req.formData();
            const maybeFile = formData.get("video");
            if (maybeFile instanceof File) {
                file = maybeFile;
            }
        } catch  {
        // not multipart / no file – we'll handle below
        }
        // No video provided: return a sample report (so "See sample report" still works)
        if (!file) {
            const sample = {
                createdAt: new Date().toISOString(),
                overallScore: 78,
                powerScore: 80,
                efficiencyScore: 76,
                consistencyScore: 75,
                dominantMiss: "push_fade",
                summary: "Sample report: solid motion with slight push-fade pattern. Good athletic pivot with a few cleanup items around setup, takeaway, and delivery.",
                issues: [
                    {
                        id: "setup_alignment",
                        title: "Setup alignment a touch open",
                        position: "setup",
                        severity: "medium",
                        description: "Feet and shoulders sit a hair open to the target, which tends to send your baseline start line right of where you think you’re aimed.",
                        drills: [
                            "Alignment stick routine: one stick on target line, one across toes for 10 balls per session.",
                            "Ball position checkpoint: mark mid-iron and driver ball positions on the mat."
                        ]
                    },
                    {
                        id: "club_steep_down",
                        title: "Slightly steep delivery with face open",
                        position: "downswing",
                        severity: "high",
                        description: "Club drifts a bit steep into the ball with the face slightly open, which produces the push-fade when tempo gets quick.",
                        drills: [
                            "Lead wrist flex drill: three-quarter swings focusing on flatter lead wrist at shaft-parallel in the downswing.",
                            "Pump drill from P5–P6 feeling more depth and side-bend before releasing the club."
                        ]
                    }
                ],
                practicePlanSummary: "Days 1–4: rebuild alignment and ball position. Days 5–10: mix takeaway shallowing and lead-wrist drills in slow reps. Days 11–14: take it to the course with one clear key – setup, then shallower delivery."
            };
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(sample, {
                status: 200
            });
        }
        // We have a real video file – save it temporarily
        const bytes = Buffer.from(await file.arrayBuffer());
        const tmpVideoPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].tmpdir(), `swing-upload-${Date.now()}.mp4`);
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(tmpVideoPath, bytes);
        // Extract 2–3 frames as base64 images
        const frameDataUrls = await extractFrames(tmpVideoPath).catch((err)=>{
            console.error("Frame extraction failed:", err);
            return [];
        });
        // Clean up video file
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].unlinkSync(tmpVideoPath);
        } catch  {
        // ignore
        }
        // Build an OpenAI vision prompt using the extracted frames
        const systemPrompt = [
            "You are VCA Virtual Coach, a tour-level golf coach AI.",
            "Your coaching DNA blends Jim Hartnett’s 'Golf for the Other 80%' priority stack and simple scoring language,",
            "Jim McLean’s P-system / Eight Step Swing / corridors of success and fault-tree testing,",
            "Butch Harmon’s ball-flight laws and 'don’t wreck what works' philosophy,",
            "Dr. Kwon’s ground-force and sequencing concepts,",
            "and a light layer of Dave Tutelman’s golf-physics perspective.",
            "You coach for scoring, not pretty positions. Fewer, bigger priorities.",
            "From a few swing frames, infer the player’s dominant miss, key motion patterns, and produce a concise SwingReport JSON."
        ].join(" ");
        const userText = "You are looking at a single golf swing. Analyze setup, backswing, top, downswing, impact, and finish. " + "Infer the most likely miss pattern (slice, hook, push, pull, etc.) and the biggest 2–4 motion issues that affect ball flight and contact. " + "Give very practical drills. Return ONLY valid JSON matching the SwingReport type I describe.";
        // Build the vision message: text + images (frames)
        const content = [
            {
                type: "text",
                text: userText
            }
        ];
        for (const url of frameDataUrls){
            content.push({
                type: "image_url",
                image_url: {
                    url,
                    detail: "low"
                }
            });
        }
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4.1",
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
                        content
                    },
                    {
                        role: "user",
                        content: "The JSON shape you must return is: " + JSON.stringify({
                            createdAt: "string",
                            overallScore: 0,
                            powerScore: 0,
                            efficiencyScore: 0,
                            consistencyScore: 0,
                            dominantMiss: "string",
                            summary: "string",
                            issues: [
                                {
                                    id: "string",
                                    title: "string",
                                    position: "setup | takeaway | backswing | top | downswing | impact | release | finish",
                                    severity: "low | medium | high",
                                    description: "string",
                                    drills: [
                                        "string"
                                    ]
                                }
                            ],
                            practicePlanSummary: "string"
                        }, null, 0)
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
        const contentStr = openaiJson?.choices?.[0]?.message?.content;
        if (!contentStr) {
            console.error("No content in OpenAI response:", openaiJson);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "No content returned from AI."
            }, {
                status: 500
            });
        }
        let parsed;
        try {
            parsed = safeParseJSON(contentStr);
        } catch (err) {
            console.error("Failed to parse AI JSON:", err, contentStr);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "AI returned invalid JSON.",
                raw: contentStr
            }, {
                status: 500
            });
        }
        // Normalize createdAt if missing
        if (!parsed.createdAt) {
            parsed.createdAt = new Date().toISOString();
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
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0840c579._.js.map