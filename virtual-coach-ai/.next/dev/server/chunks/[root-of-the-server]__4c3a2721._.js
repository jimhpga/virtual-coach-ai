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
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

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
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/os [external] (os, cjs)");
;
;
;
;
;
const runtime = "nodejs";
function safeParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch  {
        const repaired = str.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/“|”/g, '"').replace(/‘|’/g, "'");
        return JSON.parse(repaired);
    }
}
function runFfmpeg(args) {
    return new Promise((resolve, reject)=>{
        const proc = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])("ffmpeg", args);
        let stderr = "";
        proc.stderr.on("data", (d)=>{
            stderr += d.toString();
        });
        proc.on("error", (err)=>{
            reject(err);
        });
        proc.on("close", (code)=>{
            if (code !== 0) {
                reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
            } else {
                resolve();
            }
        });
    });
}
async function extractFrames(videoPath, maxFrames = 4) {
    const outDir = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].mkdtemp(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join((0, __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["tmpdir"])(), "vca-frames-"));
    const pattern = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(outDir, "frame-%02d.png");
    // 1 frame per second, up to maxFrames frames.
    await runFfmpeg([
        "-y",
        "-i",
        videoPath,
        "-vf",
        "fps=1",
        "-vframes",
        String(maxFrames),
        pattern
    ]);
    const files = (await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readdir(outDir)).filter((f)=>f.endsWith(".png")).sort();
    const dataUrls = [];
    for (const file of files){
        const full = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(outDir, file);
        const buf = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(full);
        const b64 = buf.toString("base64");
        dataUrls.push(`data:image/png;base64,${b64}`);
    }
    return dataUrls;
}
// Simple fallback sample report if there is no video in the request
function buildSampleReport() {
    const now = new Date().toISOString();
    return {
        createdAt: now,
        overallScore: 75,
        powerScore: 78,
        efficiencyScore: 72,
        consistencyScore: 74,
        dominantMiss: "push_fade",
        summary: "Sample swing: solid overall motion with a slight push-fade bias. Face and path are slightly mismatched, and low point control can tighten up.",
        issues: [
            {
                id: "setup_alignment",
                title: "Alignment and ball position",
                severity: "medium",
                position: "P1_setup",
                description: "Shoulders and feet are aimed a bit right of target, encouraging a push-fade pattern and inconsistent start lines.",
                drills: [
                    "Stick drill: alignment stick on target line, second stick across toes.",
                    "3-ball gate drill to calibrate start line and curvature window."
                ]
            },
            {
                id: "downswing_sequence",
                title: "Downswing sequence",
                severity: "high",
                position: "P5_P6",
                description: "Upper body races the lower body from the top, making the shaft steep and forcing late face rotation.",
                drills: [
                    "Pump-from-the-top drill: 3 small rehearsals then one full swing.",
                    "Step-change-of-direction drill to feel pressure shifting left before the arms fire."
                ]
            }
        ],
        practicePlanSummary: "Days 1–4: neutralize setup and aim using stick work. Days 5–10: rehearse transition sequence with pump drills and step-change moves. Days 11–14: on-course practice with one alignment key and one transition key only."
    };
}
async function POST(req) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("[swing-report] Missing OPENAI_API_KEY");
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Server misconfigured: OPENAI_API_KEY is not set."
        }, {
            status: 500
        });
    }
    try {
        const contentType = req.headers.get("content-type") || "";
        // Two modes:
        // 1) Multipart form with "video" -> real analysis
        // 2) No body or non-multipart -> return sample report
        if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
            const sample = buildSampleReport();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(sample, {
                status: 200
            });
        }
        const formData = await req.formData();
        const file = formData.get("video");
        if (!file) {
            const sample = buildSampleReport();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(sample, {
                status: 200
            });
        }
        // Write uploaded video to a temp file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const tempVideoPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join((0, __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["tmpdir"])(), `vca-swing-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`);
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(tempVideoPath, buffer);
        // Grab a few frames using ffmpeg
        const frameDataUrls = await extractFrames(tempVideoPath, 4);
        if (frameDataUrls.length === 0) {
            throw new Error("ffmpeg did not produce any frames.");
        }
        // Build OpenAI vision request
        const imageParts = frameDataUrls.map((url)=>({
                type: "image_url",
                image_url: {
                    url
                }
            }));
        const systemPrompt = [
            "You are VCA Virtual Coach, a tour-level golf coach AI.",
            "You analyze golf swing images (P1–P9 checkpoints) using Jim Hartnett style priorities,",
            "Jim McLean’s P-system, Butch Harmon ball-flight logic, Dr. Kwon ground-force concepts,",
            "and a light Dave Tutelman physics influence.",
            "You coach for scoring, not pretty positions.",
            "Return ONLY JSON that matches the SwingReport TypeScript interface:",
            "{",
            '  "createdAt": "string ISO",',
            '  "overallScore": number,',
            '  "powerScore": number,',
            '  "efficiencyScore": number,',
            '  "consistencyScore": number,',
            '  "dominantMiss": "push" | "pull" | "slice" | "hook" | "push_slice" | "pull_hook" | string,',
            '  "summary": "string",',
            '  "issues": [',
            "    {",
            '      "id": "string",',
            '      "title": "string",',
            '      "severity": "low" | "medium" | "high",',
            '      "position": "P1_setup" | "P2_takeaway" | "P3_early_set" | "P4_top" | "P5_transition" | "P6_delivery" | "P7_impact" | "P8_early_release" | "P9_finish" | string,',
            '      "description": "string",',
            '      "drills": ["string"]',
            "    }",
            "  ],",
            '  "practicePlanSummary": "string"',
            "}",
            "Scores must be 0–100. Use clear, practical language."
        ].join(" ");
        const userText = "These frames are from a single golf swing. " + "Infer dominant miss pattern and key swing issues from setup through finish. " + "Focus on 2–4 main issues, each tied to a position (P1–P9) and include simple drills. " + "Return JSON only.";
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
                        content: [
                            {
                                type: "text",
                                text: userText
                            },
                            ...imageParts
                        ]
                    }
                ]
            })
        });
        if (!openaiRes.ok) {
            const detail = await openaiRes.text().catch(()=>"");
            console.error("[swing-report] OpenAI API error:", openaiRes.status, detail);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "OpenAI API error.",
                detail: detail || `Status ${openaiRes.status}`
            }, {
                status: 500
            });
        }
        const openaiJson = await openaiRes.json();
        const content = openaiJson?.choices?.[0]?.message?.content;
        if (!content) {
            console.error("[swing-report] No content in OpenAI response:", openaiJson);
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
            console.error("[swing-report] Failed to parse AI JSON:", err, content);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "AI returned invalid JSON.",
                raw: content
            }, {
                status: 500
            });
        }
        // Normalize a few fields
        if (!parsed.createdAt) parsed.createdAt = new Date().toISOString();
        if (typeof parsed.overallScore !== "number") parsed.overallScore = 70;
        if (typeof parsed.powerScore !== "number") parsed.powerScore = 70;
        if (typeof parsed.efficiencyScore !== "number") parsed.efficiencyScore = 70;
        if (typeof parsed.consistencyScore !== "number") parsed.consistencyScore = 70;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(parsed, {
            status: 200
        });
    } catch (err) {
        console.error("[swing-report] Internal error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || "Internal server error."
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4c3a2721._.js.map