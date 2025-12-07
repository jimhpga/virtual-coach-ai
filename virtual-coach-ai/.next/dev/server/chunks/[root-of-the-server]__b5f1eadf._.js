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
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

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
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[project]/src/app/api/swing-report/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/os [external] (os, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$util__$5b$external$5d$__$28$util$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/util [external] (util, cjs)");
;
;
;
;
;
;
const runtime = "nodejs";
const dynamic = "force-dynamic";
const execFileAsync = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$util__$5b$external$5d$__$28$util$2c$__cjs$29$__["promisify"])(__TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["execFile"]);
/**
 * If the client calls POST with no video (our "sample" button),
 * just return a hard-coded sample report so the UI always works.
 */ function buildSampleReport() {
    const now = new Date().toISOString();
    return {
        id: "sample-swing",
        createdAt: now,
        overallScore: 78,
        powerScore: 80,
        efficiencyScore: 77,
        consistencyScore: 76,
        dominantMiss: "push_fade",
        summary: "Sample swing: solid structure with a slight push-fade bias. Face is a touch open to path with a little early extension in the downswing. Contact is generally centered with good speed potential.",
        issues: [
            {
                id: "clubface_top",
                title: "Open clubface at the top",
                severity: "high",
                position: "top_of_backswing",
                description: "Lead wrist gets a bit extended and the face sits open relative to your lead forearm. That pushes the pattern toward a hold-off fade and makes start lines leak right.",
                drills: [
                    "Lead wrist wall drill: rehearse backswing with knuckles brushing an imaginary wall behind you.",
                    "Trail hand cover drill: feel your trail palm more on top of the handle at the top."
                ]
            },
            {
                id: "downswing_path",
                title: "Outside-in downswing path",
                severity: "medium",
                position: "downswing",
                description: "Arms and hands work out in front of your chest early in transition, steepening the shaft and sending the path across the ball.",
                drills: [
                    "Headcover-behind-ball drill: place a headcover just outside the ball and swing without clipping it.",
                    "Trail arm-under drill: feel your trail elbow stay closer to your side in transition."
                ]
            },
            {
                id: "early_extension",
                title: "Early extension under pressure",
                severity: "medium",
                position: "impact",
                description: "Hips push toward the ball as you approach impact, changing spine angle and making low-point and face control tougher.",
                drills: [
                    "Butt-on-wall drill: address a ball with your backside lightly touching a wall, then rehearse swings without losing contact.",
                    "Step-through rotations: hit half shots while stepping through with your trail foot to keep rotation going."
                ]
            }
        ],
        practicePlanSummary: "Days 1–4: Rebuild clubface control at the top with slow reps in front of a mirror. Days 5–10: Blend shallower transition reps with simple path drills and low-pressure range sessions. Days 11–14: Take the pattern to the course using one pre-shot key: clubface feel at the top and fully rotated finish."
    };
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
        // If this is a JSON POST with no file (our sample button), just return the sample.
        const contentType = req.headers.get("content-type") || "";
        const isJson = contentType.startsWith("application/json");
        if (isJson) {
            const sample = buildSampleReport();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(sample, {
                status: 200
            });
        }
        // Otherwise, expect multipart/form-data with a "video" file.
        const formData = await req.formData();
        const videoFile = formData.get("video");
        if (!videoFile) {
            // No file – behave like the sample path rather than blowing up.
            const sample = buildSampleReport();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(sample, {
                status: 200
            });
        }
        // ---- 1) Save uploaded video to a temp file ----
        const arrayBuffer = await videoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const tmpBase = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["tmpdir"])() + `/swing-${Date.now()}-${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["randomBytes"])(4).toString("hex")}`;
        const inputPath = `${tmpBase}.mp4`;
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(inputPath, buffer);
        // ---- 2) Extract a handful of frames with ffmpeg ----
        const framePattern = `${tmpBase}-%02d.jpg`;
        await execFileAsync("ffmpeg", [
            "-y",
            "-i",
            inputPath,
            "-vf",
            "fps=4",
            "-vframes",
            "4",
            framePattern
        ]);
        const frameDataUrls = [];
        for(let i = 1; i <= 4; i++){
            const framePath = `${tmpBase}-${String(i).padStart(2, "0")}.jpg`;
            try {
                const img = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(framePath);
                const b64 = img.toString("base64");
                frameDataUrls.push(`data:image/jpeg;base64,${b64}`);
            } catch  {
            // ignore missing frames
            }
        }
        // fire-and-forget cleanup
        (async ()=>{
            try {
                await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].unlink(inputPath).catch(()=>{});
                for(let i = 1; i <= 4; i++){
                    const framePath = `${tmpBase}-${String(i).padStart(2, "0")}.jpg`;
                    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].unlink(framePath).catch(()=>{});
                }
            } catch  {
            // best-effort cleanup only
            }
        })();
        if (frameDataUrls.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to extract frames from video."
            }, {
                status: 500
            });
        }
        // ---- 3) Call OpenAI vision (gpt-4o-mini) ----
        const systemPrompt = [
            "You are VCA Virtual Coach, a tour-level golf coach AI.",
            "You analyze golf swing images (P1–P9 style checkpoints) and return a concise but detailed SwingReport in JSON.",
            "Your coaching DNA: Hartnett 'Golf for the Other 80%', McLean P-system, Butch Harmon ball-flight laws,",
            "Dr. Kwon ground-force/sequencing, and light Dave Tutelman ball-flight/physics.",
            "",
            "JSON schema (SwingReport):",
            "{",
            '  "id": string,',
            '  "createdAt": string (ISO date),',
            '  "overallScore": number (0–100),',
            '  "powerScore": number (0–100),',
            '  "efficiencyScore": number (0–100),',
            '  "consistencyScore": number (0–100),',
            '  "dominantMiss": string (e.g., "slice", "push_fade", "hook", "pull", etc.),',
            '  "summary": string,',
            '  "issues": [',
            "    {",
            '      "id": string,',
            '      "title": string,',
            '      "severity": "low" | "medium" | "high",',
            '      "position": string,  // e.g. "setup", "top_of_backswing", "downswing", "impact", "finish"',
            '      "description": string,',
            '      "drills": string[]',
            "    }",
            "  ],",
            '  "practicePlanSummary": string',
            "}",
            "",
            "Constraints:",
            "- Use clear, simple, tour-tested language.",
            "- Focus on 2–4 key issues and specific drills, not 15 random tips.",
            "- Always respond with ONLY a JSON object matching SwingReport. No backticks, no extra text."
        ].join(" ");
        const userTextPrompt = "These are frames from a golfer's swing. Identify the main swing pattern, key issues, and high-impact drills. " + "Assume a reasonably skilled player unless the motion looks very beginner-ish. Return a SwingReport JSON object only.";
        const messages = [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: userTextPrompt
                    },
                    ...frameDataUrls.map((url)=>({
                            type: "image_url",
                            image_url: {
                                url
                            }
                        }))
                ]
            }
        ];
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                response_format: {
                    type: "json_object"
                },
                messages
            })
        });
        const rawText = await openaiRes.text();
        if (!openaiRes.ok) {
            console.error("OpenAI /chat/completions error:", openaiRes.status, rawText);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "OpenAI API error.",
                detail: rawText
            }, {
                status: 500
            });
        }
        let aiJson;
        try {
            aiJson = JSON.parse(rawText);
        } catch (err) {
            console.error("Failed to parse OpenAI outer JSON:", err, rawText);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to parse OpenAI response (outer JSON)."
            }, {
                status: 500
            });
        }
        const content = aiJson?.choices?.[0]?.message?.content;
        if (!content) {
            console.error("No content in OpenAI response:", aiJson);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "No content returned from OpenAI."
            }, {
                status: 500
            });
        }
        // When response_format: json_object is used, content is usually a JSON string.
        let report;
        try {
            report = typeof content === "string" ? JSON.parse(content) : content;
        } catch (err) {
            console.error("Failed to parse SwingReport JSON:", err, content);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "OpenAI returned invalid SwingReport JSON."
            }, {
                status: 500
            });
        }
        if (!report.id) report.id = `swing-${Date.now()}`;
        if (!report.createdAt) report.createdAt = new Date().toISOString();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(report, {
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

//# sourceMappingURL=%5Broot-of-the-server%5D__b5f1eadf._.js.map