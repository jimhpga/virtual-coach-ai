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
"[project]/src/app/api/swing-report/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/app/api/swing-report/route.ts
__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
const runtime = "nodejs";
async function POST(req) {
    try {
        const contentType = req.headers.get("content-type") || "";
        let hasVideo = false;
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const video = formData.get("video");
            if (video && typeof video !== "string") {
                hasVideo = true;
            }
        }
        const now = new Date().toISOString();
        const report = {
            id: `swing-${Date.now()}`,
            createdAt: now,
            overallScore: hasVideo ? 76 : 72,
            powerScore: 80,
            efficiencyScore: 70,
            consistencyScore: 68,
            dominantMiss: "push_fade",
            summary: hasVideo ? "Swing shows solid athletic motion with enough speed, but face and path are slightly mismatched, giving you a gentle push–fade. We’ll clean up setup, takeaway depth, and delivery so you can tighten start lines and control curve without losing your natural motion." : "Sample report: this is what your swing breakdown will look like. In a real upload, we’ll tune the checkpoints to your miss pattern and priorities, not a generic template.",
            issues: [
                {
                    id: "addr_setup",
                    title: "Setup alignment & ball position",
                    severity: "medium",
                    position: "address",
                    description: "Feet and shoulders tend to aim a touch right of target while the face sits more neutral. Ball position drifts too far forward with irons, which pushes start lines right and makes it hard to control low point.",
                    drills: [
                        "Alignment stick routine: one stick on target line, one across toes for 10 balls per session.",
                        "Ball position checkpoint: mark mid-stance and one ball forward with a tee or club on the ground."
                    ]
                },
                {
                    id: "p2_takeaway",
                    title: "Clubhead too outside at P2",
                    severity: "high",
                    position: "takeaway",
                    description: "Early takeaway works the clubhead outside the hands with a quick roll of the face. That combination makes the shaft too steep early and encourages an out-to-in path coming down.",
                    drills: [
                        "Half-swing takeaway drill: pause at P2, keep clubhead just inside hands for 3×10 reps.",
                        "Wall or chair depth drill: rehearse takeaway so the handle works in while the clubhead stays in front."
                    ]
                },
                {
                    id: "p6_delivery",
                    title: "Steep delivery with late face control",
                    severity: "high",
                    position: "downswing",
                    description: "Club stays a bit too steep into P6 with the handle moving hard left early. Face hangs open and you run out of room, which sends the ball starting right with a soft fade and occasional wipe-slices.",
                    drills: [
                        "Pump drill from P5–P6: feel trail elbow in front of hip while shaft shallows slightly behind hands.",
                        "Lead-wrist lean drill: three-quarter swings focusing on modest forward shaft lean with a quieter handle exit."
                    ]
                },
                {
                    id: "impact_strike",
                    title: "Strike pattern too high on the face",
                    severity: "medium",
                    position: "impact",
                    description: "Contact tends to live slightly high on the clubface, costing you ball speed and flattening launch. Combined with the open face, it robs you of distance even when the ball finishes in play.",
                    drills: [
                        "Impact tape or dry-erase dot on the face for 10–15 balls, aiming to stack strikes around the center.",
                        "Tee-height ladder drill: alternate low/normal tee heights to train centered contact."
                    ]
                },
                {
                    id: "finish_balance",
                    title: "Finish balance under pressure",
                    severity: "low",
                    position: "finish",
                    description: "On routine swings your finish is solid, but under pressure you tend to stand up early and lose your posted left side. That’s more of a scoring consistency issue than a mechanics disaster.",
                    drills: [
                        "3-second hold drill: every shot in practice, freeze your finish until the ball lands.",
                        "Pressure ladder: hit 3-ball sets with small targets and hold your finish on every swing."
                    ]
                }
            ],
            practicePlanSummary: "Days 1–4: lock in alignment and ball position with a simple stick routine, then rehearse takeaway to P2 with slow, paused reps. Days 5–10: blend the new P2 and shallower P6 into three-quarter swings, using strike feedback on the face every session. Days 11–14: take it to the course with one setup key and one swing key only, focusing on start line and centered contact, not swing positions."
        };
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(report, {
            status: 200
        });
    } catch (err) {
        console.error("Error in /api/swing-report:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error while generating swing report."
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__9379af69._.js.map